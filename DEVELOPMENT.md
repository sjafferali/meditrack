# MediTrack Development Guide

## Prerequisites

- Python 3.9+
- Node.js 16+
- Docker and Docker Compose (optional)
- Git

## Local Development Setup

### Option 1: Docker Development (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/meditrack.git
   cd meditrack
   ```

2. Start the development environment:
   ```bash
   docker-compose up
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database UI: http://localhost:8080

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Initialize database:
   ```bash
   alembic upgrade head
   python scripts/seed_data.py  # Optional: Add test data
   ```

6. Start the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Development Workflow

### Backend Development

1. API endpoints are in `backend/app/api/`
2. Database models are in `backend/app/models/`
3. Business logic is in `backend/app/services/`

To add a new feature:
1. Create/update models
2. Create a migration: `alembic revision --autogenerate -m "Description"`
3. Apply migration: `alembic upgrade head`
4. Implement API endpoint
5. Write tests in `backend/tests/`
6. Run tests: `pytest`

### Frontend Development

1. Components are in `frontend/src/components/`
2. API client is in `frontend/src/services/api.js`
3. State management uses React hooks

To add a new feature:
1. Create/update components
2. Update API client if needed
3. Add state management
4. Write tests in `frontend/src/__tests__/`
5. Run tests: `npm test`

## Testing

### Backend Tests
```bash
cd backend
pytest                    # Run all tests
pytest -v                # Verbose output
pytest --cov=app        # With coverage
pytest -k test_medications  # Run specific tests
```

### Frontend Tests
```bash
cd frontend
npm test                 # Run in watch mode
npm test -- --coverage   # With coverage
npm test -- --watchAll=false  # Run once
```

## Database Management

### Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"  # Create migration
alembic upgrade head                              # Apply migrations
alembic downgrade -1                              # Rollback one version
alembic history                                   # View migration history
```

### Database Access
- SQLite file: `backend/data/meditrack.db`
- Use Adminer at http://localhost:8080 (when using Docker)
- Or use SQLite CLI: `sqlite3 backend/data/meditrack.db`

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Common Issues

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Locked
- Stop all processes accessing the database
- Or restart the backend server

### CORS Issues
- Check CORS configuration in `backend/app/main.py`
- Ensure frontend proxy is configured correctly

## Code Style

### Python (Backend)
- Follow PEP 8
- Use Black for formatting: `black .`
- Use isort for imports: `isort .`
- Type hints are required

### JavaScript (Frontend)
- Follow ESLint rules
- Use Prettier for formatting: `npm run format`
- Functional components with hooks

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=sqlite:///./data/meditrack.db
SECRET_KEY=your-secret-key
ENVIRONMENT=development
DEBUG=true
```

### Frontend (.env.local)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## Debugging

### Backend Debugging
1. Add breakpoints with `import pdb; pdb.set_trace()`
2. Use VS Code debugger with FastAPI configuration
3. Check logs in terminal

### Frontend Debugging
1. Use browser DevTools
2. React Developer Tools extension
3. Console.log debugging
4. VS Code debugger

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## Contributing

1. Create a feature branch
2. Make changes and write tests
3. Run linting and tests
4. Create pull request
5. Update documentation if needed

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)