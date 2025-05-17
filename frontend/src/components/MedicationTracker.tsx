import React, { useState, useEffect } from 'react';
import { medicationApi, doseApi } from '../services/api';
import DoseHistoryModal from './DoseHistoryModal';

const MedicationTracker = () => {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedMedicationForHistory, setSelectedMedicationForHistory] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Form state for adding/editing medications
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    max_doses_per_day: 1,
    instructions: ''
  });

  // Load medications on component mount and when date changes
  useEffect(() => {
    loadMedications();
  }, [selectedDate]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await medicationApi.getAll({ date: dateStr });
      setMedications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeMedication = async (medicationId: number) => {
    try {
      setError(null);
      
      if (isPastDate(selectedDate)) {
        // For past dates, we need a time input modal
        const time = prompt('Enter the time the dose was taken (HH:MM format):');
        if (!time) return;
        
        const dateStr = selectedDate.toISOString().split('T')[0];
        await doseApi.recordDoseForDate(medicationId, dateStr, time);
      } else if (isToday(selectedDate)) {
        // For today, record dose with current time
        await doseApi.recordDose(medicationId);
      } else {
        setError('Cannot record doses for future dates');
        return;
      }
      
      // Reload medications to update dose count
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const newMedication = await medicationApi.create(formData);
      setMedications([...medications, newMedication]);
      setIsAddingMedication(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const updated = await medicationApi.update(editingMedication.id, formData);
      setMedications(medications.map(med => 
        med.id === editingMedication.id ? updated : med
      ));
      setEditingMedication(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteMedication = async (id: number) => {
    try {
      setError(null);
      await medicationApi.delete(id);
      setMedications(medications.filter(med => med.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const startEdit = (medication: any) => {
    setEditingMedication(medication);
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      max_doses_per_day: medication.max_doses_per_day,
      instructions: medication.instructions
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      max_doses_per_day: 1,
      instructions: ''
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center">
          <div className="text-gray-500">Loading medications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Medication Tracker</h1>
        <p className="text-gray-600">Track your daily medications</p>
      </div>

      {/* Date Navigation */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Previous day"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {isToday(selectedDate) && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Today</span>
            )}
            {isPastDate(selectedDate) && !isToday(selectedDate) && (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">Past</span>
            )}
            {isFutureDate(selectedDate) && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Future</span>
            )}
          </div>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Next day"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-lg font-medium">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="float-right"
          >
            ×
          </button>
        </div>
      )}

      {/* Add/Edit Medication Form */}
      {(isAddingMedication || editingMedication) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingMedication ? 'Edit Medication' : 'Add New Medication'}
          </h2>
          <form onSubmit={editingMedication ? handleUpdateMedication : handleAddMedication}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dosage</label>
                <input
                  type="text"
                  required
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <input
                  type="text"
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Doses Per Day</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  value={formData.max_doses_per_day}
                  onChange={(e) => setFormData({...formData, max_doses_per_day: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingMedication(false);
                  setEditingMedication(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {editingMedication ? 'Update' : 'Add'} Medication
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Medication List */}
      <div className="shadow rounded-lg overflow-hidden">
        {medications.map((medication) => (
          <div key={medication.id} className="bg-white border-b last:border-b-0 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              {/* Medication Info */}
              <div className="flex-1 mb-4 md:mb-0">
                <h2 className="text-xl font-semibold text-gray-800">{medication.name}</h2>
                <div className="flex flex-wrap text-sm text-gray-600 mt-1">
                  <span className="mr-4">{medication.dosage}</span>
                  <span>{medication.frequency}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{medication.instructions}</p>
              </div>

              {/* Dose Counter & Last Taken */}
              <div className="flex flex-col md:items-end md:mr-4">
                <div className="mb-1 text-sm font-medium">
                  <span className="text-blue-600">{medication.doses_taken_today}</span>
                  <span className="text-gray-500"> / {medication.max_doses_per_day} doses taken</span>
                </div>
                <div className="text-xs text-gray-500">
                  {medication.last_taken_at 
                    ? `Last taken: ${formatTime(medication.last_taken_at)}` 
                    : "Not taken today"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="md:ml-4 flex space-x-2">
                <button
                  onClick={() => handleTakeMedication(medication.id)}
                  disabled={
                    medication.doses_taken_today >= medication.max_doses_per_day ||
                    isFutureDate(selectedDate)
                  }
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    medication.doses_taken_today >= medication.max_doses_per_day
                      ? "bg-gray-300 cursor-not-allowed"
                      : isFutureDate(selectedDate)
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {medication.doses_taken_today >= medication.max_doses_per_day
                    ? "Max Taken"
                    : isFutureDate(selectedDate)
                    ? "Future Date"
                    : isPastDate(selectedDate) && !isToday(selectedDate)
                    ? "Record Dose"
                    : "Take Now"}
                </button>
                <button
                  onClick={() => setSelectedMedicationForHistory(medication)}
                  className="px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-md"
                >
                  History
                </button>
                <button
                  onClick={() => startEdit(medication)}
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  Edit
                </button>
                {deleteConfirmId === medication.id ? (
                  <>
                    <button
                      onClick={() => handleDeleteMedication(medication.id)}
                      className="px-3 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(medication.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600"
                style={{ width: `${(medication.doses_taken_today / medication.max_doses_per_day) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Medication Button */}
      <div className="mt-6 text-center">
        <button 
          onClick={() => setIsAddingMedication(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md"
        >
          + Add Medication
        </button>
      </div>

      {/* Dose History Modal */}
      {selectedMedicationForHistory && (
        <DoseHistoryModal
          medication={selectedMedicationForHistory}
          isOpen={true}
          onClose={() => setSelectedMedicationForHistory(null)}
        />
      )}
    </div>
  );
};

export default MedicationTracker;