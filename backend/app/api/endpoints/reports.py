from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from io import BytesIO

from fastapi import APIRouter, Depends, Path, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.config import settings
from app.models import Dose, Medication, Person

# Import ReportLab components
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle

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
    date: date = Path(..., description="The date to generate the tracking form for (YYYY-MM-DD)"),
    timezone_offset: Optional[int] = Query(None, description="Timezone offset in minutes"),
    person_id: Optional[int] = Query(None, description="Person ID to filter medications"),
    days: Optional[int] = Query(1, ge=1, le=7, description="Number of days to include in the form"),
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
    for day_offset in range(days):
        dates.append(date + timedelta(days=day_offset))
    
    # Create in-memory PDF
    buffer = BytesIO()
    create_medication_tracking_pdf(buffer, medications, dates, person_name, current_tz, db)
    buffer.seek(0)
    
    # Generate filename with date
    filename = f"medication_tracking_{date.isoformat()}.pdf"
    
    # Return the PDF as a streaming response
    return StreamingResponse(
        buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def create_medication_tracking_pdf(buffer, medications, dates, person_name, current_tz, db):
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
    # Calculate page dimensions
    page_width, page_height = landscape(letter)
    
    # Create PDF canvas
    pdf = canvas.Canvas(buffer, pagesize=landscape(letter))
    
    # Set title and metadata
    title = "Medication Tracking Form"
    pdf.setTitle(title)
    pdf.setAuthor("MediTrack")
    pdf.setSubject("Medication Tracking")
    
    # Add header
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(page_width/2, page_height - 0.5*inch, title)
    
    # Add date range and person info
    pdf.setFont("Helvetica", 12)
    date_range_text = f"Date: {dates[0].strftime('%B %d, %Y')}"
    if len(dates) > 1:
        date_range_text = f"Dates: {dates[0].strftime('%B %d, %Y')} to {dates[-1].strftime('%B %d, %Y')}"
    
    pdf.drawString(0.5*inch, page_height - 0.8*inch, date_range_text)
    
    if person_name:
        pdf.drawString(0.5*inch, page_height - 1.1*inch, f"Person: {person_name}")
        y_offset = 1.4
    else:
        y_offset = 1.1
    
    # Create data for the medication grid
    data = []
    
    # Add header row with date columns
    header_row = ["Medication", "Dosage", "Max/Day"]
    for date_obj in dates:
        header_row.append(date_obj.strftime("%m/%d"))
    header_row.append("Notes")
    data.append(header_row)
    
    # Add medication rows
    for medication in medications:
        row = [
            medication.name,
            medication.dosage,
            str(medication.max_doses_per_day)
        ]
        
        # Add empty cells for each date
        for _ in dates:
            row.append("")
        
        # Add an empty notes cell
        row.append("")
        
        data.append(row)
    
    # Create the table
    col_widths = [2*inch, 1.5*inch, 0.7*inch] + [0.7*inch] * len(dates) + [1.5*inch]
    table = Table(data, colWidths=col_widths)
    
    # Style the table
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('ALIGN', (0, 1), (2, -1), 'LEFT'),
        ('ALIGN', (3, 1), (-2, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWHEIGHT', (0, 1), (-1, -1), 0.4*inch),
    ])
    
    # Add lighter lines in date cells for checkmarks
    for row_idx in range(1, len(data)):
        for col_idx in range(3, 3 + len(dates)):
            style.add('LINEBEFORE', (col_idx, row_idx), (col_idx, row_idx), 0.25, colors.grey)
    
    table.setStyle(style)
    
    # Draw the table
    table_width = sum(col_widths)
    table_height = len(data) * 0.4 * inch + 0.5 * inch  # Approximate height
    table_x = (page_width - table_width) / 2
    table_y = page_height - y_offset*inch - table_height
    
    table.wrapOn(pdf, page_width, page_height)
    table.drawOn(pdf, table_x, table_y)
    
    # Add instructions at the bottom
    pdf.setFont("Helvetica", 9)
    instructions = "Instructions: Place a checkmark (✓) in the appropriate box when each dose is taken."
    pdf.drawString(0.5*inch, 0.5*inch, instructions)
    
    # Add generation timestamp
    timestamp = datetime.now(current_tz).strftime("%Y-%m-%d %H:%M:%S")
    pdf.drawRightString(page_width - 0.5*inch, 0.5*inch, f"Generated: {timestamp}")
    
    # Add page info
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(page_width/2, 0.25*inch, "Page 1 of 1")
    
    # Finalize PDF
    pdf.save()