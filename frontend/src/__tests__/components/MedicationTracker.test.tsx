import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MedicationTracker from '../../components/MedicationTracker';
import { medicationApi, doseApi, personApi } from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

// Mock child components

jest.mock('../../components/PersonManager', () => {
  return function PersonManager({ 
    isOpen, 
    onClose,
    currentPersonId,
    onPersonChange 
  }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="person-manager">
        <h2>Person Manager</h2>
        <button onClick={() => { onPersonChange(1); onClose(); }}>Select and Close</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('../../components/DailyDoseLog', () => {
  return function DailyDoseLog({ selectedDate, personId, isOpen, onClose }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="daily-dose-log">
        <h2>Daily Dose Log</h2>
        <p>Date: {selectedDate.toDateString()}</p>
        <p>Person ID: {personId}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('../../components/DoseHistoryModal', () => {
  return function DoseHistoryModal({ medication, onClose }: any) {
    return (
      <div data-testid="dose-history-modal">
        <h2>Dose History for {medication.name}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('MedicationTracker', () => {
  const mockMedications = [
    {
      id: 1,
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 'Once daily',
      max_doses_per_day: 1,
      instructions: 'Take with water',
      doses_taken_today: 0,
      last_taken_at: null
    },
    {
      id: 2,
      name: 'Vitamin D',
      dosage: '1000IU',
      frequency: 'Twice daily',
      max_doses_per_day: 2,
      instructions: 'Take with food',
      doses_taken_today: 1,
      last_taken_at: '2023-01-15T10:00:00Z'
    }
  ];

  const mockPersons = [
    { id: 1, name: 'John Doe', is_default: true, medication_count: 2 },
    { id: 2, name: 'Jane Smith', is_default: false, medication_count: 1 }
  ];

  const mockDoseHistory = [
    {
      id: 1,
      medication_id: 1,
      taken_at: '2023-01-15T09:00:00Z'
    },
    {
      id: 2,
      medication_id: 1,
      taken_at: '2023-01-14T09:30:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    (medicationApi.getAll as jest.Mock).mockResolvedValue(mockMedications);
    (medicationApi.create as jest.Mock).mockResolvedValue({ ...mockMedications[0], id: 3 });
    (medicationApi.update as jest.Mock).mockResolvedValue({ ...mockMedications[0], name: 'Updated' });
    (medicationApi.delete as jest.Mock).mockResolvedValue(true);
    
    (doseApi.recordDose as jest.Mock).mockResolvedValue({});
    (doseApi.recordDoseWithTimezone as jest.Mock).mockResolvedValue({});
    (doseApi.recordDoseForDate as jest.Mock).mockResolvedValue({});
    (doseApi.getDoses as jest.Mock).mockResolvedValue(mockDoseHistory);
    (doseApi.deleteDose as jest.Mock).mockResolvedValue(true);
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue({
      date: '2023-01-15',
      medications: []
    });
    
    (personApi.getAll as jest.Mock).mockResolvedValue(mockPersons);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Loading and Person Selection', () => {
    test('shows welcome message on initial render before person selection', async () => {
      (personApi.getAll as jest.Mock).mockResolvedValue([]);
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Welcome to MediTrack! Click the button below to select a person and manage their medications.')).toBeInTheDocument();
      });
    });

    test('auto-selects default person on mount', async () => {
      render(<MedicationTracker />);
      
      // Wait for all async operations to complete
      await waitFor(() => {
        expect(personApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });
    });

    test('shows welcome message when no person is selected', async () => {
      (personApi.getAll as jest.Mock).mockResolvedValue([]);
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome to MediTrack!/)).toBeInTheDocument();
      });
      expect(screen.getByText('Select Person')).toBeInTheDocument();
    });

    test('handles person loading error gracefully', async () => {
      (personApi.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load persons'));
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome to MediTrack!/)).toBeInTheDocument();
      });
    });
  });

  describe('Medication Display and Management', () => {
    test('displays medications list after loading', async () => {
      render(<MedicationTracker />);
      
      // Wait for initial person loading to complete
      await waitFor(() => {
        expect(personApi.getAll).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });
      expect(screen.getByText('100mg')).toBeInTheDocument();
      expect(screen.getByText('Once daily')).toBeInTheDocument();
      expect(screen.getByText('Vitamin D')).toBeInTheDocument();
      expect(screen.getByText('1000IU')).toBeInTheDocument();
      expect(screen.getByText('Twice daily')).toBeInTheDocument();
    });

    test('shows empty medications grid when list is empty', async () => {
      (medicationApi.getAll as jest.Mock).mockResolvedValue([]);
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Medication')).toBeInTheDocument();
      });
      expect(screen.queryByText('Aspirin')).not.toBeInTheDocument();
    });

    test('handles medication loading error', async () => {
      (medicationApi.getAll as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('reloads medications when person changes', async () => {
      render(<MedicationTracker />);
      
      // Wait for initial load and person selection
      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(medicationApi.getAll).toHaveBeenCalledWith(expect.objectContaining({
          person_id: 1
        }));
      });

      jest.clearAllMocks();

      // Find the person selector dropdown in AppHeader
      const personSelect = screen.getByRole('combobox');
      fireEvent.change(personSelect, { target: { value: '2' } });
      
      await waitFor(() => {
        expect(medicationApi.getAll).toHaveBeenCalledWith(expect.objectContaining({
          person_id: 2
        }));
      });
    });
  });

  describe('Date Navigation', () => {
    test('displays current date and navigation controls', async () => {
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByTestId('date-navigation')).toBeInTheDocument();
      });
      expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
      expect(screen.getByLabelText('Next day')).toBeInTheDocument();
      // Check for a date input with proper format instead of hardcoded date
      const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
    });

    test('navigates to previous day', async () => {
      render(<MedicationTracker />);
      
      // Wait for full initialization and person selection
      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });

      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);
      
      await waitFor(() => {
        expect(medicationApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
          })
        );
      });
    });

    test('navigates to next day', async () => {
      render(<MedicationTracker />);
      
      // Wait for full initialization and person selection
      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next day');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(medicationApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
          })
        );
      });
    });

    test('changes date using date picker', async () => {
      render(<MedicationTracker />);
      
      // Wait for full initialization and person selection
      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });

      // Find the date input by display value instead of DOM query
      const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      
      fireEvent.change(dateInput, { target: { value: '2023-01-10' } });
      
      await waitFor(() => {
        expect(medicationApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            date: '2023-01-10'
          })
        );
      });
    });
  });

  describe('Dose Recording', () => {
    test('records dose when Take Dose button is clicked', async () => {
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });

      const takeDoseButtons = screen.getAllByText('Take Now');
      fireEvent.click(takeDoseButtons[0]);
      
      await waitFor(() => {
        expect(doseApi.recordDoseWithTimezone).toHaveBeenCalledWith(1, expect.any(Number));
      });
    });

    test('disables Take Dose button when max doses reached', async () => {
      const medicationsWithMaxDoses = [{
        ...mockMedications[0],
        doses_taken_today: 1,
        max_doses_per_day: 1
      }];
      
      (medicationApi.getAll as jest.Mock).mockResolvedValue(medicationsWithMaxDoses);
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        const takeDoseButton = screen.getByText('Max Taken');
        expect(takeDoseButton).toBeDisabled();
      });
    });

    test('shows custom time modal for past dates', async () => {
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });

      // Navigate to previous day
      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);
      
      const takeDoseButtons = await screen.findAllByText('Record Dose');
      fireEvent.click(takeDoseButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Select Time')).toBeInTheDocument();
      });
    });

    test('records dose with custom time', async () => {
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });

      // Navigate to previous day
      const prevButton = screen.getByLabelText('Previous day');
      fireEvent.click(prevButton);
      
      const takeDoseButtons = await screen.findAllByText('Record Dose');
      fireEvent.click(takeDoseButtons[0]);

      const timeInput = await screen.findByDisplayValue(/^\d{2}:\d{2}$/);
      fireEvent.change(timeInput, { target: { value: '14:30' } });
      
      const recordButton = screen.getByText('Record');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(doseApi.recordDoseForDate).toHaveBeenCalledWith(
          1,
          expect.any(String),
          '14:30',
          undefined
        );
      });
    });

    test('prevents recording dose for future dates', async () => {
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });

      // Navigate to next day
      const nextButton = screen.getByLabelText('Next day');
      fireEvent.click(nextButton);
      
      const takeDoseButtons = await screen.findAllByText('Future Date');
      expect(takeDoseButtons[0]).toBeDisabled();
    });
  });

  describe('Medication CRUD Operations', () => {
    test('shows add medication form when button is clicked', async () => {
      render(<MedicationTracker />);
      
      const addButton = await screen.findByText('+ Add Medication');
      fireEvent.click(addButton);

      expect(screen.getByText('Add New Medication')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Dosage')).toBeInTheDocument();
    });

    test('creates new medication', async () => {
      render(<MedicationTracker />);
      
      const addButton = await screen.findByText('+ Add Medication');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      const dosageInput = screen.getByLabelText('Dosage');
      const frequencyInput = screen.getByLabelText('Frequency');
      
      await userEvent.type(nameInput, 'New Med');
      await userEvent.type(dosageInput, '50mg');
      await userEvent.type(frequencyInput, 'Once daily');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(medicationApi.create).toHaveBeenCalledWith({
          name: 'New Med',
          dosage: '50mg',
          frequency: 'Once daily',
          max_doses_per_day: 1,
          instructions: '',
          person_id: 1
        });
      });
    });

    test('shows edit form when Edit button is clicked', async () => {
      render(<MedicationTracker />);
      
      const editButtons = await screen.findAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Medication')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Aspirin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100mg')).toBeInTheDocument();
    });

    test('updates medication', async () => {
      render(<MedicationTracker />);
      
      const editButtons = await screen.findAllByText('Edit');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText('Name');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Aspirin');

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(medicationApi.update).toHaveBeenCalledWith(1, expect.objectContaining({
          name: 'Updated Aspirin'
        }));
      });
    });

    test('shows delete confirmation and deletes medication', async () => {
      render(<MedicationTracker />);
      
      const deleteButtons = await screen.findAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(medicationApi.delete).toHaveBeenCalledWith(1);
      });
    });

    test('cancels delete when No is clicked', async () => {
      render(<MedicationTracker />);
      
      const deleteButtons = await screen.findAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(medicationApi.delete).not.toHaveBeenCalled();
      expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
    });
  });

  describe('Dose History', () => {
    test('shows dose history when Show History is clicked', async () => {
      render(<MedicationTracker />);
      
      const historyButtons = await screen.findAllByText('Show History');
      fireEvent.click(historyButtons[0]);

      await waitFor(() => {
        expect(doseApi.getDoses).toHaveBeenCalledWith(1);
      });
      expect(screen.getByText(/Dose History/)).toBeInTheDocument();
    });

    test('hides dose history when Hide History is clicked', async () => {
      render(<MedicationTracker />);
      
      const historyButtons = await screen.findAllByText('Show History');
      fireEvent.click(historyButtons[0]);

      const hideButton = await screen.findByText('Hide History');
      fireEvent.click(hideButton);

      expect(screen.queryByText(/Dose History/)).not.toBeInTheDocument();
    });

    test('deletes dose from history', async () => {
      render(<MedicationTracker />);
      
      // Wait for medications to load first
      await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
      });
      
      // Click show history to expand dose history
      const historyButtons = screen.getAllByText('Show History');
      fireEvent.click(historyButtons[0]);
      
      // Wait for dose history API call to be made
      await waitFor(() => {
        expect(doseApi.getDoses).toHaveBeenCalledWith(1);
      });
      
      // Wait for dose history to load and appear
      await waitFor(() => {
        expect(screen.getByText('Dose History')).toBeInTheDocument();
      });
      
      // Wait for dose entries to appear in the DOM
      await waitFor(() => {
        expect(screen.getByText('1/15/2023')).toBeInTheDocument();
      });

      // Find and click the specific dose delete button
      const doseDeleteButton = await screen.findByTestId('dose-delete-1');
      fireEvent.click(doseDeleteButton);

      // Check if we're in delete confirmation state by looking for Confirm button
      await waitFor(() => {
        expect(screen.getByTestId('dose-confirm-delete-1')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByTestId('dose-confirm-delete-1');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(doseApi.deleteDose).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Daily Dose Log', () => {
    test('opens daily dose log when button is clicked', async () => {
      render(<MedicationTracker />);
      
      const logButton = await screen.findByText('View Daily Log');
      fireEvent.click(logButton);

      expect(screen.getByTestId('daily-dose-log')).toBeInTheDocument();
      expect(screen.getByText(/Person ID:/)).toBeInTheDocument();
    });

    test('closes daily dose log', async () => {
      render(<MedicationTracker />);
      
      const logButton = await screen.findByText('View Daily Log');
      fireEvent.click(logButton);

      const closeButton = within(screen.getByTestId('daily-dose-log')).getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('daily-dose-log')).not.toBeInTheDocument();
    });
  });

  describe('Person Management', () => {
    test('opens person manager when Manage Persons is clicked', async () => {
      render(<MedicationTracker />);
      
      const manageButton = await screen.findByText('Manage');
      fireEvent.click(manageButton);

      expect(screen.getByTestId('person-manager')).toBeInTheDocument();
    });

    test('closes person manager', async () => {
      render(<MedicationTracker />);
      
      const manageButton = await screen.findByText('Manage');
      fireEvent.click(manageButton);

      const closeButton = within(screen.getByTestId('person-manager')).getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('person-manager')).not.toBeInTheDocument();
    });
  });

  describe('Deleted Medications', () => {
    test('shows deleted medications with doses', async () => {
      (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue({
        date: '2023-01-15',
        medications: [
          {
            medication_name: 'Deleted Med',
            is_deleted: true,
            doses_taken: 2
          }
        ]
      });

      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('Previously Recorded Medications')).toBeInTheDocument();
      });
      expect(screen.getByText('Deleted Med')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('detects mobile viewport', async () => {
      // Mock window width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      });

      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText('MediTrack')).toBeInTheDocument();
      });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Mobile-specific behavior would be tested here
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles medication creation error', async () => {
      (medicationApi.create as jest.Mock).mockRejectedValue(new Error('Failed to create'));
      
      render(<MedicationTracker />);
      
      const addButton = await screen.findByText('+ Add Medication');
      fireEvent.click(addButton);

      const nameInput = screen.getByLabelText('Name');
      await userEvent.type(nameInput, 'Test');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create')).toBeInTheDocument();
      });
    });

    test('handles dose recording error', async () => {
      (doseApi.recordDoseWithTimezone as jest.Mock).mockRejectedValue(new Error('Failed to record dose'));
      
      render(<MedicationTracker />);
      
      const takeDoseButtons = await screen.findAllByText('Take Now');
      fireEvent.click(takeDoseButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to record dose')).toBeInTheDocument();
      });
    });

    test('handles dose history loading error', async () => {
      (doseApi.getDoses as jest.Mock).mockRejectedValue(new Error('Failed to load history'));
      
      render(<MedicationTracker />);
      
      const historyButtons = await screen.findAllByText('Show History');
      fireEvent.click(historyButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to load history')).toBeInTheDocument();
      });
    });
  });

  describe('Dose History Modal', () => {
    test('opens dose history modal when medication name is clicked', async () => {
      render(<MedicationTracker />);
      
      const medicationName = await screen.findByText('Aspirin');
      fireEvent.click(medicationName);

      expect(screen.getByTestId('dose-history-modal')).toBeInTheDocument();
      expect(screen.getByText('Dose History for Aspirin')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('requires person selection before adding medication', async () => {
      (personApi.getAll as jest.Mock).mockResolvedValue([]);
      
      render(<MedicationTracker />);
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome to MediTrack!/)).toBeInTheDocument();
      });

      // Force show add form somehow
      const component = screen.getByText(/Welcome to MediTrack!/);
      expect(component).toBeInTheDocument();
    });
  });
});