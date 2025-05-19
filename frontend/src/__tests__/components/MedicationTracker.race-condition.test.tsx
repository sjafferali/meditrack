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
    mockedMedicationApi.getAll.mockResolvedValueOnce([mockMedication]);

    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });

    // Mock slow API response
    let resolveRecordDose: () => void;
    const recordPromise = new Promise<void>((resolve) => {
      resolveRecordDose = resolve;
    });
    
    mockedDoseApi.recordDoseWithTimezone.mockImplementation(() => {
      return recordPromise.then(() => ({
        id: 100,
        medication_id: 1,
        taken_at: new Date().toISOString()
      }));
    });

    // Mock updated medication state
    mockedMedicationApi.getAll.mockResolvedValueOnce([
      { ...mockMedication, doses_taken_today: 3 }
    ]);

    // Click Take Now button
    const takeNowButton = screen.getByText('Take Now');
    fireEvent.click(takeNowButton);

    // Button should now show "Recording..."
    expect(screen.getByText('Recording...')).toBeInTheDocument();

    // Try clicking again - should not make another API call
    fireEvent.click(takeNowButton);

    // Still only one API call
    expect(mockedDoseApi.recordDoseWithTimezone).toHaveBeenCalledTimes(1);

    // Resolve the promise to complete the recording
    resolveRecordDose!();

    // Wait for the UI to update
    await waitFor(() => {
      expect(screen.getByText('3 of 4')).toBeInTheDocument();
    });

    // Button should be back to normal
    expect(screen.getByText('Take Now')).toBeInTheDocument();
  });

  test('should correctly update progress bar for the right medication', async () => {
    const mockMedications = [
      {
        id: 1,
        name: 'Medication A',
        dosage: '10mg',
        frequency: 'Twice daily',
        max_doses_per_day: 4,
        doses_taken_today: 1,
        last_taken_at: null
      },
      {
        id: 2,
        name: 'Medication B',
        dosage: '20mg',
        frequency: 'Once daily',
        max_doses_per_day: 4,
        doses_taken_today: 0,
        last_taken_at: null
      }
    ];

    mockedMedicationApi.getAll.mockResolvedValueOnce(mockMedications);
    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Medication A')).toBeInTheDocument();
    });
    expect(screen.getByText('Medication B')).toBeInTheDocument();

    // Mock dose recording for Medication B
    mockedDoseApi.recordDoseWithTimezone.mockResolvedValueOnce({
      id: 100,
      medication_id: 2,
      taken_at: new Date().toISOString()
    });

    // Mock updated state
    mockedMedicationApi.getAll.mockResolvedValueOnce([
      mockMedications[0], // Medication A unchanged
      { ...mockMedications[1], doses_taken_today: 1 } // Medication B incremented
    ]);

    // Get all progress texts
    const progressTexts = screen.getAllByText(/\d of \d/);
    expect(progressTexts[0]).toHaveTextContent('1 of 4'); // Medication A
    expect(progressTexts[1]).toHaveTextContent('0 of 4'); // Medication B

    // Click Take Now for Medication B
    const takeButtons = screen.getAllByText('Take Now');
    fireEvent.click(takeButtons[1]); // Second button

    // Wait for update
    await waitFor(() => {
      const updatedProgressTexts = screen.getAllByText(/\d of \d/);
      expect(updatedProgressTexts[1]).toHaveTextContent('1 of 4'); // Medication B updated
    });
    const finalProgressTexts = screen.getAllByText(/\d of \d/);
    expect(finalProgressTexts[0]).toHaveTextContent('1 of 4'); // Medication A unchanged

    // Verify correct medication ID was used
    expect(mockedDoseApi.recordDoseWithTimezone).toHaveBeenCalledWith(
      2, // Medication B
      expect.any(Number)
    );
  });

  test('should disable all dose buttons during recording', async () => {
    const mockMedication = {
      id: 1,
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'Four times daily',
      max_doses_per_day: 4,
      doses_taken_today: 1,
      last_taken_at: null
    };

    mockedMedicationApi.getAll.mockResolvedValueOnce([mockMedication]);
    render(<MedicationTracker />);

    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });

    // Mock slow API response
    let resolveRecordDose: () => void;
    const recordPromise = new Promise<void>((resolve) => {
      resolveRecordDose = resolve;
    });
    
    mockedDoseApi.recordDoseWithTimezone.mockImplementation(() => {
      return recordPromise.then(() => ({
        id: 100,
        medication_id: 1,
        taken_at: new Date().toISOString()
      }));
    });

    // Get the buttons
    const takeNowButton = screen.getByText('Take Now');
    const takeAtTimeButton = screen.getByText('Take at Time');

    // Click Take Now
    fireEvent.click(takeNowButton);

    // Both buttons should be disabled
    expect(takeNowButton).toHaveAttribute('disabled');
    expect(takeAtTimeButton).toHaveAttribute('disabled');

    // Resolve the promise
    resolveRecordDose!();

    // Mock updated state
    mockedMedicationApi.getAll.mockResolvedValueOnce([
      { ...mockMedication, doses_taken_today: 2 }
    ]);

    // Wait for buttons to be enabled again
    await waitFor(() => {
      expect(takeNowButton).not.toHaveAttribute('disabled');
    });
    expect(takeAtTimeButton).not.toHaveAttribute('disabled');
  });
});