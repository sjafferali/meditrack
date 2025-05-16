# MediTrack CI/CD Pipeline

This document describes the continuous integration and deployment pipeline for MediTrack.

## Overview

The CI/CD pipeline ensures code quality, security, and automated deployment through:
- Automated testing
- Code quality checks
- Security scanning
- Dependency management
- Docker image building

## Workflows

### CI Pipeline (`ci.yml`)

Runs on every push to main/develop and pull requests.

#### Jobs:

1. **Backend Tests**
   - Python 3.11
   - pytest with coverage
   - Uploads to Codecov

2. **Frontend Tests**
   - Node.js 18
   - Jest with coverage
   - Uploads to Codecov

3. **Backend Linting**
   - Black (code formatting)
   - isort (import sorting)
   - Flake8 (linting)
   - MyPy (type checking)

4. **Frontend Linting**
   - ESLint
   - TypeScript compiler check

5. **Security Scan**
   - Trivy vulnerability scanner
   - Scans filesystem for vulnerabilities
   - Uploads results to GitHub Security tab

6. **Dependency Check**
   - Python: safety
   - Node.js: npm audit

7. **Docker Build**
   - Builds and pushes images
   - Only runs on main/develop push
   - Requires all other jobs to pass

### Security Workflow (`security.yml`)

Runs weekly and on manual trigger.

#### Jobs:

1. **Trivy Scan**
   - Comprehensive vulnerability scanning
   - SARIF report generation

2. **CodeQL Analysis**
   - Analyzes Python and JavaScript
   - Detects security vulnerabilities
   - Code quality issues

3. **Dependency Review**
   - pip-audit for Python
   - npm audit for JavaScript

### Docker Build Workflow (`docker-build.yml`)

Builds and pushes Docker images on main branch pushes.

## Dependency Management

### Dependabot Configuration

Automated dependency updates for:
- Python packages (weekly)
- npm packages (weekly)
- GitHub Actions (monthly)
- Docker base images (monthly)

Settings:
- Auto-creates pull requests
- Adds labels for easy identification
- Conventional commit messages

## Code Quality Tools

### Python
- **Black**: Code formatting (88 char line length)
- **isort**: Import sorting (Black compatible)
- **Flake8**: Linting
- **MyPy**: Static type checking

Configuration in:
- `backend/pyproject.toml`
- `backend/.flake8`

### JavaScript/TypeScript
- **ESLint**: Linting
- **TypeScript**: Type checking

Configuration in:
- `frontend/.eslintrc`
- `frontend/tsconfig.json`

## Security Scanning

### Trivy
- Scans for CVEs
- Checks dependencies
- Docker image scanning

### CodeQL
- Semantic code analysis
- Security vulnerability detection
- Code quality issues

### Dependency Security
- `safety` for Python
- `npm audit` for JavaScript
- `pip-audit` for Python packages

## Coverage Reporting

- Backend: pytest-cov → Codecov
- Frontend: Jest coverage → Codecov
- Coverage badges in README
- Minimum coverage: 80%

## Status Badges

The README displays:
- CI Pipeline status
- Security scan status
- Code coverage
- License

## Pre-commit Hooks

Local development includes:
- Python formatting/linting
- Test execution
- File cleanup

Install with:
```bash
pip install pre-commit
pre-commit install
```

## Secrets Required

Add these secrets to GitHub repository:
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `CODECOV_TOKEN`: Codecov upload token

## Future Enhancements

1. Add performance testing
2. Implement smoke tests
3. Add deployment automation
4. Set up staging environment
5. Add notification system

## Troubleshooting

### Common Issues

1. **Docker build fails**: Check Buildx setup
2. **Tests timeout**: Increase job timeout
3. **Coverage drops**: Check new code coverage
4. **Security alerts**: Review and update dependencies

### Debug Tips

- Check workflow logs in Actions tab
- Review security alerts in Security tab
- Monitor Dependabot PRs
- Check coverage reports in Codecov