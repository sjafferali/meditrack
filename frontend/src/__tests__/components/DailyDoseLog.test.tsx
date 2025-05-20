import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DailyDoseLog from '../../components/DailyDoseLog';
import { doseApi } from '../../services/api';

jest.mock('../../services/api');

describe('DailyDoseLog Component', () => {
  const mockProps = {
    selectedDate: new Date('2025-05-17'),
    isOpen: true,
    onClose: jest.fn()
  };

  const mockSummary = {
    date: '2025-05-17',
    medications: [
      {
        medication_id: 1,
        medication_name: 'Aspirin 100mg',
        doses_taken: 2,
        max_doses: 2,
        dose_times: [
          '2025-05-17T08:00:00Z',
          '2025-05-17T20:00:00Z'
        ]
      },
      {
        medication_id: 2,
        medication_name: 'Vitamin D',
        doses_taken: 1,
        max_doses: 1,
        dose_times: [
          '2025-05-17T09:00:00Z'
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn()
      }
    });
  });

  test('renders daily dose log modal when open', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Medication Log')).toBeInTheDocument();
    });
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(<DailyDoseLog {...mockProps} isOpen={false} />);
    // Fix ESLint error by using Testing Library method
    expect(container).toBeEmptyDOMElement();
  });

  test('displays loading state while fetching data', () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<DailyDoseLog {...mockProps} />);

    expect(screen.getByText('Loading daily log...')).toBeInTheDocument();
  });

  test('displays error message on API failure', async () => {
    const errorMessage = 'Failed to fetch data';
    (doseApi.getDailySummaryByDate as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('formats and displays medication log correctly', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/MEDICATION LOG/)).toBeInTheDocument();
    });

    // Check that medications appear in the format "time - medication"
    const logElements = screen.getAllByText(/\d{2}:\d{2} (AM|PM) - .+/);
    expect(logElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Aspirin 100mg/)).toBeInTheDocument();
    expect(screen.getByText(/Vitamin D/)).toBeInTheDocument();
  });

  test('copies text to clipboard when copy button is clicked', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    });

    const copyButton = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('calls onClose when close button is clicked', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('calls onClose when backdrop is clicked', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Daily Medication Log')).toBeInTheDocument();
    });

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('handles empty medication list correctly', async () => {
    const emptySummary = {
      date: '2025-05-17',
      medications: []
    };
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(emptySummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      // Check if the message is in the pre element
      const preElement = screen.getByText(/No medications taken on this date\./);
      expect(preElement).toBeInTheDocument();
    });
  });
  
  test('displays reload button when no data is found', async () => {
    // First API call returns null to simulate no data found
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValueOnce(null);
    
    render(<DailyDoseLog {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No data found for this date.')).toBeInTheDocument();
    });
    
    // Check for Reload Data button
    expect(screen.getByText('Reload Data')).toBeInTheDocument();
  });
  
  test('uses selectedDate prop for formatting the header correctly', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    
    // Create a specific test date
    const testDate = new Date('2025-05-19'); // May 19, 2025
    const dateFormatted = testDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    render(
      <DailyDoseLog 
        selectedDate={testDate}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    
    await waitFor(() => {
      // The formatted date should appear in the log heading
      const preElement = screen.getByText(new RegExp(`MEDICATION LOG - ${dateFormatted}`));
      expect(preElement).toBeInTheDocument();
    });
  });
});