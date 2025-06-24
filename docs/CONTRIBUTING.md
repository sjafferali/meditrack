# Contributing to MediTrack

Thank you for your interest in contributing to MediTrack! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [How to Contribute](#how-to-contribute)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)
9. [Issue Guidelines](#issue-guidelines)
10. [Community](#community)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/meditrack.git
   cd meditrack
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/sjafferali/meditrack.git
   ```
4. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- Git

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies

# Setup database
alembic upgrade head

# Run tests
pytest

# Start development server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm test
npm start
```

### Using Docker

```bash
# Start both frontend and backend
docker compose up

# Run tests in Docker
docker compose exec backend pytest
docker compose exec frontend npm test
```

## How to Contribute

### Types of Contributions

1. **Bug Reports**: Report issues you find
2. **Bug Fixes**: Submit PRs to fix reported issues  
3. **Features**: Propose and implement new features
4. **Documentation**: Improve or add documentation
5. **Tests**: Add or improve test coverage
6. **Performance**: Optimize code performance
7. **Refactoring**: Improve code quality

### Development Workflow

1. **Check existing issues** to avoid duplicates
2. **Create an issue** if none exists for your contribution
3. **Get feedback** on your proposed changes
4. **Write code** following our standards
5. **Write tests** for your changes
6. **Update documentation** as needed
7. **Submit a pull request**

### Working on Issues

- Look for issues labeled `good first issue` or `help wanted`
- Comment on an issue to claim it
- Ask questions if you need clarification
- Update the issue with your progress

## Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:
   ```bash
   # Backend
   cd backend
   pytest
   black --check .
   isort --check-only .
   flake8 .
   mypy app/
   
   # Frontend
   cd frontend
   npm test
   npm run lint
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

5. **Update CHANGELOG.md** with your changes

### Submitting a Pull Request

1. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub

3. **Fill out the PR template** completely

4. **Link related issues** using keywords like "Fixes #123"

5. **Wait for review** and address feedback

### PR Requirements

- Clear, descriptive title
- Detailed description of changes
- Tests for new functionality
- Documentation updates
- No linting errors
- All tests passing
- Follows coding standards

## Coding Standards

### Python (Backend)

1. **Style Guide**: Follow [PEP 8](https://pep8.org/)
2. **Formatting**: Use Black with default settings
3. **Import Sorting**: Use isort
4. **Type Hints**: Add type hints for all functions
5. **Docstrings**: Use Google-style docstrings

Example:
```python
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Medication
from app.schemas import MedicationCreate


def create_medication(
    db: Session, 
    medication: MedicationCreate
) -> Medication:
    """Create a new medication.
    
    Args:
        db: Database session
        medication: Medication data to create
        
    Returns:
        Created medication instance
        
    Raises:
        HTTPException: If medication already exists
    """
    existing = db.query(Medication).filter(
        Medication.name == medication.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Medication already exists"
        )
    
    db_medication = Medication(**medication.dict())
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    
    return db_medication
```

### JavaScript/React (Frontend)

1. **Style Guide**: Use ESLint configuration
2. **Formatting**: Use Prettier
3. **Component Structure**: Use functional components with hooks
4. **Props**: Define PropTypes or use TypeScript
5. **File Naming**: Use PascalCase for components

Example:
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const MedicationList = ({ onEdit, onDelete }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await axios.get('/api/v1/medications/');
      setMedications(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="medication-list">
      {medications.map(medication => (
        <MedicationCard
          key={medication.id}
          medication={medication}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

MedicationList.propTypes = {
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default MedicationList;
```

### General Principles

1. **DRY** (Don't Repeat Yourself)
2. **KISS** (Keep It Simple, Stupid)
3. **YAGNI** (You Aren't Gonna Need It)
4. **Clean Code**: Readable, maintainable, testable
5. **Meaningful Names**: Use descriptive variable and function names
6. **Small Functions**: Each function should do one thing
7. **Error Handling**: Handle errors gracefully
8. **Comments**: Write self-documenting code, comment only when necessary

## Testing Guidelines

### Backend Testing

1. **Test Structure**:
   ```python
   def test_meaningful_name(self, client, db_session):
       # Arrange
       test_data = {...}
       
       # Act
       response = client.post("/endpoint", json=test_data)
       
       # Assert
       assert response.status_code == 201
       assert response.json()["field"] == expected_value
   ```

2. **Test Coverage**: Aim for >80% coverage
3. **Test Types**:
   - Unit tests for individual functions
   - Integration tests for API endpoints
   - Database tests with transactions

4. **Fixtures**: Use pytest fixtures for common setup

### Frontend Testing

1. **Test Structure**:
   ```javascript
   describe('Component', () => {
     it('should render correctly', () => {
       const { getByText } = render(<Component />);
       expect(getByText('Expected Text')).toBeInTheDocument();
     });
     
     it('should handle user interaction', async () => {
       const { getByRole } = render(<Component />);
       fireEvent.click(getByRole('button'));
       await waitFor(() => {
         expect(mockFunction).toHaveBeenCalled();
       });
     });
   });
   ```

2. **Test Types**:
   - Component rendering tests
   - User interaction tests
   - Integration tests
   - Snapshot tests (sparingly)

3. **Mock External Dependencies**: Mock API calls and external services

## Documentation

### When to Update Documentation

- Adding new features
- Changing API endpoints
- Modifying configuration
- Updating dependencies
- Changing deployment process

### Documentation Standards

1. **Clear and Concise**: Write for developers of all levels
2. **Examples**: Include code examples
3. **Up-to-date**: Keep documentation current with code
4. **Formatting**: Use proper Markdown formatting
5. **Screenshots**: Add screenshots for UI changes

### Types of Documentation

1. **Code Comments**: Explain complex logic
2. **API Documentation**: Update OpenAPI specs
3. **README**: Keep installation steps current
4. **Architecture**: Document design decisions
5. **User Guide**: Update for UI changes

## Issue Guidelines

### Creating Issues

1. **Search First**: Check if issue already exists
2. **Use Templates**: Fill out issue templates completely
3. **Be Specific**: Provide detailed information
4. **Include Examples**: Add code samples or screenshots
5. **Environment Info**: Include OS, versions, etc.

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested
- `duplicate`: This issue already exists
- `invalid`: This doesn't seem right
- `wontfix`: This will not be worked on

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **Pull Requests**: Code contributions and reviews

### Getting Help

1. Check the documentation
2. Search existing issues
3. Ask in GitHub Discussions
4. Be patient and respectful

### Code Reviews

- Be constructive and respectful
- Explain your reasoning
- Suggest improvements
- Ask questions
- Approve when satisfied

## Recognition

Contributors will be:
- Listed in the project's contributors section
- Mentioned in release notes for significant contributions
- Given credit in the documentation

## Version Control

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(api): add medication search endpoint

- Add search functionality to medications API
- Support filtering by name and dosage
- Include pagination

Closes #123
```

### Branch Naming

- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation changes
- `refactor/description`: Code refactoring
- `test/description`: Test additions/changes

## Development Tips

1. **Start Small**: Make incremental changes
2. **Test Locally**: Always test before pushing
3. **Ask Questions**: Don't hesitate to ask for help
4. **Be Patient**: Reviews may take time
5. **Stay Positive**: We're all here to help

## License

By contributing to MediTrack, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to MediTrack! 🎉