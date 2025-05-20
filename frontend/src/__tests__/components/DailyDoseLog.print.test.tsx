import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('basic render test', async () => {
    render(
      <DailyDoseLog
        selectedDate={new Date('2023-05-01')}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText(/Daily Medication Log/i)).toBeInTheDocument();
    });
  });
});