import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MedicationTracker from '../../components/MedicationTracker';
import * as api from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

// Mock date to have consistent test results
const mockDate = new Date('2023-01-15');

describe('MedicationTracker', () => {
  const mockMedications = [
    {
      id: 1,
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'twice daily',
      max_doses_per_day: 2,
      instructions: 'Take with food',
      doses_taken_today: 1,
      last_taken_at: null
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
    (api.doseApi.recordDoseWithTimezone as jest.Mock).mockResolvedValue({});
    (api.doseApi.recordDoseForDate as jest.Mock).mockResolvedValue({});
    (api.doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    (api.doseApi.deleteDose as jest.Mock).mockResolvedValue(true);
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
      // Look for the Today text in the green badge when today's date is selected
      expect(screen.getByText('Today')).toBeInTheDocument();
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
    });
    expect(screen.getByText('10mg')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    const errorMessage = 'Failed to load medications';
    (api.medicationApi.getAll as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('displays Show History button for each medication', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Show History')).toBeInTheDocument();
    });
  });

  test('opens dose history when Show History button is clicked', async () => {
    render(<MedicationTracker />);
    
    const historyButton = await screen.findByText('Show History');
    fireEvent.click(historyButton);
    
    // The history section should expand showing the dose history
    await waitFor(() => {
      expect(screen.getByText('Dose History')).toBeInTheDocument();
    });
    
    // The button should change to Hide History
    expect(screen.getByText('Hide History')).toBeInTheDocument();
  });

  test('displays date navigation controls', async () => {
    render(<MedicationTracker />);
    
    // Wait for component to load medications first
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Check for navigation buttons
    expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
    expect(screen.getByLabelText('Next day')).toBeInTheDocument();
    
    // Check for date input
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInput).toBeInTheDocument();
  });

  test('navigates to previous day when prev button clicked', async () => {
    render(<MedicationTracker />);
    
    const prevButton = await screen.findByLabelText('Previous day');
    fireEvent.click(prevButton);
    
    // Medications should be reloaded with the previous date
    expect(api.medicationApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ date: expect.any(String) })
    );
  });

  test('navigates to next day when next button clicked', async () => {
    render(<MedicationTracker />);
    
    const nextButton = await screen.findByLabelText('Next day');
    fireEvent.click(nextButton);
    
    // Medications should be reloaded with the next date
    expect(api.medicationApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ date: expect.any(String) })
    );
  });

  test('updates date when date input changes', async () => {
    render(<MedicationTracker />);
    
    const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2023-01-10' } });
    
    // Medications should be reloaded with the selected date
    expect(api.medicationApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2023-01-10' })
    );
  });

  test('displays Today indicator for current date', async () => {
    const originalDate = global.Date;
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = originalDate.now;
    
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
    
    global.Date = originalDate;
  });

  test('displays Past indicator for past dates', async () => {
    render(<MedicationTracker />);
    
    const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2022-01-10' } });
    
    await waitFor(() => {
      expect(screen.getByText('Past')).toBeInTheDocument();
    });
  });

  test('disables Take Now button for future dates', async () => {
    render(<MedicationTracker />);
    
    const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2025-01-10' } });
    
    // Wait for API call and re-render
    await waitFor(() => {
      expect(api.medicationApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2025-01-10' })
      );
    });
    
    await waitFor(() => {
      // For future dates, there should not be a Take Now button
      const buttons = screen.getAllByRole('button');
      const takeNowButton = buttons.find(btn => btn.textContent === 'Take Now');
      expect(takeNowButton).toBeUndefined();
    });
  });

  test('shows Record Dose for past dates', async () => {
    render(<MedicationTracker />);
    
    const dateInput = await screen.findByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2022-01-10' } });
    
    await waitFor(() => {
      expect(screen.getByText('Record Dose')).toBeInTheDocument();
    });
  });

  test('shows time picker modal when recording dose for past dates', async () => {
    // Mock toTimeString to control the time format
    const mockToTimeString = jest.fn(() => '14:30:00 GMT+0000');
    const originalDate = global.Date;
    
    jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
      const date = args.length > 0 ? new originalDate(args[0]) : new originalDate();
      if (args.length === 0) {
        // For new Date() without arguments, return our mocked time
        date.toTimeString = mockToTimeString;
      }
      return date;
    });
    
    render(<MedicationTracker />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Change to a past date
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2023-01-10' } });
    
    // Wait for medications to reload
    await waitFor(() => {
      expect(api.medicationApi.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2023-01-10' })
      );
    });
    
    // Wait for the "Record Dose" button to appear
    await waitFor(() => {
      expect(screen.getByText('Record Dose')).toBeInTheDocument();
    });
    
    // Clear any previous calls to recordDoseForDate
    (api.doseApi.recordDoseForDate as jest.Mock).mockClear();
    
    // Click the Record Dose button
    const recordButton = screen.getByText('Record Dose');
    fireEvent.click(recordButton);
    
    // Should show time picker modal for past dates
    await waitFor(() => {
      expect(screen.getByText('Select Time for Dose')).toBeInTheDocument();
    });
    
    // Restore the original Date
    jest.restoreAllMocks();
  });

  test('deletes dose when delete button is clicked', async () => {
    const mockDoseHistory = [
      {
        id: 123,
        medication_id: 1,
        taken_at: '2023-01-15T10:00:00Z'
      }
    ];
    (api.doseApi.getDoses as jest.Mock).mockResolvedValue(mockDoseHistory);
    
    render(<MedicationTracker />);
    
    // Wait for medications to load
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Click Show History button
    const historyButton = screen.getByText('Show History');
    fireEvent.click(historyButton);
    
    // Wait for dose history to load
    await waitFor(() => {
      expect(screen.getByText('Dose History')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    
    // Click Delete button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    // Verify deleteDose was called
    await waitFor(() => {
      expect(api.doseApi.deleteDose).toHaveBeenCalledWith(123);
    });
  });

  test('shows time picker modal for past dates', async () => {
    render(<MedicationTracker />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Change to a past date (not today)
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2023-01-10' } });
    
    // Wait for medications to reload
    await waitFor(() => {
      expect(screen.getByText('Record Dose')).toBeInTheDocument();
    });
    
    // Click Record Dose button
    const recordButton = screen.getByText('Record Dose');
    fireEvent.click(recordButton);
    
    // Time picker modal should appear
    await waitFor(() => {
      expect(screen.getByText('Select Time for Dose')).toBeInTheDocument();
      expect(screen.getByLabelText('Time:')).toBeInTheDocument();
    });
  });

  test('records dose with custom time', async () => {
    render(<MedicationTracker />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Change to a past date
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(dateInput, { target: { value: '2023-01-10' } });
    
    // Wait for Record Dose button
    await waitFor(() => {
      expect(screen.getByText('Record Dose')).toBeInTheDocument();
    });
    
    // Click Record Dose
    const recordButton = screen.getByText('Record Dose');
    fireEvent.click(recordButton);
    
    // Wait for time picker modal
    await waitFor(() => {
      expect(screen.getByText('Select Time for Dose')).toBeInTheDocument();
    });
    
    // Set custom time - time inputs in React have display value in the format HH:MM
    const timeInput = screen.getByDisplayValue(/\d{2}:\d{2}/);
    fireEvent.change(timeInput, { target: { value: '09:30' } });
    
    // Click Record Dose in modal
    const modalRecordButton = screen.getByRole('button', { name: 'Record Dose' });
    fireEvent.click(modalRecordButton);
    
    // Verify recordDoseForDate was called with custom time
    await waitFor(() => {
      expect(api.doseApi.recordDoseForDate).toHaveBeenCalledWith(
        1,
        '2023-01-10',
        '09:30'
      );
    });
  });
});