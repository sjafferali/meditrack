import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the MedicationTracker component to simplify testing
jest.mock('../components/MedicationTracker', () => {
  return function MockMedicationTracker() {
    return <div data-testid="medication-tracker">Mock MedicationTracker</div>;
  };
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders MedicationTracker component', () => {
    render(<App />);
    
    expect(screen.getByTestId('medication-tracker')).toBeInTheDocument();
  });

  test('renders with correct structure', () => {
    render(<App />);
    
    // Since we have the medication-tracker test-id, we can verify the App component renders
    // without directly accessing DOM nodes
    expect(screen.getByTestId('medication-tracker')).toBeInTheDocument();
  });
});