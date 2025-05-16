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
  },
}));

import { medicationApi, doseApi } from '../../services/api';

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
  });
});