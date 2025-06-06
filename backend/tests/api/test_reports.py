import io
from datetime import date

from pypdf import PdfReader

from app.models.medication import Medication
from app.models.person import Person

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
    assert "Medication Log" in page_text
    assert "Test Medication" in page_text
    assert "100mg" in page_text  # Matching the sample_medication fixture
    assert "Date:" in page_text  # The date field is present


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
        person_id=person1.id,
    )

    med2 = Medication(
        name="Person Two Med",
        dosage="10mg",
        frequency="Once daily",
        max_doses_per_day=1,
        person_id=person2.id,
    )

    db_session.add(med1)
    db_session.add(med2)
    db_session.commit()

    # Test date for the PDF
    test_date = date.today().isoformat()

    # Request PDF filtered by person1
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?person_id={person1.id}"
    )

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

    # For multiple days, check that we get a valid PDF with the medication
    assert "Test Medication" in page_text
    assert "Date:" in page_text


def test_generate_medication_pdf_no_medications(client, db_session):
    # Test date for the PDF
    test_date = date.today().isoformat()

    # Create a person but no medications
    empty_person = Person(name="Empty Person")
    db_session.add(empty_person)
    db_session.commit()
    db_session.refresh(empty_person)

    # Request PDF for the person with no medications
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?person_id={empty_person.id}"
    )

    # Should return 404 since no medications found
    assert response.status_code == 404
    assert response.json()["detail"] == "No medications found"


def test_generate_medication_pdf_with_timezone(client, sample_medication):
    # Test date for the PDF with timezone offset
    test_date = date.today().isoformat()

    # Request the PDF with timezone offset (480 minutes = UTC-8)
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?timezone_offset=480"
    )

    # Check response status
    assert response.status_code == 200

    # Verify response content type
    assert response.headers["content-type"] == "application/pdf"

    # Try to parse the PDF content to ensure it's valid
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)

    # PDF should have at least one page
    assert len(pdf.pages) > 0

    # Extract text from the first page to verify content
    page_text = pdf.pages[0].extract_text()

    # Verify the PDF contains expected timezone-adjusted content
    assert "Medication Log" in page_text
    assert "Test Medication" in page_text


# test_get_medication_instructions removed as function no longer exists


def test_medication_with_long_instructions(client, db_session):
    # Create test person
    person = Person(name="Test Person")
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    # Create medication with really long name to force text wrapping
    part1 = "Test Medication with Extremely Long Name"
    part2 = "that Will Force Text Wrapping in PDF Generation"
    very_long_name = f"{part1} {part2}"
    med = Medication(
        name=very_long_name,
        dosage="5mg",
        frequency="Twice daily",
        max_doses_per_day=8,  # Many doses to test time slot wrapping
        person_id=person.id,
    )

    db_session.add(med)
    db_session.commit()

    # Test date for the PDF
    test_date = date.today().isoformat()

    # Request the PDF
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?person_id={person.id}"
    )

    # Check response status
    assert response.status_code == 200

    # Parse the PDF
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)
    page_text = pdf.pages[0].extract_text()

    # Verify the PDF contains the long medication name
    # PDF text extraction may insert line breaks differently than expected
    # Check that the medication name is somewhere in the text, by parts
    assert "Test Medication with Extremely Long Name" in page_text

    # Check for the second part without spaces since text may be wrapped differently
    # The second part might be split across lines with a line break
    cleaned_text = page_text.replace("\n", " ").replace("  ", " ")
    assert "in PDF Generation" in cleaned_text


def test_multipage_pdf_generation(client, db_session):
    """Test PDF generation with enough medications to create multiple pages"""
    # Create test person
    person = Person(name="Test Person")
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    # Create more medications to force multiple pages (increased from 10 to 20)
    for i in range(20):  # Create more medications to ensure we get multiple pages
        med = Medication(
            name=f"Test Medication {i}",
            dosage=f"{i*5+5}mg",
            frequency="Daily",
            max_doses_per_day=4,
            instructions=(
                f"Take medication {i} with water. "
                "This medication is for testing pagination in PDF generation. "
                "Some instructions to make this longer for the PDF."
            ),
            person_id=person.id,
        )
        db_session.add(med)

    db_session.commit()

    # Test date for the PDF
    test_date = date.today().isoformat()

    # Request the PDF
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?person_id={person.id}"
    )

    # Check response status
    assert response.status_code == 200

    # Parse the PDF
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)

    # Verify the PDF has multiple pages
    assert len(pdf.pages) > 1

    # Check content on first page
    first_page_text = pdf.pages[0].extract_text()
    assert "Test Person Medication Log" in first_page_text
    assert "Test Medication 0" in first_page_text

    # Check content on second page
    second_page_text = pdf.pages[1].extract_text()
    assert "Page 2" in second_page_text
    # No medication log title on second page (intentionally removed)
    assert "Test Person Medication Log" not in second_page_text


def test_person_not_found(client):
    """Test PDF generation with a non-existent person ID"""
    # Test date for the PDF
    test_date = date.today().isoformat()

    # Request PDF with non-existent person ID
    response = client.get(f"/api/v1/reports/medications/pdf/{test_date}?person_id=999")

    # Should return 404 for person not found
    assert response.status_code == 404
    assert response.json()["detail"] == "Person not found"


def test_pdf_generation_with_very_long_instructions(client, db_session):
    """Test PDF generation with extremely long medication instructions"""
    # Create test person
    person = Person(name="Test Person")
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    # Create a medication with instructions stored in database
    med = Medication(
        name="Pred Acetate",
        dosage="10mg",
        frequency="Twice daily",
        max_doses_per_day=2,
        instructions="Apply 1 drop to right eye only. Steroid for inflammation. Stop if pain or squinting. (Pink cap)",
        person_id=person.id,
    )

    db_session.add(med)
    db_session.commit()

    # Test date for the PDF
    test_date = date.today().isoformat()

    # Request the PDF
    response = client.get(
        f"/api/v1/reports/medications/pdf/{test_date}?person_id={person.id}"
    )

    # Check response status
    assert response.status_code == 200

    # Parse the PDF
    pdf_content = io.BytesIO(response.content)
    pdf = PdfReader(pdf_content)
    page_text = pdf.pages[0].extract_text()

    # Verify the PDF contains the medication name
    assert "Pred Acetate" in page_text
    # Verify instructions from database are in the PDF
    assert "Steroid for inflammation" in page_text
