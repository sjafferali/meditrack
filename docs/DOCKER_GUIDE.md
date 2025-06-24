# MediTrack Docker Deployment Guide

## Overview

MediTrack is fully containerized with Docker, making deployment consistent across different environments.

## Architecture

- **Backend**: FastAPI application running on Python 3.9
- **Frontend**: React app served by Nginx
- **Database**: SQLite (file-based, persisted via Docker volume)

## Requirements

- Docker Engine 20.10+
- Docker Compose v2.0+
- 1GB RAM minimum
- 2GB disk space

## Quick Start

### Development Mode

```bash
# Build and start all services
# Option 1: Simple deployment with SQLite
docker compose -f docker-compose.simple.yml up --build

# Option 2: Deployment with PostgreSQL  
docker compose -f docker-compose.postgres.yml up --build

# Run in background
docker compose -f docker-compose.simple.yml up -d

# View logs
docker compose -f docker-compose.simple.yml logs -f

# Stop services
docker compose -f docker-compose.simple.yml down
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production Mode

```bash
# Build the single-container image
docker build -t meditrack:latest .

# Start services
# Option 1: Simple deployment with SQLite
docker compose -f docker-compose.simple.yml up -d

# Option 2: Deployment with PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# View logs (example with simple deployment)
docker compose -f docker-compose.simple.yml logs -f

# Stop services (example with simple deployment)
docker compose -f docker-compose.simple.yml down
```

Access:
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:8000

## Docker Images

### Backend Image

```dockerfile
FROM python:3.9-slim
```

Features:
- Lightweight Python 3.9 slim base
- Non-root user for security
- Health check endpoint
- Optimized layer caching

### Frontend Image

```dockerfile
# Multi-stage build
FROM node:16-alpine (build)
FROM nginx:alpine (production)
```

Features:
- Multi-stage build for smaller size
- Nginx for static file serving
- Gzip compression enabled
- Security headers configured

## Volumes

- `backend-data`: Persists SQLite database
- `./backend/data:/app/data`: Development mode database

## Networks

- `meditrack-network`: Internal network for service communication

## Environment Variables

### Backend
- `DATABASE_URL`: SQLite database path
- `ENVIRONMENT`: development/production
- `SECRET_KEY`: Application secret (production)
- `PYTHONUNBUFFERED`: Enable real-time logging

### Frontend
- `NODE_ENV`: development/production
- `REACT_APP_API_URL`: Backend API URL (build-time)

## Security

1. **Non-root users**: Both containers run as non-root
2. **Network isolation**: Services communicate via internal network
3. **Security headers**: Nginx configured with security headers
4. **No exposed secrets**: Use environment variables for sensitive data

## Optimization

### Image Size
- Backend: ~150MB (Python slim + dependencies)
- Frontend: ~25MB (Nginx + static files)

### Caching
- Static assets cached for 1 year
- Docker layer caching for faster builds

### Performance
- Gzip compression for text assets
- Health checks for container monitoring
- Automatic restart on failure (production)

## Troubleshooting

### Container won't start
```bash
# Check logs (example with simple deployment)
docker compose -f docker-compose.simple.yml logs backend
docker compose -f docker-compose.simple.yml logs frontend

# Check container status
docker compose -f docker-compose.simple.yml ps

# Inspect container
docker compose -f docker-compose.simple.yml exec backend sh
```

### Database issues
```bash
# Access database file (example with simple deployment)
docker compose -f docker-compose.simple.yml exec backend ls -la /app/data/

# Reset database
docker compose -f docker-compose.simple.yml down -v
docker compose -f docker-compose.simple.yml up --build
```

### Port conflicts
```bash
# Check if ports are in use
netstat -an | grep -E '(3000|8000|80)'

# Use different ports
# Edit docker-compose.simple.yml or docker-compose.postgres.yml ports section
```

### Build issues
```bash
# Clean build
docker compose down
docker system prune -f
docker compose build --no-cache
```

## Backup and Restore

### Backup database
```bash
# Create backup (example with simple deployment)
docker compose -f docker-compose.simple.yml exec backend cp /app/data/meditrack.db /app/data/meditrack.db.backup

# Copy to host
docker cp $(docker compose -f docker-compose.simple.yml ps -q backend):/app/data/meditrack.db.backup ./backup/
```

### Restore database
```bash
# Copy backup to container (example with simple deployment)
docker cp ./backup/meditrack.db.backup $(docker compose -f docker-compose.simple.yml ps -q backend):/app/data/

# Restore
docker compose -f docker-compose.simple.yml exec backend cp /app/data/meditrack.db.backup /app/data/meditrack.db
```

## Monitoring

### Health checks
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Docker health status (example with simple deployment)
docker compose -f docker-compose.simple.yml ps
```

### Resource usage
```bash
# View resource usage
docker stats

# View detailed info (example with simple deployment)
docker compose -f docker-compose.simple.yml top
```

## Deployment Checklist

- [ ] Build production images
- [ ] Set production environment variables
- [ ] Configure SECRET_KEY
- [ ] Test health endpoints
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Test restore procedure
- [ ] Set up SSL/TLS (reverse proxy)
- [ ] Configure firewall rules
- [ ] Set up log rotation

## Production Recommendations

1. **Use a reverse proxy** (Nginx/Traefik) for SSL termination
2. **Set resource limits** in docker-compose
3. **Use external database** for multi-instance deployments
4. **Implement centralized logging** (ELK stack)
5. **Set up automated backups**
6. **Monitor with Prometheus/Grafana**

## Scaling

For horizontal scaling:
1. Use external database (PostgreSQL/MySQL)
2. Load balance backend instances
3. Use Redis for session storage
4. Implement shared file storage (S3)

## Updates

To update the application:

```bash
# Pull latest code
git pull

# Rebuild images (example with simple deployment)
docker compose -f docker-compose.simple.yml build

# Restart services
docker compose -f docker-compose.simple.yml up -d

# Run migrations if needed
docker compose -f docker-compose.simple.yml exec backend alembic upgrade head
```