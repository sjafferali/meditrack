# Docker Compose File Cleanup Summary

## Overview

This document summarizes the cleanup of docker-compose file references in the MediTrack project. The project now uses only two docker-compose files:
- `docker-compose.simple.yml` - For SQLite deployment (simple, single-container setup)
- `docker-compose.postgres.yml` - For PostgreSQL deployment

## Files Updated

### 1. README.md
- Updated "Using Docker" section to reference only the two supported docker-compose files
- Removed references to `docker-compose.yml`, `docker-compose.prod.yml`, and `docker-compose.test.yml`
- Updated production deployment section to use the simple or postgres configurations

### 2. docs/DEPLOYMENT.md
- Updated all deployment instructions to use the supported docker-compose files
- Removed the creation of `docker-compose.prod.yml` from instructions
- Updated all docker commands to specify the appropriate compose file
- Updated monitoring and maintenance sections to include the `-f` flag

### 3. DOCKER_GUIDE.md
- Updated development and production mode sections
- Changed all docker compose commands to explicitly specify the compose file
- Updated troubleshooting section with the new commands
- Updated backup/restore procedures to use the appropriate compose file

### 4. DEPLOYMENT.md (root level)
- Updated deployment instructions to use docker-compose.simple.yml or docker-compose.postgres.yml
- Removed references to copying docker-compose.prod.yml
- Updated all docker stack deployment commands

### 5. DEVELOPMENT_PROMPTS.md
- Updated the Docker setup prompt to reference the actual docker-compose files
- Changed instructions from creating docker-compose.prod.yml to updating existing files

### 6. TASKS.md
- Updated the containerization task list to reflect the actual docker-compose files created

### 7. docs/ARCHITECTURE.md
- Updated the directory structure to show the actual docker-compose files
- Removed reference to generic docker-compose.yml

### 8. backend/MIGRATIONS.md
- Updated production deployment instructions to use the appropriate docker-compose file

## Summary of Changes

All references to the following docker-compose files have been removed:
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker-compose.test.yml`

They have been replaced with references to:
- `docker-compose.simple.yml` - For SQLite deployment
- `docker-compose.postgres.yml` - For PostgreSQL deployment

This cleanup ensures that the documentation accurately reflects the actual docker-compose files available in the project and prevents confusion for users trying to deploy MediTrack.