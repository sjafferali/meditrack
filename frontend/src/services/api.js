import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data.detail || 'An error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something happened in setting up the request
      throw new Error('An unexpected error occurred');
    }
  }
);

const medicationApi = {
  // Get all medications with today's dose information
  getAll: async () => {
    try {
      const response = await api.get('/medications/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get a specific medication by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/medications/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new medication
  create: async (medication) => {
    try {
      const response = await api.post('/medications/', medication);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update a medication
  update: async (id, updates) => {
    try {
      const response = await api.put(`/medications/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a medication
  delete: async (id) => {
    try {
      await api.delete(`/medications/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  },
};

const doseApi = {
  // Record a dose for a medication
  recordDose: async (medicationId) => {
    try {
      const response = await api.post(`/doses/medications/${medicationId}/dose`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get dose history for a medication
  getDoses: async (medicationId) => {
    try {
      const response = await api.get(`/doses/medications/${medicationId}/doses`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get daily summary
  getDailySummary: async () => {
    try {
      const response = await api.get('/doses/daily-summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export { medicationApi, doseApi };