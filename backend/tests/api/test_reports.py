from datetime import date
import io
import pytest
from fastapi.testclient import TestClient
from PyPDF2 import PdfReader

from app.main import app
from app.models.person import Person
from app.models.medication import Medication


# Use the client fixture from conftest.py


def test_generate_medication_pdf(client, sample_medication):
    # Use sample_medication fixture from conftest.py
    
    # Test date for the PDF
    test_date = date.today().isoformat()
    
    # Request the PDF
    response = client.get(f"/api/v1/reports/medications/pdf/{test_date}")
    
    # Check response status
    assert response.status_code == 200
    
    # Verify response content type
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    
    # Try to parse the PDF content to ensure it's valid
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)
    
    # PDF should have at least one page
    assert len(pdf.pages) > 0
    
    # Extract text from the first page to verify content
    page_text = pdf.pages[0].extract_text()
    
    # Verify the PDF contains the expected content
    assert "Medication Tracking Form" in page_text
    assert "Test Medication" in page_text
    assert "100mg" in page_text  # Matching the sample_medication fixture
    assert "2" in page_text  # max_doses_per_day


def test_generate_medication_pdf_with_person_filter(client, db_session):
    # Create two test persons
    person1 = Person(name="Person One")
    person2 = Person(name="Person Two")
    db_session.add(person1)
    db_session.add(person2)
    db_session.commit()
    db_session.refresh(person1)
    db_session.refresh(person2)
    
    # Create medications for each person
    med1 = Medication(
        name="Person One Med",
        dosage="5mg",
        frequency="Twice daily",
        max_doses_per_day=2,
        person_id=person1.id
    )
    
    med2 = Medication(
        name="Person Two Med",
        dosage="10mg",
        frequency="Once daily",
        max_doses_per_day=1,
        person_id=person2.id
    )
    
    db_session.add(med1)
    db_session.add(med2)
    db_session.commit()
    
    # Test date for the PDF
    test_date = date.today().isoformat()
    
    # Request PDF filtered by person1
    response = client.get(f"/api/v1/reports/medications/pdf/{test_date}?person_id={person1.id}")
    
    # Check response status
    assert response.status_code == 200
    
    # Parse the PDF
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)
    page_text = pdf.pages[0].extract_text()
    
    # Verify the PDF contains only Person One's medication
    assert "Person One Med" in page_text
    assert "5mg" in page_text
    assert "Person Two Med" not in page_text


def test_generate_medication_pdf_with_multiple_days(client, sample_medication):
    
    # Test date for the PDF
    test_date = date.today().isoformat()
    
    # Request PDF with 3 days
    response = client.get(f"/api/v1/reports/medications/pdf/{test_date}?days=3")
    
    # Check response status
    assert response.status_code == 200
    
    # Parse the PDF
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)
    page_text = pdf.pages[0].extract_text()
    
    # Verify the PDF mentions the word "Dates" (plural) instead of "Date" (singular)
    assert "Dates:" in page_text


def test_generate_medication_pdf_no_medications(client, db_session):
    # Test date for the PDF
    test_date = date.today().isoformat()
    
    # Create a person but no medications
    empty_person = Person(name="Empty Person")
    db_session.add(empty_person)
    db_session.commit()
    db_session.refresh(empty_person)
    
    # Request PDF for the person with no medications
    response = client.get(f"/api/v1/reports/medications/pdf/{test_date}?person_id={empty_person.id}")
    
    # Should return 404 since no medications found
    assert response.status_code == 404
    assert response.json()["detail"] == "No medications found"