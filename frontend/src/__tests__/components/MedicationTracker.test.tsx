import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MedicationTracker from '../../components/MedicationTracker';
import * as api from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

describe('MedicationTracker', () => {
  const mockMedications = [
    {
      id: 1,
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'twice daily',
      max_doses_per_day: 2,
      instructions: 'Take with food',
      doses_today: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock all API functions
    (api.medicationApi.getAll as jest.Mock).mockResolvedValue(mockMedications);
    (api.medicationApi.create as jest.Mock).mockResolvedValue({});
    (api.medicationApi.update as jest.Mock).mockResolvedValue({});
    (api.medicationApi.delete as jest.Mock).mockResolvedValue({});
    
    (api.doseApi.recordDose as jest.Mock).mockResolvedValue({});
    (api.doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    (api.doseApi.getDailySummary as jest.Mock).mockResolvedValue({ 
      date: '2023-01-01',
      medications: [] 
    });
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
      expect(screen.getByText(/Today: /i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(<MedicationTracker />);
    expect(screen.getByText(/Loading medications/i)).toBeInTheDocument();
  });

  test('displays medications after loading', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
      expect(screen.getByText('10mg')).toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    const errorMessage = 'Failed to load medications';
    (api.medicationApi.getAll as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});