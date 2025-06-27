import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import DoseHistoryModal from '../../components/DoseHistoryModal';
import { doseApi } from '../../services/api';

jest.mock('../../services/api');

describe('DoseHistoryModal', () => {
  const mockMedication = { id: 1, name: 'Aspirin' };
  const mockDoses = [
    { id: 1, medication_id: 1, taken_at: '2023-01-01T09:00:00Z' },
    { id: 2, medication_id: 1, taken_at: '2023-01-01T21:00:00Z' },
    { id: 3, medication_id: 1, taken_at: '2023-01-02T09:00:00Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when isOpen is false', () => {
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText('Dose History - Aspirin')).not.toBeInTheDocument();
  });

  test('renders correctly when isOpen is true', () => {
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Dose History - Aspirin')).toBeInTheDocument();
  });

  test('displays loading state initially', async () => {
    (doseApi.getDoses as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={() => {}}
      />
    );
    
    expect(screen.getByText('Loading dose history...')).toBeInTheDocument();
  });

  test('displays dose history grouped by date', async () => {
    (doseApi.getDoses as jest.Mock).mockResolvedValue(mockDoses);
    
    await act(async () => {
      render(
        <DoseHistoryModal
          medication={mockMedication}
          isOpen={true}
          onClose={() => {}}
        />
      );
    });
    
    // Wait for the specific dates to appear
    expect(await screen.findByText('1/1/2023')).toBeInTheDocument();
    expect(await screen.findByText('1/2/2023')).toBeInTheDocument();
    
    // Check for dose information
    expect(screen.getAllByText('Dose 1:').length).toBeGreaterThan(0);
    expect(screen.getByText('Dose 2:')).toBeInTheDocument();
  });

  test('displays error message when API call fails', async () => {
    (doseApi.getDoses as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={() => {}}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  test('displays empty state when no doses exist', async () => {
    (doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={() => {}}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('No doses recorded yet')).toBeInTheDocument();
    });
  });

  test('calls onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn();
    (doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('calls onClose when Close button is clicked', async () => {
    const mockOnClose = jest.fn();
    (doseApi.getDoses as jest.Mock).mockResolvedValue([]);
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('formats time correctly in dose display', async () => {
    (doseApi.getDoses as jest.Mock).mockResolvedValue([
      { id: 1, medication_id: 1, taken_at: '2023-01-01T09:00:00Z' }
    ]);
    
    render(
      <DoseHistoryModal
        medication={mockMedication}
        isOpen={true}
        onClose={() => {}}
      />
    );
    
    await waitFor(() => {
      // The time could be formatted as either 9:00 or 09:00 depending on locale
      const timeElement = screen.getByText(/[0-9]{1,2}:00\s?(AM|PM)?/);
      expect(timeElement).toBeInTheDocument();
    });
  });
});