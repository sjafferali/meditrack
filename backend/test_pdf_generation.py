#!/usr/bin/env python
"""
Test script for PDF generation with multiple medications.
This script creates a test PDF with a customizable number of medications
to verify that multi-page support works correctly.
"""

import os
import sys
from datetime import date, datetime, timedelta, timezone
from io import BytesIO

from fastapi import FastAPI

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

# Create a FastAPI app for testing
app = FastAPI()

from app.api.endpoints.reports import create_medication_tracking_pdf

# Import the necessary modules
from app.models import Medication, Person


class MockMedication:
    """Mock medication class for testing PDF generation."""

    def __init__(self, id, name, dosage, max_doses_per_day):
        self.id = id
        self.name = name
        self.dosage = dosage
        self.max_doses_per_day = max_doses_per_day


def generate_test_pdf(
    num_medications=5, max_doses=6, output_path="test_tracking_form.pdf"
):
    """
    Generate a test PDF with the specified number of medications.

    Args:
        num_medications: Number of test medications to include
        max_doses: Maximum doses per day for each medication
        output_path: Path to save the generated PDF
    """
    # Create test medications
    medications = []
    for i in range(1, num_medications + 1):
        med = MockMedication(
            id=i,
            name=f"Test Medication {i}",
            dosage=f"{i*10}mg",
            max_doses_per_day=max_doses,
        )
        medications.append(med)

    print(f"Created {len(medications)} test medications")

    # Create a BytesIO buffer for the PDF
    buffer = BytesIO()

    # Generate the PDF
    create_medication_tracking_pdf(
        buffer=buffer,
        medications=medications,
        dates=[date.today()],
        person_name="Test Person",
        current_tz=timezone.utc,
        db=None,  # Not needed for the test
    )

    # Save the PDF to a file
    buffer.seek(0)
    with open(output_path, "wb") as f:
        f.write(buffer.read())

    print(f"PDF saved to {output_path}")


if __name__ == "__main__":
    # Get the number of medications from command line args if provided
    num_medications = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    max_doses = int(sys.argv[2]) if len(sys.argv) > 2 else 6

    generate_test_pdf(num_medications, max_doses)
    print("Done!")
