from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import settings
from app.models import Medication, Person

router = APIRouter(
    tags=["reports"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/medications/pdf/{date}",
    response_class=StreamingResponse,
    summary="Generate medication tracking PDF",
    description="Generate a printable medication tracking form for a specific date",
    response_description="PDF file for printing",
    responses={
        200: {"description": "PDF generated successfully"},
        404: {"description": "Data not found for the specified date"},
    },
)
def generate_medication_pdf(
    date: date = Path(
        ..., description="The date to generate the tracking form for (YYYY-MM-DD)"
    ),
    timezone_offset: Optional[int] = Query(
        None, description="Timezone offset in minutes"
    ),
    person_id: Optional[int] = Query(
        None, description="Person ID to filter medications"
    ),
    days: Optional[int] = Query(
        1, ge=1, le=7, description="Number of days to include in the form"
    ),
    db: Session = Depends(get_db),
):
    """
    Generate a printable medication tracking form in PDF format.

    This endpoint will:
    - Get medication data for the specified date
    - Generate a PDF document with a tracking form
    - Return the PDF as a streaming response for download

    The form includes:
    - Date(s) covered by the form
    - Medication names and dosage information
    - Grid for tracking doses over multiple days
    - Space for marking when doses are taken

    Optional parameters:
    - timezone_offset: Adjust for user's local timezone
    - person_id: Filter medications for a specific person
    - days: Number of days to include in the form (1-7 days)
    """
    # Handle timezone for the date range
    if timezone_offset is not None:
        # Convert timezone offset from minutes to timedelta
        tz_offset = timedelta(minutes=-timezone_offset)
        current_tz = timezone(tz_offset)
    elif settings.TIMEZONE_OFFSET != 0:
        # Use environment variable timezone if set
        tz_offset = timedelta(minutes=-settings.TIMEZONE_OFFSET)
        current_tz = timezone(tz_offset)
    else:
        # Default to UTC if no timezone information provided
        current_tz = timezone.utc

    # Get medications with optional person filter
    query = db.query(Medication)
    if person_id:
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        query = query.filter(Medication.person_id == person_id)

    medications = query.all()

    if not medications:
        raise HTTPException(status_code=404, detail="No medications found")

    # Get person name if person_id is provided
    person_name = None
    if person_id:
        person = db.query(Person).filter(Person.id == person_id).first()
        if person:
            person_name = person.name

    # Create dates list for multiple days
    dates = []
    days_count = days if days is not None else 1
    for day_offset in range(days_count):
        dates.append(date + timedelta(days=day_offset))

    # Create in-memory PDF
    buffer = BytesIO()
    create_medication_tracking_pdf(
        buffer, medications, dates, person_name, current_tz, db
    )
    buffer.seek(0)

    # Generate filename with date
    filename = f"medication_tracking_{date.isoformat()}.pdf"

    # Return the PDF as a streaming response
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def create_medication_tracking_pdf(
    buffer, medications, dates, person_name, current_tz, db
):
    """
    Create a medication tracking PDF document with a grid for recording doses.

    Args:
        buffer: BytesIO object to write the PDF to
        medications: List of medication objects
        dates: List of dates to include in the form
        person_name: Name of the person (optional)
        current_tz: Timezone for date calculations
        db: Database session
    """
    # Calculate page dimensions - using portrait orientation
    page_width, page_height = letter

    # Create PDF canvas
    pdf = canvas.Canvas(buffer, pagesize=letter)

    # Set title and metadata
    title = f"{person_name} Medication Log" if person_name else "Medication Log"
    pdf.setTitle(title)
    pdf.setAuthor("MediTrack")
    pdf.setSubject("Medication Tracking")

    # Set margins - further optimized for better space utilization
    margin_lr = 0.5 * inch  # Left/right margins
    margin_top = 0.6 * inch  # Reduced top margin to use more vertical space
    content_width = page_width - 2 * margin_lr

    # Track current page number
    current_page = 0
    medications_processed = 0

    # Start a new page
    def start_new_page():
        nonlocal y_position, current_page
        if current_page > 0:  # For any page after initialization
            pdf.showPage()
        current_page += 1

        # Add header
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(margin_lr, page_height - margin_top, title)

        # Add date field
        pdf.setFont("Helvetica", 12)
        date_text = "Date: "
        date_text_width = pdf.stringWidth(date_text, "Helvetica", 12)
        pdf.drawString(page_width - 3 * inch, page_height - margin_top, date_text)

        # Add a blank line for the date
        pdf.setLineWidth(0.5)
        pdf.line(
            page_width - 3 * inch + date_text_width,
            page_height - margin_top - 2,
            page_width - margin_lr,
            page_height - margin_top - 2,
        )

        # Start position just below the header with less spacing
        # This better utilizes the full page height
        y_position = page_height - margin_top - 0.3 * inch

    # Initialize position - first page (page 0)
    # Set current_page to 0 before calling start_new_page to ensure
    # we don't get duplication on the first page
    current_page = 0
    start_new_page()  # This will increment current_page to 1

    # Create each medication section
    for medication in medications:
        medications_processed += 1

        # Check if we need a new page
        # Base height for medication entry (title, instructions)
        required_height = 0.7 * inch  # Further reduced to fit more on page
        # Height for time slots - calculated more precisely to avoid wasted space
        slots_per_line = min(4, int(content_width / (1.9 * inch)))
        lines_needed = (
            medication.max_doses_per_day + slots_per_line - 1
        ) // slots_per_line
        required_height += (
            lines_needed * 0.25 * inch
        )  # Exact height based on lines needed

        # Get the instructions and calculate how many lines they'll require
        instructions = get_medication_instructions(medication.name)
        max_text_width = content_width - 0.5 * inch  # Allow for slightly longer lines

        # Calculate instruction height
        instruction_height = 0.3 * inch  # Default for short instructions
        if pdf.stringWidth(instructions, "Helvetica-Oblique", 10) > max_text_width:
            # Split instructions into lines
            words = instructions.split()
            lines = []
            current_line = []

            for word in words:
                test_line = " ".join(current_line + [word])
                if (
                    pdf.stringWidth(test_line, "Helvetica-Oblique", 10)
                    <= max_text_width
                ):
                    current_line.append(word)
                else:
                    lines.append(" ".join(current_line))
                    current_line = [word]

            if current_line:
                lines.append(" ".join(current_line))

            # Calculate height needed for all instruction lines
            instruction_height = len(lines) * 0.2 * inch

        # Add instruction height to required height
        required_height += instruction_height

        # Check if there's enough space on the current page
        # Use minimal reserved space at the bottom to maximize page usage
        # Allow content to fill almost the entire page, leaving minimal space for footer
        min_required_margin = 0.2 * inch  # Further reduced minimum footer space
        if y_position - required_height < min_required_margin:
            start_new_page()

        # Medication name and dosage
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(margin_lr, y_position, f"{medication.name} {medication.dosage}")

        # Move down (reduced spacing)
        y_position -= 0.25 * inch

        # Add usage instructions in italics
        pdf.setFont("Helvetica-Oblique", 10)

        # Handle long instructions by wrapping text
        if pdf.stringWidth(instructions, "Helvetica-Oblique", 10) > max_text_width:
            words = instructions.split()
            lines = []
            current_line = []

            for word in words:
                test_line = " ".join(current_line + [word])
                if (
                    pdf.stringWidth(test_line, "Helvetica-Oblique", 10)
                    <= max_text_width
                ):
                    current_line.append(word)
                else:
                    lines.append(" ".join(current_line))
                    current_line = [word]

            if current_line:
                lines.append(" ".join(current_line))

            for line in lines:
                pdf.drawString(margin_lr, y_position, line)
                y_position -= (
                    0.15 * inch
                )  # Further reduced spacing between instruction lines
        else:
            pdf.drawString(margin_lr, y_position, instructions)
            y_position -= 0.2 * inch  # Further reduced spacing after instructions

        # Create time slots
        max_doses = medication.max_doses_per_day

        # Calculate time slots with efficient spacing to use full page width
        slot_width = 1.8 * inch  # Slightly reduced width to fit more slots per line
        slots_per_line = max(1, int(content_width / slot_width))
        # Use at least 4 slots per line when possible for letter-size paper
        slots_per_line = min(
            4, max(slots_per_line, 4 if content_width > 7.2 * inch else 3)
        )

        # Draw the time slots
        pdf.setFont("Helvetica", 10)
        slot_count = 1

        while slot_count <= max_doses:
            slot_x = margin_lr

            # Add slots for this line
            for i in range(slots_per_line):
                if slot_count > max_doses:
                    break

                # Time label - moved slightly to the left
                pdf.drawString(slot_x, y_position, f"{slot_count}:")

                # Blank line for time - start further to the right to avoid overlap
                line_length = 0.95 * inch  # Slightly shorter line
                # Add a millimeter of space above each blank line
                pdf.line(
                    slot_x + 0.25 * inch,  # Increased indent
                    y_position - 4,  # Add space above the line (1mm ≈ 2.8 points)
                    slot_x + 0.25 * inch + line_length,
                    y_position - 4,
                )

                # AM/PM indicator - significantly increased spacing to prevent overlap
                pdf.drawString(
                    slot_x
                    + 0.40 * inch
                    + line_length,  # More spacing to prevent overlap
                    y_position,
                    "(AM/PM)",
                )

                # Move to next slot position horizontally
                slot_x += slot_width
                slot_count += 1

            # Move to next line
            y_position -= 0.3 * inch  # Further reduced spacing between dose lines

        # Add smaller space between medications
        y_position -= 0.1 * inch  # Further reduced spacing between medications

    # Move footer closer to bottom for better space utilization
    footer_margin = (
        0.1 * inch
    )  # Further reduced margin for footer to use more page space

    # Add instructions at the bottom of the last page
    pdf.setFont("Helvetica", 9)
    instructions = (
        "Instructions: Record the time when each dose is taken "
        "in the blank spaces provided."
    )
    pdf.drawString(margin_lr, footer_margin + 0.15 * inch, instructions)

    # Add generation timestamp
    timestamp = datetime.now(current_tz).strftime("%Y-%m-%d %H:%M:%S")
    pdf.drawRightString(
        page_width - margin_lr, footer_margin + 0.15 * inch, f"Generated: {timestamp}"
    )

    # Add page info
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(
        page_width / 2, footer_margin, f"Page {current_page} of {current_page}"
    )

    # Finalize PDF
    pdf.save()


def get_medication_instructions(medication_name):
    """
    Get instructions for a medication based on name.
    This is a helper function that provides sample instructions.
    In a real implementation, these would come from the database.

    Args:
        medication_name: Name of the medication

    Returns:
        String with usage instructions
    """
    # Map of sample instructions based on common medication names
    # This would typically come from the database in a real implementation
    instructions_map = {
        "Pred Acetate": "Apply 1 drop to right eye only. Steroid for inflammation. "
        "Stop if pain or squinting. (Pink cap)",
        "Ofloxacin": "Antibiotic to prevent infection. (Beige cap)",
        "Dorzolamide": "Reduces eye pressure. (Orange cap)",
        "Gabapentin": "Give 1 tablet every 8-24 hours for pain and sedation. "
        "(Pill bottle)",
        "I-Drop": "Apply a small dot to the left eye 3x daily for lubrication. "
        "Apply before bedtime. (White bottle)",
        "Tacrolimus": "Tear stimulant for dry eye. Long-term use. "
        "(Bottle in pill bottle)",
        "Diclofenac": "NSAID for pain/inflammation. Stop if squinting. (Grey cap)",
        "Clavacillin": "Antibiotic. Give with food. (Single use packets)",
        "Prednisone": "Steroid for inflammation. Give with food. "
        "May cause upset stomach or bloody stools. (Pill bottle)",
        "Artificial Tears": "Lubricates eyes. Use 1-2 times daily. (OTC)",
        "Trazodone": "Give 1/2 tab twice a day with food to relieve anxiety. (Tablet)",
    }

    # Return instructions if found, otherwise a generic message
    for key, value in instructions_map.items():
        if key.lower() in medication_name.lower():
            return value

    return "Follow prescription instructions as directed."
