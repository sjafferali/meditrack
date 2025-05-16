# MediTrack MVP Task List

## Status Legend
- [ ] Not Started
- [🔄] In Progress
- [✅] Completed
- [❌] Blocked

---

## Core Backend Development

### Database Setup
- [ ] Create SQLite database schema
- [ ] Set up database migrations (Alembic)
- [ ] Create initial migration for core tables
- [ ] Add seed data for testing

### API Development
- [ ] Set up FastAPI project structure
- [ ] Create database models (SQLAlchemy)
- [ ] Implement CRUD operations for medications
  - [ ] GET /medications - List all medications
  - [ ] POST /medications - Create new medication
  - [ ] PUT /medications/{id} - Update medication
  - [ ] DELETE /medications/{id} - Delete medication
- [ ] Implement dose tracking endpoints
  - [ ] POST /medications/{id}/dose - Record a dose
  - [ ] GET /medications/{id}/doses - Get dose history
  - [ ] GET /medications/daily-summary - Get today's dose summary
- [ ] Add input validation with Pydantic
- [ ] Add error handling middleware
- [ ] Add CORS middleware for frontend

### Testing
- [ ] Set up pytest framework
- [ ] Write unit tests for database models
- [ ] Write unit tests for API endpoints
- [ ] Add integration tests for API workflows

---

## Frontend Integration

### API Client
- [ ] Create API client service in React
- [ ] Implement medication CRUD operations
- [ ] Implement dose tracking operations
- [ ] Add error handling for API calls

### State Management
- [ ] Replace static state with API data
- [ ] Implement loading states
- [ ] Add error states for failed requests
- [ ] Cache management for offline capability

### UI Updates
- [ ] Connect medication list to API
- [ ] Connect "Take Now" button to dose endpoint
- [ ] Add medication creation form
- [ ] Add medication edit/delete functionality
- [ ] Display real-time dose counts

---

## DevOps & Deployment

### Containerization
- [ ] Create backend Dockerfile
- [ ] Create frontend Dockerfile  
- [ ] Create docker-compose.yml for local development
- [ ] Add .dockerignore files

### GitHub Actions
- [ ] Create CI workflow for tests
- [ ] Create CD workflow for Docker image build
- [ ] Set up Docker Hub repository
- [ ] Add secrets for Docker Hub credentials

### Documentation
- [ ] Create README with setup instructions
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Add development environment setup guide
- [ ] Create production deployment guide

---

## Local Development Setup

### Prerequisites
- [ ] Document Python version requirement (3.9+)
- [ ] Document Node.js version requirement (16+)
- [ ] List required system dependencies

### Backend Setup
- [ ] Create requirements.txt
- [ ] Create virtual environment setup script
- [ ] Add development server command
- [ ] Document environment variables

### Frontend Setup
- [ ] Update package.json with scripts
- [ ] Configure proxy for API calls
- [ ] Add development server command
- [ ] Document environment variables

---

## MVP Feature Checklist

### Must Have
- [ ] View list of medications
- [ ] Track daily doses taken
- [ ] Enforce maximum daily doses
- [ ] Record dose timestamps
- [ ] Display last taken time
- [ ] Add new medications
- [ ] Basic data persistence

### Out of Scope for MVP
- ❌ User authentication
- ❌ Push notifications/reminders
- ❌ Medication schedules
- ❌ Dose history charts
- ❌ Multiple user support
- ❌ Mobile app
- ❌ Medication interactions checker

---

## Notes

### Architecture Decisions
- Backend: FastAPI + SQLAlchemy + SQLite
- Frontend: React (existing TSX component)
- Deployment: Docker + Docker Compose
- CI/CD: GitHub Actions

### Development Workflow
1. Complete backend API
2. Write tests for backend
3. Update frontend to use API
4. Containerize application
5. Set up CI/CD pipeline
6. Document deployment process

### Time Estimate
- Backend Development: 8-10 hours
- Frontend Integration: 4-6 hours
- Testing: 4-6 hours
- DevOps Setup: 4-6 hours
- Documentation: 2-3 hours
- **Total MVP: 22-31 hours**

---

Last Updated: {{ date }}
Next Review: {{ review_date }}