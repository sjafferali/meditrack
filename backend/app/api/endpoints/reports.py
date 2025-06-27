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
    # PDF Layout Configuration - All layout settings in one place
    # To adjust the PDF layout, simply modify these values
    layout_config = {
        # ===== Page Margins =====
        # Controls the white space around the edges of the page
        # Increase values for more white space, decrease for tighter margins
        "left_margin": 0.75 * inch,  # White space on the left side of the page
        "right_margin": 0.75 * inch,  # White space on the right side of the page
        "top_margin": 0.75 * inch,  # White space at the top of the page
        "bottom_margin": 0.75 * inch,  # White space at the bottom of the page
        # ===== Header Settings =====
        # Controls the title and date field positioning on the first page
        "title_font_size": 16,  # Main title text size
        "title_offset_from_top": 0.3
        * inch,  # How far down from the top margin the title appears
        "date_field_offset": 2.5
        * inch,  # Distance from right edge where "Date:" label appears
        "date_line_offset": 2
        * inch,  # Distance from right edge where the date line starts
        "date_line_drop": 0.35
        * inch,  # How far below the top margin the date line appears
        # ===== Page Numbering =====
        # Controls the "Page X" text that appears on every page
        "page_num_font_size": 9,  # Size of the page number text
        "page_num_bottom_offset": 0.25
        * inch,  # Distance from bottom edge where page number appears
        "page_num_right_offset": 1
        * inch,  # Distance from right edge where page number appears
        # ===== Content Spacing =====
        # Controls vertical spacing between elements in the document
        "top_spacer": 0.3
        * inch,  # Space at the top of content (below header) on first page
        "medication_spacing": 0.1
        * inch,  # Vertical space between different medications
        # ===== Time Slots Table =====
        # Controls the layout of the medication tracking boxes
        "slots_per_row": 3,  # Number of time slot boxes per row (e.g., "1: ___ AM/PM")
        "slot_row_height": 0.4 * inch,  # Height of each row of time slots
        "slot_font_size": 10,  # Font size for the slot text (e.g., "1: ___ AM/PM")
        "slot_top_padding": 15,  # Padding above text inside each slot (in points)
        "slot_bottom_padding": 15,  # Padding below text inside each slot (in points)
        # ===== Footer Settings =====
        # Controls the instructions and timestamp at the bottom of the last page
        "footer_font_size": 9,  # Font size for the footer text
        "footer_space_before": 0.5
        * inch,  # Space between the last medication and the footer
    }

    # Configure document with margins from config
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=layout_config["left_margin"],
        rightMargin=layout_config["right_margin"],
        topMargin=layout_config["top_margin"],
        bottomMargin=layout_config["bottom_margin"],
    )

    # Create document content
    styles = getSampleStyleSheet()

    title = f"{person_name} Medication Log" if person_name else "Medication Log"

    # Define function to create first page header with title and date
    def first_page_header(canvas, doc):
        canvas.saveState()
        # Draw the title on first page
        canvas.setFont("Helvetica-Bold", layout_config["title_font_size"])
        canvas.drawString(
            doc.leftMargin,
            doc.height + doc.topMargin - layout_config["title_offset_from_top"],
            title,
        )

        # Add date field
        canvas.setFont("Helvetica", 12)
        date_text = "Date: "
        canvas.drawString(
            doc.width - layout_config["date_field_offset"],
            doc.height + doc.topMargin - layout_config["title_offset_from_top"],
            date_text,
        )

        # Add line for date
        canvas.line(
            doc.width - layout_config["date_line_offset"],
            doc.height + doc.topMargin - layout_config["date_line_drop"],
            doc.width - doc.rightMargin,
            doc.height + doc.topMargin - layout_config["date_line_drop"],
        )

        # Add page number
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.setFont("Helvetica", layout_config["page_num_font_size"])
        canvas.drawRightString(
            doc.width + doc.rightMargin - layout_config["page_num_right_offset"],
            doc.bottomMargin - layout_config["page_num_bottom_offset"],
            text,
        )

        canvas.restoreState()

    # Define function for later pages with only page numbers
    def later_pages_header(canvas, doc):
        canvas.saveState()

        # Add only page number
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.setFont("Helvetica", layout_config["page_num_font_size"])
        canvas.drawRightString(
            doc.width + doc.rightMargin - layout_config["page_num_right_offset"],
            doc.bottomMargin - layout_config["page_num_bottom_offset"],
            text,
        )

        canvas.restoreState()

    content = []

    # Add spacer at top to account for header in first page
    content.append(Spacer(1, layout_config["top_spacer"]))

    # Process each medication
    for medication in medications:
        # Medication name and dosage
        content.append(
            Paragraph(f"{medication.name} {medication.dosage}", styles["Heading2"])
        )

        # Add usage instructions
        instructions = (
            medication.instructions
            if medication.instructions
            else "No specific instructions provided"
        )
        content.append(Paragraph(instructions, styles["Italic"]))

        # Create time slots table
        max_doses = medication.max_doses_per_day
        time_slots = []
        row = []
        slots_per_row = layout_config["slots_per_row"]

        for slot in range(1, max_doses + 1):
            slot_cell = f"{slot}: _______________ (AM/PM)"
            row.append(slot_cell)

            if len(row) == slots_per_row or slot == max_doses:
                while len(row) < slots_per_row:
                    row.append("")
                time_slots.append(row)
                row = []

        if time_slots:
            col_width = (
                letter[0] - layout_config["left_margin"] - layout_config["right_margin"]
            ) / slots_per_row
            time_table = Table(
                time_slots,
                colWidths=[col_width] * slots_per_row,
                rowHeights=layout_config["slot_row_height"],
            )

            time_table.setStyle(
                TableStyle(
                    [
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        (
                            "FONT",
                            (0, 0),
                            (-1, -1),
                            "Helvetica",
                            layout_config["slot_font_size"],
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            layout_config["slot_bottom_padding"],
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            layout_config["slot_top_padding"],
                        ),
                    ]
                )
            )

            content.append(time_table)
            content.append(Spacer(1, layout_config["medication_spacing"]))

    # Add footer
    timestamp = datetime.now(current_tz).strftime("%Y-%m-%d %H:%M:%S")
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=layout_config["footer_font_size"],
        alignment=1,  # Center
        spaceBefore=layout_config["footer_space_before"],
    )
    footer_text = (
        "Instructions: Record the time when each dose is taken in the blank spaces "
        f"provided. Generated: {timestamp}"
    )
    content.append(Paragraph(footer_text, footer_style))

    # Build the PDF with different functions for first and later pages
    doc.build(content, onFirstPage=first_page_header, onLaterPages=later_pages_header)
