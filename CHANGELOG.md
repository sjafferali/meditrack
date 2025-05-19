# Changelog

All notable changes to MediTrack will be documented in this file.

## [2.0.0] - 2024-01-18

### Added
- **Multi-Person Support**: Track medications for multiple family members or patients
  - Person management UI with add/edit/delete functionality
  - Person selector dropdown in the header
  - Default person setting
  - Complete data separation between persons
- New API endpoints for person management
  - `GET /api/v1/persons/` - List all persons
  - `POST /api/v1/persons/` - Create new person
  - `PUT /api/v1/persons/{id}` - Update person
  - `DELETE /api/v1/persons/{id}` - Delete person
  - `PUT /api/v1/persons/{id}/set-default` - Set as default
- PersonSelector component for easy switching between people
- PersonManager modal for comprehensive person management
- Migration to add Person model and relationships
- Comprehensive test coverage for new components

### Changed
- Medications are now associated with specific persons
- All medication API endpoints now filter by person_id
- Updated database schema to include person relationships
- Enhanced architecture documentation
- Updated user guide with multi-person instructions

### Security
- Data isolation between different persons
- No cross-person data access

### Migration Notes
- Existing medications are automatically assigned to a default person
- No data loss during migration
- Database schema updated with new relationships

## [1.5.0] - 2024-01-15

### Added
- Daily dose log feature with comprehensive daily summary
- Time picker for recording doses at specific times
- Improved date navigation
- Timezone support for accurate dose tracking

### Fixed
- Race condition in dose recording
- Timezone issues with dose counts
- Progress bar calculation errors

## [1.0.0] - 2024-01-10

### Initial Release
- Basic medication tracking functionality
- Dose recording with daily limits
- Medication management (CRUD operations)
- Progress tracking with visual indicators
- RESTful API with FastAPI
- React frontend with responsive design
- Docker support for easy deployment
- SQLite database with Alembic migrations