# MediTrack Troubleshooting Guide

This guide helps you resolve common issues with MediTrack. If your issue isn't covered here, please check our [GitHub Issues](https://github.com/sjafferali/meditrack/issues) or create a new one.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Backend Issues](#backend-issues)
3. [Frontend Issues](#frontend-issues)
4. [Database Issues](#database-issues)
5. [Docker Issues](#docker-issues)
6. [API Issues](#api-issues)
7. [Performance Issues](#performance-issues)
8. [Security Issues](#security-issues)
9. [Deployment Issues](#deployment-issues)
10. [Development Issues](#development-issues)

## Installation Issues

### Python Dependencies Installation Fails

**Problem**: `pip install -r requirements.txt` fails with errors.

**Solutions**:

1. Update pip:
   ```bash
   python -m pip install --upgrade pip
   ```

2. Use virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Install system dependencies (Ubuntu/Debian):
   ```bash
   sudo apt-get update
   sudo apt-get install python3-dev build-essential
   ```

4. For M1 Macs:
   ```bash
   # Install Rosetta if needed
   softwareupdate --install-rosetta
   
   # Use x86_64 architecture
   arch -x86_64 pip install -r requirements.txt
   ```

### Node Dependencies Installation Fails

**Problem**: `npm install` fails with errors.

**Solutions**:

1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Use specific Node version:
   ```bash
   nvm use 18
   npm install
   ```

4. Install with legacy peer deps:
   ```bash
   npm install --legacy-peer-deps
   ```

## Backend Issues

### Backend Won't Start

**Problem**: `uvicorn app.main:app` fails to start.

**Common Causes & Solutions**:

1. **Port already in use**:
   ```bash
   # Find process using port 8000
   lsof -i :8000
   # Kill the process
   kill -9 <PID>
   # Or use a different port
   uvicorn app.main:app --port 8001
   ```

2. **Module import errors**:
   ```bash
   # Ensure you're in the backend directory
   cd backend
   # Set PYTHONPATH
   export PYTHONPATH=$PYTHONPATH:$(pwd)
   ```

3. **Missing environment variables**:
   ```bash
   # Create .env file
   cp .env.example .env
   # Or set directly
   export DATABASE_URL=sqlite:///./data/meditrack.db
   ```

### Database Migration Fails

**Problem**: `alembic upgrade head` fails.

**Solutions**:

1. **Check database connection**:
   ```python
   # Test connection
   from app.db.session import engine
   print(engine.url)
   ```

2. **Reset migrations**:
   ```bash
   # Remove existing database
   rm data/meditrack.db
   # Recreate migrations
   alembic upgrade head
   ```

3. **Fix migration conflicts**:
   ```bash
   # Check current revision
   alembic current
   # Create new migration
   alembic revision --autogenerate -m "fix conflict"
   # Apply migration
   alembic upgrade head
   ```

### API Returns 500 Error

**Problem**: API endpoints return 500 Internal Server Error.

**Debugging Steps**:

1. **Check logs**:
   ```bash
   # Add debug logging
   uvicorn app.main:app --log-level debug
   ```

2. **Test directly**:
   ```python
   # Python console
   from app.main import app
   from app.db.session import SessionLocal
   db = SessionLocal()
   # Test your queries here
   ```

3. **Common fixes**:
   - Check database permissions
   - Verify model relationships
   - Ensure proper error handling

## Frontend Issues

### Frontend Won't Start

**Problem**: `npm start` fails or hangs.

**Solutions**:

1. **Clear cache and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   npm start
   ```

2. **Port conflicts**:
   ```bash
   # Use different port
   PORT=3001 npm start
   ```

3. **React version conflicts**:
   ```bash
   # Check React versions
   npm list react react-dom
   # Update if needed
   npm update react react-dom
   ```

### API Connection Failed

**Problem**: Frontend can't connect to backend API.

**Solutions**:

1. **Check proxy configuration** (`package.json`):
   ```json
   {
     "proxy": "http://localhost:8000"
   }
   ```

2. **CORS issues**:
   ```python
   # In backend/app/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Environment variables**:
   ```bash
   # Create .env in frontend
   REACT_APP_API_URL=http://localhost:8000
   ```

### Build Fails

**Problem**: `npm run build` fails.

**Solutions**:

1. **TypeScript errors**:
   ```bash
   # Check TypeScript errors
   npx tsc --noEmit
   ```

2. **Memory issues**:
   ```bash
   # Increase memory
   NODE_OPTIONS=--max_old_space_size=4096 npm run build
   ```

3. **Dependency issues**:
   ```bash
   # Check for vulnerabilities
   npm audit fix
   ```

## Database Issues

### SQLite Locked Error

**Problem**: "database is locked" error.

**Solutions**:

1. **Close other connections**:
   ```python
   # Ensure proper session cleanup
   db.close()
   ```

2. **Use WAL mode**:
   ```python
   # In app/db/session.py
   engine = create_engine(
       SQLALCHEMY_DATABASE_URL,
       connect_args={"check_same_thread": False},
       pool_pre_ping=True,
       pool_recycle=300
   )
   ```

3. **Switch to PostgreSQL**:
   ```bash
   # For production use
   DATABASE_URL=postgresql://user:password@localhost/meditrack
   ```

### Migration Out of Sync

**Problem**: Database schema doesn't match models.

**Solutions**:

1. **Check current state**:
   ```bash
   alembic current
   alembic history
   ```

2. **Generate new migration**:
   ```bash
   alembic revision --autogenerate -m "sync schema"
   alembic upgrade head
   ```

3. **Reset completely**:
   ```bash
   # Backup data first!
   rm -rf alembic/versions/*
   rm data/meditrack.db
   alembic revision --autogenerate -m "initial"
   alembic upgrade head
   ```

## Docker Issues

### Container Won't Start

**Problem**: Docker containers fail to start.

**Debugging**:

1. **Check logs**:
   ```bash
   docker compose logs backend
   docker compose logs frontend
   ```

2. **Inspect container**:
   ```bash
   docker compose ps
   docker inspect <container_id>
   ```

3. **Common fixes**:
   ```bash
   # Rebuild images
   docker compose build --no-cache
   
   # Remove volumes
   docker compose down -v
   
   # Fresh start
   docker compose up --build
   ```

### Network Connection Issues

**Problem**: Containers can't communicate.

**Solutions**:

1. **Check network**:
   ```bash
   docker network ls
   docker network inspect meditrack_default
   ```

2. **Use service names**:
   ```python
   # Use 'backend' not 'localhost'
   API_URL = "http://backend:8000"
   ```

3. **Expose ports correctly**:
   ```yaml
   services:
     backend:
       ports:
         - "8000:8000"
   ```

### Volume Permission Issues

**Problem**: Permission denied errors.

**Solutions**:

1. **Fix ownership**:
   ```bash
   docker compose exec backend chown -R 1000:1000 /app/data
   ```

2. **Use named volumes**:
   ```yaml
   volumes:
     - meditrack_data:/app/data
   ```

## API Issues

### CORS Errors

**Problem**: Browser shows CORS policy errors.

**Solutions**:

1. **Update CORS middleware**:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Configure properly for production
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Check request headers**:
   ```javascript
   // Ensure correct headers
   axios.defaults.headers.common['Content-Type'] = 'application/json';
   ```

### 404 Not Found

**Problem**: API endpoints return 404.

**Debugging**:

1. **Check route registration**:
   ```bash
   # List all routes
   curl http://localhost:8000/openapi.json | jq '.paths'
   ```

2. **Verify URL path**:
   ```bash
   # Correct: /api/v1/medications/
   # Wrong: /medications/
   ```

3. **Check API prefix**:
   ```python
   # In app/api/api.py
   api_router.include_router(medications.router, prefix="/medications")
   ```

### Validation Errors

**Problem**: 422 Unprocessable Entity errors.

**Solutions**:

1. **Check request payload**:
   ```javascript
   // Log the request
   console.log(JSON.stringify(payload, null, 2));
   ```

2. **Verify schema**:
   ```python
   # Check Pydantic model
   from app.schemas import MedicationCreate
   print(MedicationCreate.schema())
   ```

3. **Test with curl**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/medications/ \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","dosage":"10mg","frequency":"Daily","max_doses_per_day":1}'
   ```

## Performance Issues

### Slow API Responses

**Problem**: API requests take too long.

**Solutions**:

1. **Add database indexes**:
   ```python
   # In models
   __table_args__ = (
       Index('ix_medication_name', 'name'),
   )
   ```

2. **Optimize queries**:
   ```python
   # Use eager loading
   medications = db.query(Medication).options(
       joinedload(Medication.doses)
   ).all()
   ```

3. **Add caching**:
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def get_medication(medication_id: int):
       return db.query(Medication).filter(Medication.id == medication_id).first()
   ```

### High Memory Usage

**Problem**: Application uses too much memory.

**Solutions**:

1. **Limit query results**:
   ```python
   # Add pagination
   medications = db.query(Medication).limit(100).offset(skip).all()
   ```

2. **Close database sessions**:
   ```python
   try:
       # Your code
   finally:
       db.close()
   ```

3. **Monitor memory**:
   ```bash
   # Check memory usage
   docker stats
   ```

## Security Issues

### Vulnerable Dependencies

**Problem**: Security scan shows vulnerabilities.

**Solutions**:

1. **Update dependencies**:
   ```bash
   # Backend
   pip install --upgrade -r requirements.txt
   
   # Frontend
   npm update
   npm audit fix
   ```

2. **Check specific vulnerabilities**:
   ```bash
   # Use safety for Python
   pip install safety
   safety check
   
   # Use npm audit for JavaScript
   npm audit
   ```

### Authentication Issues

**Problem**: Need to secure API endpoints.

**Solutions**:

1. **Implement JWT authentication**:
   ```python
   from fastapi import Depends, HTTPException, status
   from fastapi.security import OAuth2PasswordBearer
   
   oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
   
   def get_current_user(token: str = Depends(oauth2_scheme)):
       # Verify token
       return user
   ```

2. **Add API keys**:
   ```python
   from fastapi import Header
   
   def verify_api_key(x_api_key: str = Header(...)):
       if x_api_key != settings.API_KEY:
           raise HTTPException(status_code=403, detail="Invalid API Key")
   ```

## Deployment Issues

### Environment Variable Issues

**Problem**: App can't find environment variables.

**Solutions**:

1. **Check variable loading**:
   ```python
   import os
   print(os.environ.get('DATABASE_URL'))
   ```

2. **Use python-dotenv**:
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   ```

3. **Docker environment**:
   ```yaml
   environment:
     - DATABASE_URL=${DATABASE_URL}
   ```

### SSL/TLS Issues

**Problem**: HTTPS not working correctly.

**Solutions**:

1. **Let's Encrypt setup**:
   ```bash
   certbot --nginx -d yourdomain.com
   ```

2. **Self-signed certificate**:
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout key.pem -out cert.pem
   ```

3. **Reverse proxy config**:
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
   }
   ```

## Development Issues

### Hot Reload Not Working

**Problem**: Changes don't reflect without restart.

**Solutions**:

1. **Backend hot reload**:
   ```bash
   uvicorn app.main:app --reload --reload-dir app
   ```

2. **Frontend hot reload**:
   ```json
   // In package.json
   {
     "scripts": {
       "start": "CHOKIDAR_USEPOLLING=true react-scripts start"
     }
   }
   ```

3. **Docker development**:
   ```yaml
   volumes:
     - ./backend:/app
     - ./frontend/src:/app/src
   ```

### Test Failures

**Problem**: Tests fail unexpectedly.

**Solutions**:

1. **Isolate test database**:
   ```python
   # In tests/conftest.py
   SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
   ```

2. **Mock external services**:
   ```python
   from unittest.mock import patch
   
   @patch('app.services.external_api')
   def test_something(mock_api):
       mock_api.return_value = {"status": "ok"}
   ```

3. **Debug specific test**:
   ```bash
   pytest -v -s tests/test_medications.py::test_create_medication
   ```

## Getting Help

If you can't resolve your issue:

1. **Search existing issues**: [GitHub Issues](https://github.com/sjafferali/meditrack/issues)
2. **Create detailed issue**:
   - Environment details (OS, versions)
   - Steps to reproduce
   - Error messages/logs
   - What you've tried
3. **Join discussions**: [GitHub Discussions](https://github.com/sjafferali/meditrack/discussions)
4. **Check documentation**: Review all docs in the `/docs` folder

### Useful Commands for Debugging

```bash
# System information
uname -a
python --version
node --version
docker --version

# Check running processes
ps aux | grep -E 'python|node|docker'

# Check ports
netstat -tulpn | grep -E '3000|8000'

# Docker debugging
docker compose logs --tail=50 -f
docker compose exec backend /bin/bash
docker system prune -a  # Clean everything

# Database debugging
sqlite3 data/meditrack.db ".tables"
sqlite3 data/meditrack.db ".schema medications"

# API testing
curl -i http://localhost:8000/api/v1/medications/
curl -i http://localhost:8000/health

# Frontend debugging
npm run build
npx serve -s build
```

Remember to always check logs first - they usually contain the most helpful information for troubleshooting!