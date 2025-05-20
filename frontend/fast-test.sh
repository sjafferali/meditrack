#!/bin/bash

# Run tests in CI mode (non-interactive, with 30-second timeout from jest.config.js)
npm run test:ci -- "$@"