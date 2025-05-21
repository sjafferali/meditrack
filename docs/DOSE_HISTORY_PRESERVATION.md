# Dose History Preservation

## Overview

MediTrack now preserves dose history when medications are deleted, ensuring that your historical records remain intact even when you no longer need to track a specific medication.

## How It Works

When you delete a medication:
- The medication record itself is removed from the database
- All doses previously recorded for that medication are preserved
- The medication name is stored with each dose to maintain readability

## Where to Find Historical Doses

Historical doses for deleted medications will continue to appear in several places:

### Daily Logs

The Daily Dose Log will show all doses taken on a specific day, including those for medications that have since been deleted. Deleted medication entries will be clearly marked with "(deleted)" after their name.

### Dashboard

On the main dashboard, you'll see a "Previously Recorded Medications" section whenever there are doses from deleted medications. This section allows you to:
- See which deleted medications have dose history
- View the full history for any deleted medication

### Reports

PDF reports and exports will continue to include doses from deleted medications, ensuring your records remain complete for medical documentation.

## Technical Details

This feature was implemented by:
1. Modifying the database schema to add a `medication_name` field to the `doses` table
2. Changing the foreign key relationship to use `SET NULL` instead of `CASCADE` delete
3. Adding code to store the medication name when deleting a medication
4. Updating the API endpoints and frontend to handle and display orphaned doses

This ensures that while the relationship between a dose and its medication is severed on deletion, the historical record remains intact and accessible.