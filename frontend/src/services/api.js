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
  // Get all medications with dose information for today or specific date
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/medications/', { params });
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

  // Record a dose for a medication with timezone information
  recordDoseWithTimezone: async (medicationId, timezoneOffset) => {
    try {
      const response = await api.post(`/doses/medications/${medicationId}/dose`, {
        timezone_offset: timezoneOffset
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Record a dose for a medication on a specific date and time
  recordDoseForDate: async (medicationId, date, time, timezoneOffset) => {
    try {
      let url = `/doses/medications/${medicationId}/dose/${date}?time=${encodeURIComponent(time)}`;
      if (timezoneOffset !== undefined) {
        url += `&timezone_offset=${timezoneOffset}`;
      }
      const response = await api.post(url);
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
  
  // Get dose history for a deleted medication by name
  getDeletedMedicationDoses: async (medicationName) => {
    try {
      const response = await api.get(`/doses/deleted-medications/by-name/${encodeURIComponent(medicationName)}/doses`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get doses for a medication on a specific date
  getDosesByDate: async (medicationId, date) => {
    try {
      const response = await api.get(`/doses/medications/${medicationId}/doses/${date}`);
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

  // Get daily summary for a specific date
  getDailySummaryByDate: async (date, timezoneOffset = null) => {
    try {
      let url = `/doses/daily-summary/${date}`;
      const params = {};
      
      // Explicitly check for non-null values (works with both null and numeric values)
      if (timezoneOffset !== null && timezoneOffset !== undefined) {
        params.timezone_offset = timezoneOffset;
      }
      
      const response = await api.get(url, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a specific dose
  deleteDose: async (doseId) => {
    try {
      await api.delete(`/doses/${doseId}`);
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  // Download a printable medication tracking PDF
  downloadMedicationTrackingPDF: async (date, options = {}) => {
    try {
      const { timezoneOffset, personId, days = 1 } = options;
      
      // Build URL with query parameters
      let url = `/reports/medications/pdf/${date}`;
      const params = {};
      
      if (timezoneOffset !== null && timezoneOffset !== undefined) {
        params.timezone_offset = timezoneOffset;
      }
      
      if (personId) {
        params.person_id = personId;
      }
      
      if (days && days > 1) {
        params.days = days;
      }
      
      // Use axios with responseType blob to handle binary data
      const response = await api.get(url, { 
        params,
        responseType: 'blob' 
      });
      
      // Create a download link and trigger it
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `medication_tracking_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return true;
    } catch (error) {
      throw error;
    }
  },
};

const personApi = {
  // Get all persons
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/persons/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get a specific person by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/persons/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new person
  create: async (person) => {
    try {
      const response = await api.post('/persons/', person);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update a person
  update: async (id, updates) => {
    try {
      const response = await api.put(`/persons/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a person
  delete: async (id) => {
    try {
      await api.delete(`/persons/${id}`);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Set person as default
  setDefault: async (id) => {
    try {
      const response = await api.put(`/persons/${id}/set-default`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

const reportApi = {
  // Generate a general PDF report
  generatePDF: async (options = {}) => {
    try {
      const response = await api.get('/reports/medication-summary', {
        params: options,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate a medication tracking form
  generateMedicationTrackingForm: async (personId = null) => {
    try {
      const url = personId 
        ? `/reports/medication-tracking-form?person_id=${personId}`
        : '/reports/medication-tracking-form';
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export { medicationApi, doseApi, personApi, reportApi };