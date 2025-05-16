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

  test('applies correct CSS classes for styling', () => {
    const { container } = render(<App />);
    
    // Check for main App container
    expect(container.firstChild).toHaveClass('App');
  });
});