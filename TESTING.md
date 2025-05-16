# MediTrack Testing Guide

This guide covers testing setup and procedures for the MediTrack application.

## Backend Testing

### Setup

1. Activate virtual environment:
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. Install test dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running Tests

Run all tests with coverage:
```bash
python -m pytest -v --cov=app --cov-report=term-missing
```

Run specific test file:
```bash
python -m pytest tests/test_models.py -v
```

Run tests by marker:
```bash
pytest -m unit  # Run only unit tests
pytest -m integration  # Run only integration tests
```

### Test Structure

- `/backend/tests/` - Main test directory
  - `conftest.py` - Test fixtures and configuration
  - `test_models.py` - Model unit tests
  - `test_main.py` - Main app tests
  - `/api/` - API endpoint tests
    - `test_medications.py` - Medication endpoint tests
    - `test_doses.py` - Dose endpoint tests

### Test Coverage

Current backend coverage: 98.15%

Coverage thresholds:
- Minimum: 80%
- Target: 95%+

## Frontend Testing

### Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running Tests

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Test Structure

- `/frontend/src/__tests__/` - Main test directory
  - `/services/` - Service tests
    - `api.test.js` - API service tests
  - `/components/` - Component tests
    - `MedicationTracker.test.tsx` - Main component tests
  - `App.test.js` - App component tests

### Testing Libraries

- Jest - Test runner
- React Testing Library - Component testing
- MSW (Mock Service Worker) - API mocking (optional)

## Pre-commit Hooks

Install pre-commit hooks:
```bash
pip install pre-commit
pre-commit install
```

Hooks include:
- Python linting (Black, isort, flake8)
- JS/TS linting
- Test execution
- File formatting

## Writing Tests

### Backend Test Example

```python
@pytest.mark.unit
def test_create_medication(db_session):
    medication = Medication(
        name="Test Med",
        dosage="100mg",
        frequency="Daily",
        max_doses_per_day=1
    )
    db_session.add(medication)
    db_session.commit()
    
    assert medication.id is not None
    assert medication.name == "Test Med"
```

### Frontend Test Example

```typescript
test('renders medication list', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
        expect(screen.getByText(/Medication Tracker/i)).toBeInTheDocument();
    });
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Deployment pipeline

Ensure all tests pass before merging PRs.

## Troubleshooting

### Common Issues

1. **SQLAlchemy async warnings**: Use `waitFor` for async state updates
2. **Import errors**: Check module mocking in test setup
3. **Coverage gaps**: Review uncovered lines in coverage report

### Debug Tips

- Use `pytest -s` to see print statements
- Add `--pdb` flag to drop into debugger on failure
- Check test logs for detailed error messages