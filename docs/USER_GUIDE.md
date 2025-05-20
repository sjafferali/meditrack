# MediTrack User Guide

Welcome to MediTrack! This guide will help you get started with tracking medications for yourself and your family members, and managing daily doses.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing People](#managing-people)
4. [Managing Medications](#managing-medications)
5. [Tracking Doses](#tracking-doses)
6. [Viewing History](#viewing-history)
7. [Printable Tracking Forms](#printable-tracking-forms)
8. [Tips and Best Practices](#tips-and-best-practices)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing MediTrack

1. Open your web browser
2. Navigate to MediTrack (typically http://localhost:3000 for local installation)
3. You'll see the main dashboard

[Screenshot: MediTrack home page showing the main dashboard with medications list]

### First Time Setup

When you first access MediTrack:

1. A default person profile is created for you
2. You can immediately start adding medications
3. To manage medications for other people, use the person selector in the header

## Dashboard Overview

The main dashboard displays:

- **Person Selector**: Dropdown in the header to switch between people
- **Medication Cards**: Shows medications for the selected person
- **Add Medication Button**: Create new medications
- **View Daily Log Button**: See comprehensive daily summary

Each medication card shows:
- Medication name and dosage
- Frequency information
- Daily dose progress
- Last taken time
- Action buttons (Take Now, Edit, Delete)

[Screenshot: Dashboard with person selector and multiple medication cards]

### Understanding the Medication Cards

Each medication card contains:

1. **Header**: Medication name and dosage
2. **Frequency**: How often to take the medication
3. **Progress Bar**: Visual representation of daily doses taken
4. **Dose Counter**: "X of Y doses taken today"
5. **Last Taken**: Timestamp of the most recent dose
6. **Action Buttons**:
   - **Take Now**: Record a dose (disabled when daily limit reached)
   - **Edit**: Modify medication details
   - **Delete**: Remove medication (with confirmation)

[Screenshot: Close-up of a single medication card with annotations]

## Managing People

### Switching Between People

1. Click the **person selector dropdown** in the header
2. Select the person whose medications you want to manage
3. The dashboard updates to show only that person's medications

### Adding a New Person

1. Click the **person selector dropdown**
2. Click **"Manage People"** at the bottom
3. Click **"+ Add Person"** in the modal
4. Fill in the person's details:
   - **Name**: Person's full name (required)
   - **Date of Birth**: Birth date (optional)
   - **Notes**: Any additional information (optional)
5. Click **"Add"** to save

[Screenshot: Person management modal with add person form]

### Editing a Person

1. Open the person management modal
2. Click **"Edit"** next to the person's name
3. Update their information
4. Click **"Update"** to save changes

### Setting a Default Person

1. Open the person management modal
2. Click **"Set as Default"** next to the person's name
3. This person will be automatically selected when you open MediTrack

### Deleting a Person

⚠️ **Warning**: Deleting a person removes all their medications and dose history permanently.

1. Open the person management modal
2. Click **"Delete"** next to the person's name
3. Confirm the deletion
4. The person and all their data will be removed

[Screenshot: Person management with delete confirmation]

## Managing Medications

### Adding a New Medication

1. Click the **"Add Medication"** button at the top of the dashboard
2. Fill in the medication details:
   - **Name**: Enter the medication name (required)
   - **Dosage**: Enter the dosage amount (required)
   - **Frequency**: Describe how often to take it (required)
   - **Max Doses Per Day**: Set the daily limit (1-20)
   - **Instructions**: Add any special instructions (optional)
3. Click **"Add Medication"** to save

[Screenshot: Add medication form with filled-in example data]

#### Example:
```
Name: Lisinopril
Dosage: 10mg
Frequency: Once daily
Max Doses Per Day: 1
Instructions: Take with food in the morning
```

### Editing a Medication

1. Click the **"Edit"** button on the medication card
2. Modify any fields as needed
3. Click **"Update Medication"** to save changes
4. Click **"Cancel"** to discard changes

[Screenshot: Edit medication form showing existing medication data]

### Deleting a Medication

1. Click the **"Delete"** button on the medication card
2. Confirm the deletion in the popup dialog
3. The medication and all its dose history will be permanently removed

[Screenshot: Delete confirmation dialog]

⚠️ **Warning**: Deleting a medication cannot be undone. All dose history for that medication will be lost.

## Tracking Doses

### Recording a Dose

1. Find the medication card
2. Click the **"Take Now"** button
3. The dose counter will update immediately
4. The "Last taken" time will show the current time
5. The progress bar will fill based on daily progress

[Screenshot: Before and after clicking "Take Now" button]

### Daily Dose Limits

- Each medication has a maximum number of doses per day
- When the limit is reached, the "Take Now" button becomes disabled
- The button shows "Max doses reached today"
- The progress bar shows 100% when complete

[Screenshot: Medication card showing max doses reached state]

### Dose Tracking Reset

- Dose counts reset at midnight (00:00) each day
- Your dose history is preserved for record-keeping
- The progress bars and counters start fresh each day

## Viewing History

### Daily Summary

You can access historical data through the daily log:

1. Click on a date in the calendar view
2. The **Daily Medication Log** modal shows all medications and doses taken that day
3. You can view and copy a formatted summary of all doses
4. Generate a printable version (see next section)

[Screenshot: Example of daily summary view]

### Understanding Timestamps

All times are displayed in your local timezone:
- **Last taken**: Shows exact time of most recent dose
- **Today's doses**: Only counts doses taken since midnight
- **History**: Preserves all dose records with timestamps

## Printable Tracking Forms

### Generating Printable Forms

MediTrack allows you to generate printable medication tracking forms in PDF format:

1. Click on a date in the calendar to open the **Daily Medication Log** modal
2. Click the **Print Tracking Form** button
3. A PDF file will automatically download to your device

[Screenshot: Daily Log modal with Print Tracking Form button]

### Using Printable Forms

The PDF form includes:
- **Medication listing**: All medications with dosages
- **Time entry spaces**: Blank spaces to record the time each dose is taken
- **Notes section**: For additional information

This feature is useful for:
- Traveling when digital access may be limited
- Creating a backup physical record
- Sharing information with healthcare providers
- Setting up a physical reminder system

For more details, see the [Printable Tracking Forms](PRINTABLE_TRACKING_FORMS.md) documentation.

## Tips and Best Practices

### Organizing Your Medications

1. **Use Clear Names**: Include brand name and generic name if helpful
   - Example: "Advil (Ibuprofen)"

2. **Be Specific with Dosage**: Include units
   - Example: "200mg" or "5mL"

3. **Detailed Instructions**: Use the instructions field for important reminders
   - Example: "Take with 8oz water, avoid dairy products"

### Setting Up Reminders

While MediTrack doesn't have built-in reminders, you can:
1. Set phone alarms for medication times
2. Use the frequency field as a reminder
3. Check MediTrack at regular times each day

### Best Practices

1. **Update Immediately**: Record doses as soon as you take them
2. **Regular Reviews**: Periodically review and update medication information
3. **Accurate Limits**: Set realistic daily dose limits
4. **Complete Information**: Fill in all fields for better tracking

## Troubleshooting

### Common Issues

#### "Take Now" Button is Disabled
- **Cause**: Daily dose limit reached
- **Solution**: Wait until midnight for reset

#### Can't Add Medication
- **Cause**: Missing required fields
- **Solution**: Ensure Name, Dosage, and Frequency are filled

#### Changes Not Saving
- **Cause**: Network issue or validation error
- **Solution**: Check your connection and form data

#### Page Not Loading
- **Cause**: Server not running
- **Solution**: Ensure both frontend and backend are running

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review error messages carefully
3. Try refreshing the page
4. Restart the application if needed

## Keyboard Shortcuts

MediTrack supports these keyboard shortcuts:

- **Ctrl/Cmd + N**: Open Add Medication form
- **Escape**: Close forms and dialogs
- **Enter**: Submit forms (when focused)

## Accessibility Features

MediTrack includes:
- Keyboard navigation support
- Screen reader-friendly labels
- High contrast colors
- Clear focus indicators

## Mobile Usage

MediTrack is responsive and works on mobile devices:

[Screenshot: Mobile view of the dashboard]

- Cards stack vertically on small screens
- Buttons remain easily tappable
- All features available on mobile

## Privacy and Security

- All data is stored locally (in default configuration)
- No data is shared with third parties
- Secure communication between frontend and backend
- Regular security updates

## Frequently Asked Questions

**Q: Can I track medications for multiple people?**
A: Yes! MediTrack supports multiple person profiles. Use the person selector in the header to switch between family members or patients. Each person's medications are tracked separately.

**Q: Can I export my medication history?**
A: Yes! You can export as plaintext via the "Copy to Clipboard" feature in the Daily Log, or generate a printable PDF form by clicking the "Print Tracking Form" button.

**Q: Is my data backed up?**
A: In the default configuration, data is stored locally. We recommend regular backups of your database file.

**Q: Can I use MediTrack offline?**
A: The frontend requires initial loading, but once loaded, basic functionality works offline. Full offline support is planned.

**Q: How accurate is the dose tracking?**
A: Dose tracking is real-time and accurate to the second. Times are stored in UTC and displayed in your local timezone.

## Updates and Feedback

To stay updated:
1. Check the [GitHub repository](https://github.com/sjafferali/meditrack) for updates
2. Report issues on [GitHub Issues](https://github.com/sjafferali/meditrack/issues)
3. Join discussions in [GitHub Discussions](https://github.com/sjafferali/meditrack/discussions)

Thank you for using MediTrack! We hope it helps you manage your medications effectively.