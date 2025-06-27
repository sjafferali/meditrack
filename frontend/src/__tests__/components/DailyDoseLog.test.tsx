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

  test('handles autoPrint functionality', async () => {
    const mockDownloadPDF = jest.fn();
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    (doseApi.downloadMedicationTrackingPDF as jest.Mock) = mockDownloadPDF;

    // Use a specific date that won't be affected by timezone shifts
    const testDate = new Date('2025-05-17T12:00:00');
    
    render(
      <DailyDoseLog 
        selectedDate={testDate}
        isOpen={true}
        onClose={jest.fn()}
        autoPrint={true}
        personId="1"
      />
    );

    await waitFor(() => {
      expect(mockDownloadPDF).toHaveBeenCalledWith('2025-05-17', {
        timezoneOffset: expect.any(Number),
        days: 1,
        personId: 1
      });
    }, { timeout: 1000 });
  });

  test('handles print tracking button click', async () => {
    const mockDownloadPDF = jest.fn();
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    (doseApi.downloadMedicationTrackingPDF as jest.Mock) = mockDownloadPDF;

    const testDate = new Date('2025-05-17T12:00:00');
    
    render(
      <DailyDoseLog 
        selectedDate={testDate}
        isOpen={true}
        onClose={jest.fn()}
        personId="2"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Print Tracking Form')).toBeInTheDocument();
    });

    const printButton = screen.getByText('Print Tracking Form');
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(mockDownloadPDF).toHaveBeenCalledWith('2025-05-17', {
        timezoneOffset: expect.any(Number),
        days: 1,
        personId: 2
      });
    });
  });

  test('handles print tracking error', async () => {
    const mockDownloadPDF = jest.fn().mockRejectedValue(new Error('PDF generation failed'));
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    (doseApi.downloadMedicationTrackingPDF as jest.Mock) = mockDownloadPDF;

    const testDate = new Date('2025-05-17T12:00:00');
    
    render(
      <DailyDoseLog 
        selectedDate={testDate}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Print Tracking Form')).toBeInTheDocument();
    });

    const printButton = screen.getByText('Print Tracking Form');
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(screen.getByText('PDF generation failed')).toBeInTheDocument();
    });
  });

  test.skip('handles clipboard fallback when navigator.clipboard is not available', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    
    // Store original methods
    const originalExecCommand = document.execCommand;
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;
    
    // Mock the fallback scenario
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true
    });

    // Mock document.execCommand
    document.execCommand = jest.fn().mockReturnValue(true);
    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'textarea') {
        return {
          value: '',
          style: {},
          select: jest.fn(),
        };
      }
      return originalCreateElement.call(document, tagName);
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    });

    const copyButton = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    
    // Restore original methods
    document.execCommand = originalExecCommand;
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  test.skip('handles clipboard copy failure', async () => {
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    
    // Mock clipboard failure
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard error'))
      }
    });

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    });

    const copyButton = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to copy to clipboard. Please try again.')).toBeInTheDocument();
    });
  });

  test.skip('formats deleted medications correctly', async () => {
    const summaryWithDeleted = {
      date: '2025-05-17',
      medications: [
        {
          medication_id: null,
          medication_name: 'Deleted Medication (deleted)',
          doses_taken: 1,
          max_doses: 1,
          dose_times: ['2025-05-17T08:00:00Z'],
          is_deleted: true
        }
      ]
    };
    
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(summaryWithDeleted);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Deleted Medication/)).toBeInTheDocument();
    });
  });

  test.skip('sorts doses by time correctly', async () => {
    const summaryWithMultipleTimes = {
      date: '2025-05-17',
      medications: [
        {
          medication_id: 1,
          medication_name: 'Medication A',
          doses_taken: 2,
          max_doses: 2,
          dose_times: [
            '2025-05-17T20:00:00Z', // Later time first
            '2025-05-17T08:00:00Z'  // Earlier time second
          ]
        }
      ]
    };
    
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(summaryWithMultipleTimes);

    render(<DailyDoseLog {...mockProps} />);

    const copyButton = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Check that the copied text has times in the correct order
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('08:00') && expect.stringContaining('20:00')
    );
  });

  test.skip('handles reload data functionality', async () => {
    // First call returns null (no data)
    (doseApi.getDailySummaryByDate as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reload Data')).toBeInTheDocument();
    });

    const reloadButton = screen.getByText('Reload Data');
    fireEvent.click(reloadButton);

    await waitFor(() => {
      expect(screen.getByText(/MEDICATION LOG/)).toBeInTheDocument();
    });

    expect(doseApi.getDailySummaryByDate).toHaveBeenCalledTimes(2);
  });

  test.skip('prevents reload when already loading', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    (doseApi.getDailySummaryByDate as jest.Mock).mockReturnValue(promise);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Loading daily log...')).toBeInTheDocument();
    });

    // Try to reload while loading - should not trigger additional API call
    expect(screen.getByText('Loading daily log...')).toBeInTheDocument();
    
    // Resolve the initial promise
    resolvePromise!(mockSummary);

    await waitFor(() => {
      expect(screen.getByText(/MEDICATION LOG/)).toBeInTheDocument();
    });
  });

  test.skip('handles timezone offset correctly', async () => {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    // eslint-disable-next-line no-extend-native
    Date.prototype.getTimezoneOffset = jest.fn().mockReturnValue(-300); // EST

    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      expect(doseApi.getDailySummaryByDate).toHaveBeenCalledWith('2025-05-17', -300);
    });

    // eslint-disable-next-line no-extend-native
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
  });

  test.skip('formats time correctly from ISO string', async () => {
    const testSummary = {
      date: '2025-05-17',
      medications: [
        {
          medication_id: 1,
          medication_name: 'Test Med',
          doses_taken: 1,
          max_doses: 1,
          dose_times: ['2025-05-17T14:30:00Z'] // 2:30 PM UTC
        }
      ]
    };
    
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(testSummary);

    render(<DailyDoseLog {...mockProps} />);

    await waitFor(() => {
      // Check for formatted time in the display
      expect(screen.getByText(/Test Med/)).toBeInTheDocument();
    });
  });

  test('handles print without personId', async () => {
    const mockDownloadPDF = jest.fn();
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockSummary);
    (doseApi.downloadMedicationTrackingPDF as jest.Mock) = mockDownloadPDF;

    const testDate = new Date('2025-05-17T12:00:00');
    
    render(
      <DailyDoseLog 
        selectedDate={testDate}
        isOpen={true}
        onClose={jest.fn()}
        // No personId provided
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Print Tracking Form')).toBeInTheDocument();
    });

    const printButton = screen.getByText('Print Tracking Form');
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(mockDownloadPDF).toHaveBeenCalledWith('2025-05-17', {
        timezoneOffset: expect.any(Number),
        days: 1
        // personId should not be included
      });
    });
  });
});