import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MedicationTracker from '../../components/MedicationTracker';

// Mock the API module
jest.mock('../../services/api', () => ({
  medicationApi: {
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  doseApi: {
    recordDose: jest.fn(),
    getDoses: jest.fn(),
    getDailySummary: jest.fn().mockResolvedValue({ 
      date: '2023-01-01',
      medications: [] 
    }),
  },
}));

describe('MedicationTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', async () => {
    render(<MedicationTracker />);
    // Component should show loading then render content
    expect(screen.getByText(/Loading medications/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Medication Tracker/i)).toBeInTheDocument();
    });
  });

  test('renders date', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText(/Today:/i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(<MedicationTracker />);
    expect(screen.getByText(/Loading medications/i)).toBeInTheDocument();
  });
});