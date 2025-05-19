# Multi-Person Support Guide

MediTrack now supports tracking medications for multiple people, making it perfect for families, caregivers, and healthcare providers who need to manage medications for different individuals.

## Overview

The multi-person feature allows you to:
- Create separate profiles for each person
- Track medications independently for each individual
- Switch between people easily using the person selector
- Set a default person for quick access
- Maintain complete separation of medication data between people

## Key Features

### Person Profiles

Each person profile includes:
- **Name**: Full name of the individual
- **Date of Birth**: Optional birth date for reference
- **Notes**: Additional information (allergies, conditions, etc.)
- **Default Status**: Whether this person is selected by default
- **Medication Count**: Number of active medications

### Data Separation

- Each person has their own set of medications
- Dose history is tracked separately for each person
- Daily summaries are person-specific
- No data sharing between profiles

### Person Management

From the person management interface, you can:
- Add new people
- Edit existing profiles
- Delete people (with all their data)
- Set a default person
- View medication counts

## Use Cases

### Family Medicine Tracking

Perfect for families where multiple members need medication tracking:
- Parents managing their own medications
- Children's medications tracked separately
- Elderly parents or relatives
- Each family member's privacy maintained

### Caregiver Support

Ideal for caregivers managing medications for multiple patients:
- Professional caregivers
- Home health aides
- Family caregivers
- Nursing home staff

### Personal Organization

Keep different medication regimens separate:
- Regular daily medications
- Temporary treatments
- Supplements vs. prescriptions
- Different health conditions

## Getting Started

### Creating Your First Person

1. When you first open MediTrack, a default person is created
2. To add another person, click the person selector dropdown
3. Select "Manage People"
4. Click "Add Person" and fill in their details

### Switching Between People

1. Click the person selector in the header
2. Choose the person you want to manage
3. The entire interface updates to show only that person's data

### Best Practices

1. **Use Clear Names**: Include relationship or context if helpful
   - "John Doe (Father)"
   - "Sarah - Child"

2. **Add Helpful Notes**: Include important medical information
   - "Allergic to penicillin"
   - "Takes medications with breakfast"
   - "Doctor: Dr. Smith"

3. **Set a Default**: Choose the most frequently accessed person as default

4. **Regular Reviews**: Periodically review and update person information

## API Integration

### Person-Specific API Calls

All medication-related API endpoints now accept a `person_id` parameter:

```javascript
// Get medications for a specific person
fetch('/api/v1/medications/?person_id=1')

// Create medication for a person
fetch('/api/v1/medications/', {
  method: 'POST',
  body: JSON.stringify({
    person_id: 1,
    name: 'Aspirin',
    dosage: '81mg',
    // ... other fields
  })
})
```

### Person Management Endpoints

New endpoints for person management:
- `GET /api/v1/persons/` - List all persons
- `POST /api/v1/persons/` - Create new person
- `PUT /api/v1/persons/{id}` - Update person
- `DELETE /api/v1/persons/{id}` - Delete person
- `PUT /api/v1/persons/{id}/set-default` - Set as default

## Data Privacy

### Separation of Concerns

- Each person's data is completely isolated
- No cross-person data access
- Deletion removes all associated data
- No sharing between profiles

### Security Considerations

- Implement user authentication to protect multi-person data
- Consider role-based access for different users
- Regular backups recommended
- Audit trails for sensitive operations

## Migration from Single-Person

If you're upgrading from a single-person version:

1. Your existing medications are assigned to the default person
2. Continue using MediTrack as before
3. Add new people when needed
4. No data loss during upgrade

## Troubleshooting

### Common Issues

**Can't see medications after switching people**
- Medications are person-specific
- Check that the correct person is selected
- Verify medications exist for that person

**Person selector not showing**
- Refresh the page
- Check browser console for errors
- Ensure frontend is properly connected to backend

**Can't delete a person**
- Cannot delete the last remaining person
- Must have at least one person in the system
- Check for any active medications

### Getting Help

For issues with multi-person features:
1. Check this guide first
2. Review the main troubleshooting guide
3. Check GitHub issues for known problems
4. Create a new issue if needed

## Future Enhancements

Planned improvements for multi-person support:
- User authentication and access control
- Shared medication lists between people
- Family groups with permissions
- Medication interaction checking across people
- Export/import person profiles
- Mobile app support

## Conclusion

Multi-person support makes MediTrack more versatile and useful for a wider range of users. Whether managing medications for your family or as a professional caregiver, this feature provides the organization and separation needed for effective medication management.