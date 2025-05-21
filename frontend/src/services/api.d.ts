// Type definitions for API services

export interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  max_doses_per_day: number;
  doses_taken_today: number;
  person_id: number;
}

export interface Dose {
  id: number;
  medication_id: number;
  taken_at: string;
}

export interface Person {
  id: number;
  name: string;
  is_default: boolean;
  medication_count: number;
  date_of_birth?: string | null;
  notes?: string;
}

export interface DailySummaryMedication {
  medication_id: number | null;
  medication_name: string;
  doses_taken: number;
  max_doses: number;
  dose_times: string[];
  is_deleted?: boolean;
}

export interface DailySummary {
  date: string;
  medications: DailySummaryMedication[];
}

// API Services
export interface MedicationApi {
  getAll: (params?: Record<string, any>) => Promise<Medication[]>;
  getById: (id: number) => Promise<Medication>;
  create: (medication: Partial<Medication>) => Promise<Medication>;
  update: (id: number, updates: Partial<Medication> & { person_id?: number | null }) => Promise<Medication>;
  delete: (id: number) => Promise<boolean>;
}

export interface DoseApi {
  recordDose: (medicationId: number) => Promise<Dose>;
  recordDoseWithTimezone: (medicationId: number, timezoneOffset: number) => Promise<Dose>;
  recordDoseForDate: (medicationId: number, date: string, time: string, timezoneOffset?: number) => Promise<Dose>;
  getDoses: (medicationId: number) => Promise<Dose[]>;
  getDosesByDate: (medicationId: number, date: string) => Promise<Dose[]>;
  getDailySummary: () => Promise<DailySummary>;
  getDailySummaryByDate: (date: string, timezoneOffset?: number | null) => Promise<DailySummary>;
  deleteDose: (doseId: number) => Promise<boolean>;
  getDeletedMedicationDoses: (medicationName: string) => Promise<Dose[]>;
  downloadMedicationTrackingPDF: (date: string, options?: {
    timezoneOffset?: number | null;
    personId?: number;
    days?: number;
  }) => Promise<boolean>;
}

export interface PersonApi {
  getAll: (params?: Record<string, any>) => Promise<Person[]>;
  getById: (id: number) => Promise<Person>;
  create: (person: Partial<Person>) => Promise<Person>;
  update: (id: number, updates: Partial<Person>) => Promise<Person>;
  delete: (id: number) => Promise<boolean>;
  setDefault: (id: number) => Promise<Person>;
}

// Export the API objects
declare const medicationApi: MedicationApi;
declare const doseApi: DoseApi;
declare const personApi: PersonApi;

export { medicationApi, doseApi, personApi };