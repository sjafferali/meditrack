# Printable Medication Tracking Forms

MediTrack provides a feature to generate printable medication tracking forms in PDF format. This feature allows users to track their medication doses offline, which can be useful for travel, backup purposes, or when digital access is limited.

## Overview

The printable medication tracking form feature:

- Generates a PDF form with your medications listed
- Provides checkboxes for marking doses as taken
- Includes medication information (name, dosage, max doses per day)
- Can cover one or more days in a single form
- Supports filtering by person in a multi-person setup

## How to Access Printable Forms

1. From the main medication tracking view, click on a date to open the "Daily Medication Log" modal
2. Within the modal, click the "Print Tracking Form" button
3. The PDF will automatically download to your device

## PDF Form Features

The generated PDF includes:

- **Date Range**: Shows which date(s) the form covers
- **Person Information**: Displays the person's name (when applicable)
- **Medication Details**: Lists all medications with names and dosage information
- **Tracking Grid**: Provides spaces to mark when doses are taken
- **Notes Section**: Space for additional information

## Custom Options

The following options can be customized for the PDF generation:

- **Date**: The form is generated for the date you've selected in the UI
- **Person**: If you're using the multi-person feature, the form will include only medications for the currently selected person
- **Days**: By default, the form covers a single day, but the backend supports generating forms covering multiple days (frontend UI for this option coming soon)

## Technical Implementation

The printable form feature uses:

- **Backend**: ReportLab library to generate PDFs from medication data
- **Frontend**: API integration to request and download the generated PDF
- **Data**: Uses the same data model as the main application

## Coming Soon

Future enhancements planned for the printable forms feature:

- UI for selecting the number of days to include in the form (1-7 days)
- Additional customization options for form layout
- Option to include dose history within the form
- Support for recurring schedules

## Troubleshooting

If you encounter issues with the PDF generation:

- Ensure your browser allows downloads from the application
- Check that you have a PDF viewer installed on your device
- If the PDF appears empty, verify that medications exist for the selected date and person
- For persistent issues, contact support with the date and person settings you're trying to use