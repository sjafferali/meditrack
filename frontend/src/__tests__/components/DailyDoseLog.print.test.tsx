import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyDoseLog from '../../components/DailyDoseLog';
import { doseApi } from '../../services/api';

// Mock the API module
jest.mock('../../services/api', () => ({
  doseApi: {
    getDailySummaryByDate: jest.fn(),
    downloadMedicationTrackingPDF: jest.fn()
  }
}));

const mockDailySummary = {
  date: '2023-05-01',
  medications: [
    {
      medication_id: 1,
      medication_name: 'Aspirin',
      doses_taken: 2,
      max_doses: 3,
      dose_times: ['2023-05-01T08:00:00Z', '2023-05-01T20:00:00Z']
    },
    {
      medication_id: 2,
      medication_name: 'Vitamin D',
      doses_taken: 1,
      max_doses: 1,
      dose_times: ['2023-05-01T09:00:00Z']
    }
  ]
};

describe('DailyDoseLog Component - PDF Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API calls
    (doseApi.getDailySummaryByDate as jest.Mock).mockResolvedValue(mockDailySummary);
    (doseApi.downloadMedicationTrackingPDF as jest.Mock).mockResolvedValue(true);
  });

  it('renders print tracking form button when log has data', async () => {
    render(
      <MemoryRouter>
        <DailyDoseLog
          selectedDate={new Date('2023-05-01')}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });

    // Check if the print button exists
    expect(screen.getByText(/Print Tracking Form/i)).toBeInTheDocument();
  });

  it('calls download PDF function when print button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <DailyDoseLog
          selectedDate={new Date('2023-05-01')}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });

    // Click the print button
    const printButton = screen.getByText(/Print Tracking Form/i);
    await user.click(printButton);

    // Verify API was called with the correct parameters
    expect(doseApi.downloadMedicationTrackingPDF).toHaveBeenCalledWith(
      '2023-05-01',
      expect.objectContaining({
        timezoneOffset: expect.any(Number),
        days: 1
      })
    );
  });

  it('passes personId to download function when available in props', async () => {
    const user = userEvent.setup();
    
    render(
      <DailyDoseLog
        selectedDate={new Date('2023-05-01')}
        isOpen={true}
        onClose={() => {}}
        personId="42"
      />
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });

    // Click the print button
    const printButton = screen.getByText(/Print Tracking Form/i);
    await user.click(printButton);

    // Verify API was called with the person ID parameter
    expect(doseApi.downloadMedicationTrackingPDF).toHaveBeenCalledWith(
      '2023-05-01',
      expect.objectContaining({
        timezoneOffset: expect.any(Number),
        days: 1,
        personId: 42
      })
    );
  });

  it('shows error message when PDF generation fails', async () => {
    const user = userEvent.setup();
    
    // Mock the API to throw an error
    (doseApi.downloadMedicationTrackingPDF as jest.Mock).mockRejectedValue(
      new Error('Failed to generate PDF')
    );
    
    render(
      <MemoryRouter>
        <DailyDoseLog
          selectedDate={new Date('2023-05-01')}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });

    // Click the print button
    const printButton = screen.getByText(/Print Tracking Form/i);
    await user.click(printButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate PDF/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while generating PDF', async () => {
    const user = userEvent.setup();
    
    // Create a promise that won't resolve immediately
    let resolvePromise: (value: unknown) => void;
    const downloadPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    (doseApi.downloadMedicationTrackingPDF as jest.Mock).mockReturnValue(downloadPromise);
    
    render(
      <MemoryRouter>
        <DailyDoseLog
          selectedDate={new Date('2023-05-01')}
          isOpen={true}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });

    // Click the print button
    const printButton = screen.getByText(/Print Tracking Form/i);
    await user.click(printButton);

    // Button should show loading state
    expect(screen.getByText(/Generating PDF/i)).toBeInTheDocument();
    
    // Resolve the promise to complete the test
    act(() => {
      resolvePromise(true);
    });
    
    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByText(/Print Tracking Form/i)).toBeInTheDocument();
    });
  });
});