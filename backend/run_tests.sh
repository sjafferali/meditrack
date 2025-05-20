#!/bin/bash
# This script sets up a test environment and runs the tests

# Set environment variables for testing
export DATABASE_URL="sqlite:///:memory:"
export TESTING=1

# Run tests with coverage
python -m pytest -v --cov=app --cov-report=xml --cov-report=term-missing