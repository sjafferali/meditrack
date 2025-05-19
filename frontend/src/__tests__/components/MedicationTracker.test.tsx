import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MedicationTracker from '../../components/MedicationTracker';
import { medicationApi, doseApi, personApi } from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

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

// Mock DailyDoseLog to simplify tests
jest.mock('../../components/DailyDoseLog', () => {
  return function DailyDoseLog() {
    return <div>Daily Dose Log</div>;
  };
});

// Mock date to have consistent test results
const mockDate = new Date('2023-01-15T00:00:00.000Z');

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
    (medicationApi.getAll as jest.Mock).mockResolvedValue(mockMedications);
    (medicationApi.create as jest.Mock).mockResolvedValue({});
    (medicationApi.update as jest.Mock).mockResolvedValue({});
    (medicationApi.delete as jest.Mock).mockResolvedValue({});
    
    (doseApi.recordDose as jest.Mock).mockResolvedValue({});
    (doseApi.recordDoseWithTimezone as jest.Mock).mockResolvedValue({});
    (doseApi.recordDoseForDate as jest.Mock).mockResolvedValue({});
    (doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    (doseApi.deleteDose as jest.Mock).mockResolvedValue(true);
    (doseApi.getDailySummary as jest.Mock).mockResolvedValue({ 
      date: '2023-01-01',
      medications: [] 
    });
    
    // Mock person API
    (personApi.getAll as jest.Mock).mockResolvedValue([
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

  test('renders without crashing', async () => {
    render(<MedicationTracker />);
    
    // Component should show loading then render content
    expect(screen.getByText(/Loading medications/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Medication Tracker/i)).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(<MedicationTracker />);
    expect(screen.getByText(/Loading medications/i)).toBeInTheDocument();
  });

  test('displays medications after loading', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(medicationApi.getAll).toHaveBeenCalledWith(expect.objectContaining({
        person_id: 1
      }));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    expect(screen.getByText('10mg')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    const errorMessage = 'Failed to load medications';
    (medicationApi.getAll as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
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

  test('displays daily dose log button', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Daily Dose Log')).toBeInTheDocument();
  });

  test('handles add medication form', async () => {
    render(<MedicationTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Medication')).toBeInTheDocument();
    });
    
    // Click Add Medication button
    const addButton = screen.getByText('Add Medication');
    fireEvent.click(addButton);
    
    // Form should appear
    expect(screen.getByText('Add New Medication')).toBeInTheDocument();
    expect(screen.getByLabelText('Name:')).toBeInTheDocument();
    expect(screen.getByLabelText('Dosage:')).toBeInTheDocument();
  });
});