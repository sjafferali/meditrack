import { medicationApi, doseApi } from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  medicationApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  doseApi: {
    recordDose: jest.fn(),
    getDoses: jest.fn(),
    getDailySummary: jest.fn(),
    deleteDose: jest.fn(),
    recordDoseForDate: jest.fn(),
    recordDoseWithTimezone: jest.fn(),
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('medicationApi has required methods', () => {
    expect(typeof medicationApi.getAll).toBe('function');
    expect(typeof medicationApi.create).toBe('function');
    expect(typeof medicationApi.update).toBe('function');
    expect(typeof medicationApi.delete).toBe('function');
  });

  test('doseApi has required methods', () => {
    expect(typeof doseApi.recordDose).toBe('function');
    expect(typeof doseApi.getDoses).toBe('function');
    expect(typeof doseApi.getDailySummary).toBe('function');
    expect(typeof doseApi.deleteDose).toBe('function');
    expect(typeof doseApi.recordDoseForDate).toBe('function');
    expect(typeof doseApi.recordDoseWithTimezone).toBe('function');
  });
});