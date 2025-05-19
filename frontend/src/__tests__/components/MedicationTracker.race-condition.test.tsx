import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MedicationTracker from '../../components/MedicationTracker';
import { medicationApi, doseApi, personApi } from '../../services/api';

// Mock the API modules
jest.mock('../../services/api');

// Mock the DailyDoseLog component
jest.mock('../../components/DailyDoseLog', () => {
  return function MockDailyDoseLog() {
    return <div>Mock Daily Dose Log</div>;
  };
});

// Mock PersonSelector and PersonManager to avoid their internal state management issues
jest.mock('../../components/PersonSelector', () => {
  const React = require('react');
  return function PersonSelector({ currentPersonId, onPersonChange }: any) {
    React.useEffect(() => {
      if (!currentPersonId) {
        // Simulate selecting the default person
        setTimeout(() => onPersonChange(1), 0);
      }
    }, [currentPersonId, onPersonChange]);
    
    return React.createElement('div', null, 
      React.createElement('button', null, 'Test Person')
    );
  };
});

jest.mock('../../components/PersonManager', () => {
  return function PersonManager() {
    return null;
  };
});

// Mock date to have consistent test results
const mockDate = new Date('2023-01-15T00:00:00.000Z');

const mockedMedicationApi = medicationApi as jest.Mocked<typeof medicationApi>;
const mockedDoseApi = doseApi as jest.Mocked<typeof doseApi>;
const mockedPersonApi = personApi as jest.Mocked<typeof personApi>;

describe('MedicationTracker - Race Condition Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock person API to return a default person
    mockedPersonApi.getAll.mockResolvedValue([
      { id: 1, name: 'Test Person', is_default: true, medication_count: 1 }
    ]);
    
    // Mock Date object for consistent testing
    jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
      return date ? new Date(date) : mockDate;
    }) as any;
    Date.now = jest.fn(() => mockDate.getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should prevent multiple simultaneous recordings for the same medication', async () => {
    const mockMedication = {
      id: 1,
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'Four times daily',
      max_doses_per_day: 4,
      doses_taken_today: 2,
      last_taken_at: null
    };

    // Initial load
    mockedMedicationApi.getAll.mockResolvedValue([mockMedication]);

    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });

    // Mock slow API response
    let resolvePromise: any;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    // First call is slow, second call should be prevented
    mockedDoseApi.recordDose.mockImplementationOnce(() => slowPromise);

    // Find and click Take Now button
    const takeNowButton = screen.getByText('Take Now');
    
    // Trigger multiple clicks rapidly
    fireEvent.click(takeNowButton);
    fireEvent.click(takeNowButton);
    fireEvent.click(takeNowButton);

    // API should only be called once
    expect(mockedDoseApi.recordDose).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise({});

    // Wait for state to settle
    await waitFor(() => {
      expect(mockedMedicationApi.getAll).toHaveBeenCalledTimes(2); // Initial + after dose recorded
    });
  });

  test('should correctly update progress bar for the right medication', async () => {
    const mockMedications = [
      {
        id: 1,
        name: 'Medication A',
        dosage: '10mg',
        frequency: 'Twice daily',
        max_doses_per_day: 2,
        doses_taken_today: 0,
        last_taken_at: null
      },
      {
        id: 2,
        name: 'Medication B',
        dosage: '20mg',
        frequency: 'Once daily',
        max_doses_per_day: 1,
        doses_taken_today: 0,
        last_taken_at: null
      }
    ];

    // Initial load
    mockedMedicationApi.getAll.mockResolvedValueOnce([...mockMedications]);

    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Medication A')).toBeInTheDocument();
    });
    expect(screen.getByText('Medication B')).toBeInTheDocument();

    // Mock response after recording dose for Medication A
    const updatedMedications = [
      { ...mockMedications[0], doses_taken_today: 1 },
      { ...mockMedications[1] }
    ];
    
    mockedDoseApi.recordDose.mockResolvedValueOnce({});
    mockedMedicationApi.getAll.mockResolvedValueOnce([...updatedMedications]);

    // Record dose for Medication A
    const medicationAButtons = screen.getAllByText('Take Now');
    fireEvent.click(medicationAButtons[0]);

    await waitFor(() => {
      expect(mockedDoseApi.recordDose).toHaveBeenCalledWith(1);
    });

    // Check that the progress is shown correctly
    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2 doses taken today/)).toBeInTheDocument();
    });
  });

  test('should disable all dose buttons during recording', async () => {
    const mockMedication = {
      id: 1,
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'Twice daily',
      max_doses_per_day: 2,
      doses_taken_today: 0,
      last_taken_at: null
    };

    // Initial load
    mockedMedicationApi.getAll.mockResolvedValueOnce([mockMedication]);

    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });

    // Mock slow API response
    let resolvePromise: any;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockedDoseApi.recordDose.mockImplementationOnce(() => slowPromise);

    // Click Take Now button
    const takeNowButton = screen.getByText('Take Now');
    fireEvent.click(takeNowButton);

    // Button should show "Recording..." and be disabled
    await waitFor(() => {
      expect(screen.getByText('Recording...')).toBeInTheDocument();
    });

    // All dose buttons should be disabled (the recording button)
    const recordingButton = screen.getByText('Recording...');
    expect(recordingButton).toBeDisabled();

    // Resolve the promise
    resolvePromise({});
    mockedMedicationApi.getAll.mockResolvedValueOnce([
      { ...mockMedication, doses_taken_today: 1 }
    ]);

    // Wait for state to update
    await waitFor(() => {
      expect(screen.queryByText('Recording...')).not.toBeInTheDocument();
    });
  });
});