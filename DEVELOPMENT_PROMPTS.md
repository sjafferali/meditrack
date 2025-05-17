# MediTrack Development Prompts

## Main Development Prompt (Start Here)

```
I'm working on the MediTrack medication tracker app. Please help me implement the MVP backend API using FastAPI and SQLite. The project structure and task list are already set up in TASKS.md.

Please follow these steps:
1. Create the backend directory structure with proper Python package organization
2. Set up FastAPI with SQLAlchemy and SQLite
3. Implement the database models for medications and doses based on the schema
4. Create Alembic migrations for the database
5. Implement all CRUD endpoints for medications as listed in TASKS.md
6. Implement dose tracking endpoints
7. Add Pydantic schemas for request/response validation
8. Write comprehensive pytest unit tests
9. Add error handling and CORS middleware
10. Create requirements.txt with all dependencies

After each major component:
- Run tests to ensure everything works
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Please use Python 3.9+ type hints and follow PEP 8 standards.
```

## Frontend Integration Prompt

```
I need to integrate the React frontend with the FastAPI backend for MediTrack. The backend API is complete and running on port 8000.

Please:
1. Create an API client service in the frontend/src/services directory
2. Replace the static medication state with API calls to the backend
3. Implement loading and error states for all API operations
4. Connect the "Take Now" button to the dose tracking endpoint
5. Add forms for creating and editing medications
6. Implement delete functionality with confirmation
7. Update the UI to show real-time dose counts from the API
8. Add proper error handling and user feedback
9. Test all functionality thoroughly

After each feature:
- Test the integration with the running backend
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Make sure to handle network errors gracefully and provide user feedback.
```

## Docker Setup Prompt

```
I need to dockerize the MediTrack application. The backend and frontend are complete.

Please:
1. Create a Dockerfile for the backend in backend/Dockerfile
   - Use Python 3.9 slim image
   - Install dependencies
   - Copy application code
   - Expose port 8000
   - Set proper CMD for production
2. Create a Dockerfile for the frontend in frontend/Dockerfile
   - Use Node 16 alpine image
   - Install dependencies
   - Build React app
   - Use nginx to serve static files
3. Update docker-compose files as needed (docker-compose.simple.yml or docker-compose.postgres.yml)
4. Add .dockerignore files for both services
5. Test the complete stack with docker-compose -f docker-compose.simple.yml up
6. Update the existing docker-compose files for production settings

After each step:
- Build and test the Docker images
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Ensure the images are optimized for size and security.
```

## Database Migration Prompt

```
I need to set up database migrations for MediTrack using Alembic.

Please:
1. Initialize Alembic in the backend directory
2. Configure Alembic to work with SQLAlchemy models
3. Create the initial migration for medications and doses tables
4. Add a migration script to seed initial test data
5. Create helper scripts for common database operations
6. Test migrations with upgrade and downgrade
7. Document the migration process in the README

After each step:
- Test the migrations thoroughly
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Ensure migrations are reversible and include proper error handling.
```

## Testing Suite Prompt

```
I need to create a comprehensive test suite for MediTrack.

Please:
1. Set up pytest configuration for the backend
2. Create test fixtures for database and API client
3. Write unit tests for all API endpoints
4. Add integration tests for complete workflows
5. Set up frontend testing with Jest and React Testing Library
6. Write component tests for all React components
7. Add end-to-end tests for critical user flows
8. Configure code coverage reporting
9. Add pre-commit hooks for running tests

After each test file:
- Run the tests to ensure they pass
- Check code coverage
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Aim for at least 80% code coverage.
```

## CI/CD Pipeline Prompt

```
I need to enhance the GitHub Actions CI/CD pipeline for MediTrack.

Please:
1. Update the existing workflow to run backend tests
2. Add frontend testing to the pipeline
3. Add linting and code quality checks
4. Set up automated dependency updates
5. Add security scanning for vulnerabilities
6. Configure deployment to a staging environment
7. Add production deployment with manual approval
8. Set up monitoring and alerts
9. Add build status badges to README

After each addition:
- Test the workflow with a push
- Verify all checks pass
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Ensure the pipeline fails fast on errors.
```

## Documentation Prompt

```
I need to create comprehensive documentation for MediTrack.

Please:
1. Update README.md with project overview and quick start
2. Add API documentation with example requests/responses
3. Create architecture diagrams
4. Write deployment guide for various platforms
5. Add troubleshooting section for common issues
6. Create contributing guidelines
7. Add code of conduct
8. Generate OpenAPI documentation
9. Create user guide with screenshots

After each document:
- Review for clarity and completeness
- Commit changes with descriptive messages
- Update TASKS.md to mark completed items
- Push changes to the repository

Focus on clear, concise documentation with examples.
```

## Quick Fix Prompts

### Bug Fix Prompt
```
I found a bug in MediTrack: [describe bug]. Please fix it and add a test to prevent regression. Commit and push the fix.
```

### Feature Addition Prompt
```
I need to add [feature] to MediTrack. Please implement it following the existing patterns, add tests, update documentation, then commit and push.
```

### Performance Optimization Prompt
```
The [component/endpoint] in MediTrack is slow. Please profile it, optimize the performance, add benchmarks, then commit and push the improvements.
```

### Security Update Prompt
```
Please scan MediTrack for security vulnerabilities, update dependencies, fix any issues found, add security tests, then commit and push the changes.
```

## Checkpoint Guidelines

At each checkpoint, ensure:
1. Code compiles/runs without errors
2. All tests pass
3. Documentation is updated
4. TASKS.md is updated with progress
5. Changes are committed with clear messages
6. Code follows project standards
7. No sensitive data is committed

## Commit Message Format

Use this format for commits:
```
type(scope): description

- Detail 1
- Detail 2

Refs: #issue-number
```

Types: feat, fix, docs, style, refactor, test, chore
Scope: backend, frontend, docker, ci, docs