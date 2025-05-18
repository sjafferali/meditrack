#!/usr/bin/env python3
"""
MediTrack Medication Import Script

This script imports medication data from a veterinary prescription
to the MediTrack API.
"""

import requests
import argparse
import sys

# Medication data extracted from the prescription images
MEDICATIONS = [
    {
        "name": "Pred Acetate 1%",
        "dosage": "10 mL Drops",
        "frequency": "4x daily",
        "max_doses_per_day": 4,
        "instructions": "Apply one drop to the RIGHT eyes 4x daily until recheck. This medication is a topical steroid used to decrease inflammation. Stop if use causes pain or squinting and call VEC for instructions."
    },
    {
        "name": "Ofloxacin 0.3%",
        "dosage": "10mL Drops",
        "frequency": "4x daily",
        "max_doses_per_day": 4,
        "instructions": "Apply one drop to the BOTH eyes 4x daily until recheck. This med is an antibiotic."
    },
    {
        "name": "Artificial Tears",
        "dosage": "Drops",
        "frequency": "1-2 times daily",
        "max_doses_per_day": 2,
        "instructions": "Refresh Liquigel and Blink are good over the counter choices. Apply one drop to BOTH eyes 1-2 times daily."
    },
    {
        "name": "Ocu-glo Small Dogs",
        "dosage": "Oral supplement",
        "frequency": "Once daily",
        "max_doses_per_day": 1,
        "instructions": "Give daily as an oral antioxidant supplement. Follow the dosing instructions on the bottle."
    },
    {
        "name": "Tacrolimus 0.03%",
        "dosage": "Drops Aqueous 15mL",
        "frequency": "2x daily",
        "max_doses_per_day": 2,
        "instructions": "Apply one drop to BOTH eyes 2 times daily until recheck. This med is a tear stimulant and needs to be administered on a long term basis."
    },
    {
        "name": "Diclofenac 0.1%",
        "dosage": "5mL Drops",
        "frequency": "2x daily",
        "max_doses_per_day": 2,
        "instructions": "Apply one drop to BOTH eyes 2x daily until recheck to decrease inflammation. This med is a topical non-steroidal anti-inflammatory. Discontinue use if squinting occurs. Call VEC if this occurs."
    },
    {
        "name": "Dorzolamide/Timolol",
        "dosage": "Ophthalmic Sol. 10mL",
        "frequency": "4x daily left eye, 2x daily right eye",
        "max_doses_per_day": 6,
        "instructions": "Apply one drop to the left eye 4 times a day and right eye 2x daily until recheck. This medication lowers eye pressure."
    },
    {
        "name": "Gabapentin 20 mg",
        "dosage": "tablets (Epicur)",
        "frequency": "Every 8-24 hours",
        "max_doses_per_day": 3,
        "instructions": "Give 1-2 tablet orally every 8-24 hours for pain and sedation. May stop early."
    },
    {
        "name": "Clavacillin (Clavamox)",
        "dosage": "62.5mg Tabs",
        "frequency": "Do not use",
        "max_doses_per_day": 0,
        "instructions": "STOP do not discard."
    },
    {
        "name": "Prednisone",
        "dosage": "1 mg Tablets",
        "frequency": "Every 12 hours",
        "max_doses_per_day": 2,
        "instructions": "Give 1 tablet orally every 12 hours with food until recheck to decrease pain and inflammation. Call and stop if vomiting or diarrhea or bloody stool. This med increases thirst, urination, appetite and panting. Do not combine with an oral NSAID med."
    },
    {
        "name": "I-Drop Vet Plus",
        "dosage": "Multi-Dose 10mL",
        "frequency": "3x daily",
        "max_doses_per_day": 3,
        "instructions": "Apply a small dot to the left eye 3x daily for lubrication. Apply before bedtime."
    },
    {
        "name": "Gabapentin 50 mg",
        "dosage": "Tablets (Epicur)",
        "frequency": "Every 8-24 hours",
        "max_doses_per_day": 3,
        "instructions": "Give 1 tablet orally every 8-24 hours for pain and sedation. May stop early."
    },
    {
        "name": "Trazodone",
        "dosage": "50mg",
        "frequency": "Twice a day",
        "max_doses_per_day": 2,
        "instructions": "Give 1/2 tab twice a day with food to relieve anxiety."
    },
    {
        "name": "Latanoprost 0.005%",
        "dosage": "2.5mL Drops",
        "frequency": "3 times a day",
        "max_doses_per_day": 3,
        "instructions": "Apply one drop to the left eye 3 times a day until recheck. This medication lowers eye pressure and constricts the pupil."
    },
    {
        "name": "Pro Plan Vet Supplement K9",
        "dosage": "Packet",
        "frequency": "Every 24 hours as needed",
        "max_doses_per_day": 1,
        "instructions": "Mix 1 packet with food every 24 hours as needed as probiotic."
    },
    {
        "name": "Entyce",
        "dosage": "30mg/mL - 10mL bottle",
        "frequency": "Every 24 hours",
        "max_doses_per_day": 1,
        "instructions": "START TOMORROW WITH BREAKFAST: Give 0.45ml by mouth every 24 hours as needed for appetite stimulant."
    },
    {
        "name": "Ondansetron",
        "dosage": "4mg Tablet",
        "frequency": "Every 8-24 hours as needed",
        "max_doses_per_day": 3,
        "instructions": "Give 1/2 to 1 tab by mouth every 8-24 hours as needed for nausea."
    }
]

def add_medication(api_url, data):
    """Add a medication to MediTrack via API"""
    try:
        response = requests.post(api_url, json=data)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        print(f"✅ Successfully added: {data['name']} - {data['dosage']}")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error adding {data['name']}: {str(e)}")
        return None

def import_medications(base_url, medications, dry_run=False):
    """Import multiple medications"""
    # Ensure the base URL has the correct format
    if not base_url.endswith('/'):
        base_url += '/'

    # Create the full medications endpoint URL
    api_url = f"{base_url}api/v1/medications/"

    print(f"Importing {len(medications)} medications to {api_url}...")

    if dry_run:
        print("DRY RUN: Would import these medications:")
        for i, med in enumerate(medications, 1):
            print(f"{i}. {med['name']} - {med['dosage']} ({med['frequency']})")
        print(f"\nTotal: {len(medications)} medications")
        return

    successful = 0
    failed = 0

    for med in medications:
        result = add_medication(api_url, med)
        if result:
            successful += 1
        else:
            failed += 1

    print("\nImport summary:")
    print(f"Total medications: {len(medications)}")
    print(f"Successfully imported: {successful}")
    print(f"Failed to import: {failed}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Import medications to MediTrack API")
    parser.add_argument("--api-url", default="http://localhost:8000",
                        help="Base URL for the MediTrack server (default: http://localhost:8000)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Dry run mode (print medications but don't send to API)")

    args = parser.parse_args()

    try:
        import_medications(args.api_url, MEDICATIONS, args.dry_run)
    except KeyboardInterrupt:
        print("\nImport cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
