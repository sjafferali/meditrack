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
    (api.doseApi.recordDoseForDate as jest.Mock).mockResolvedValue({});
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

  test('displays History button for each medication', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
    });
  });

  test('opens dose history modal when History button is clicked', async () => {
    render(<MedicationTracker />);
    
    const historyButton = await screen.findByText('History');
    fireEvent.click(historyButton);
    
    // The modal should open showing the dose history title
    await waitFor(() => {
      expect(screen.getByText('Dose History - Test Medication')).toBeInTheDocument();
    });
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

  test('uses browser current time when recording dose for past dates', async () => {
    // Mock toTimeString to control the time format
    const mockToTimeString = jest.fn(() => '14:30:00 GMT+0000');
    const originalDate = global.Date;
    
    jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
      const date = new originalDate(...args);
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
    
    // Verify recordDoseForDate was called with current browser time
    await waitFor(() => {
      expect(api.doseApi.recordDoseForDate).toHaveBeenCalledWith(
        1, // medication ID
        '2023-01-10', // selected date
        '14:30' // current browser time in HH:MM format (first 5 characters of toTimeString)
      );
    });
    
    // Restore the original Date
    jest.restoreAllMocks();
  });
});