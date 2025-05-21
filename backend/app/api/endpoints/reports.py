from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
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
    # Configure document with exact 0.75 inch margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    # Create document content
    styles = getSampleStyleSheet()

    title = f"{person_name} Medication Log" if person_name else "Medication Log"

    # Define function to create page header on each page
    def header_footer(canvas, doc):
        canvas.saveState()
        # Draw the title on each page
        canvas.setFont("Helvetica-Bold", 16)
        canvas.drawString(
            doc.leftMargin, doc.height + doc.topMargin - 0.3 * inch, title
        )

        # Add date field
        canvas.setFont("Helvetica", 12)
        date_text = "Date: "
        canvas.drawString(
            doc.width - 2.5 * inch, doc.height + doc.topMargin - 0.3 * inch, date_text
        )

        # Add line for date
        canvas.line(
            doc.width - 2 * inch,
            doc.height + doc.topMargin - 0.35 * inch,
            doc.width - doc.rightMargin,
            doc.height + doc.topMargin - 0.35 * inch,
        )

        # Add page number
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.setFont("Helvetica", 9)
        canvas.drawRightString(
            doc.width + doc.rightMargin - 1 * inch, doc.bottomMargin - 0.25 * inch, text
        )

        canvas.restoreState()

    content = []

    # Add spacer at top to account for header in first page
    content.append(Spacer(1, 0.3 * inch))

    # Process each medication
    for medication in medications:
        # Medication name and dosage
        content.append(
            Paragraph(f"{medication.name} {medication.dosage}", styles["Heading2"])
        )

        # Add usage instructions
        instructions = get_medication_instructions(medication.name)
        content.append(Paragraph(instructions, styles["Italic"]))

        # Create time slots table
        max_doses = medication.max_doses_per_day
        time_slots = []
        row = []
        slots_per_row = 3

        for slot in range(1, max_doses + 1):
            slot_cell = f"{slot}: _______________ (AM/PM)"
            row.append(slot_cell)

            if len(row) == slots_per_row or slot == max_doses:
                while len(row) < slots_per_row:
                    row.append("")
                time_slots.append(row)
                row = []

        if time_slots:
            col_width = (letter[0] - 1.5 * inch) / slots_per_row
            time_table = Table(
                time_slots,
                colWidths=[col_width] * slots_per_row,
                rowHeights=0.4 * inch,
            )

            time_table.setStyle(
                TableStyle(
                    [
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
                        ("TOPPADDING", (0, 0), (-1, -1), 15),
                    ]
                )
            )

            content.append(time_table)
            content.append(Spacer(1, 0.1 * inch))

    # Add footer
    timestamp = datetime.now(current_tz).strftime("%Y-%m-%d %H:%M:%S")
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=9,
        alignment=1,  # Center
        spaceBefore=0.5 * inch,
    )
    footer_text = (
        "Instructions: Record the time when each dose is taken in the blank spaces "
        f"provided. Generated: {timestamp}"
    )
    content.append(Paragraph(footer_text, footer_style))

    # Build the PDF with the header/footer function
    doc.build(content, onFirstPage=header_footer, onLaterPages=header_footer)


def get_medication_instructions(medication_name):
    # Map of sample instructions based on common medication names
    instructions_map = {
        "Pred Acetate": (
            "Apply 1 drop to right eye only. Steroid for inflammation. "
            "Stop if pain or squinting. (Pink cap)"
        ),
        "Ofloxacin": "Antibiotic to prevent infection. (Beige cap)",
        "Dorzolamide": "Reduces eye pressure. (Orange cap)",
        "Gabapentin": (
            "Give 1 tablet every 8-24 hours for pain and sedation. " "(Pill bottle)"
        ),
        "I-Drop": (
            "Apply a small dot to the left eye 3x daily for lubrication. "
            "Apply before bedtime. (White bottle)"
        ),
        "Tacrolimus": (
            "Tear stimulant for dry eye. Long-term use. " "(Bottle in pill bottle)"
        ),
        "Diclofenac": "NSAID for pain/inflammation. Stop if squinting. (Grey cap)",
        "Clavacillin": "Antibiotic. Give with food. (Single use packets)",
        "Prednisone": (
            "Steroid for inflammation. Give with food. "
            "May cause upset stomach or bloody stools. (Pill bottle)"
        ),
        "Artificial Tears": "Lubricates eyes. Use 1-2 times daily. (OTC)",
        "Trazodone": (
            "Give 1/2 tab twice a day with food to relieve anxiety. " "(Tablet)"
        ),
    }

    # Return instructions if found, otherwise a generic message
    for key, value in instructions_map.items():
        if key.lower() in medication_name.lower():
            return value
    return "Follow prescription instructions as directed."
