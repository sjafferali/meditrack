# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Python Environment

- **ALWAYS** run all Python and pip commands within a virtual environment
- Activate virtualenv before running any python/pip commands: `source venv/bin/activate`
- Never install packages globally

## Testing
- **ALWAYS** run all tests after making any changes, and ensure they pass.
- Ensure all new functionality is covered by tests both the frontend and backend.
- Use ./run_ci_checks.sh to run all tests

## Commit and Push
- **ALWAYS** commit and push your changes to the main branch after you have verified that all tests pass.
