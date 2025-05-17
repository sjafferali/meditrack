import React, { useState, useEffect, useCallback } from 'react';
import { medicationApi, doseApi } from '../services/api';
import DailyDoseLog from './DailyDoseLog';

const MedicationTracker = () => {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [doseHistories, setDoseHistories] = useState<{ [key: number]: any[] }>({});
  const [loadingHistory, setLoadingHistory] = useState<{ [key: number]: boolean }>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDailyLog, setShowDailyLog] = useState(false);

  // Form state for adding/editing medications
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    max_doses_per_day: 1,
    instructions: ''
  });

  const loadMedications = useCallback(async () => {
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
  }, [selectedDate]);

  // Load medications on component mount and when date changes
  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const loadDoseHistory = async (medicationId: number) => {
    try {
      setLoadingHistory({ ...loadingHistory, [medicationId]: true });
      const data = await doseApi.getDoses(medicationId);
      setDoseHistories({ ...doseHistories, [medicationId]: data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dose history');
    } finally {
      setLoadingHistory({ ...loadingHistory, [medicationId]: false });
    }
  };

  const toggleHistory = async (medicationId: number) => {
    if (expandedHistoryId === medicationId) {
      setExpandedHistoryId(null);
    } else {
      setExpandedHistoryId(medicationId);
      if (!doseHistories[medicationId]) {
        await loadDoseHistory(medicationId);
      }
    }
  };

  const handleTakeMedication = async (medicationId: number) => {
    try {
      setError(null);
      
      if (isPastDate(selectedDate)) {
        // For past dates, use current browser time
        const currentTime = new Date();
        const time = currentTime.toTimeString().slice(0, 5); // Format as HH:MM
        const dateStr = selectedDate.toISOString().split('T')[0];
        await doseApi.recordDoseForDate(medicationId, dateStr, time);
      } else {
        // For today, use the regular endpoint
        await doseApi.recordDose(medicationId);
      }
      
      await loadMedications();
      // Refresh history if it's open
      if (expandedHistoryId === medicationId) {
        await loadDoseHistory(medicationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await medicationApi.create(formData);
      setIsAddingMedication(false);
      resetForm();
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication');
    }
  };

  const handleUpdateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedication) return;
    
    try {
      setError(null);
      await medicationApi.update(editingMedication.id, formData);
      setEditingMedication(null);
      resetForm();
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update medication');
    }
  };

  const handleDeleteMedication = async (id: number) => {
    try {
      setError(null);
      await medicationApi.delete(id);
      setDeleteConfirmId(null);
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete medication');
    }
  };

  const startEdit = (medication: any) => {
    setEditingMedication(medication);
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      max_doses_per_day: medication.max_doses_per_day,
      instructions: medication.instructions || ''
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value + 'T00:00:00'));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const groupDosesByDate = (doses: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    doses.forEach(dose => {
      const { date } = formatDateTime(dose.taken_at);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(dose);
    });
    return grouped;
  };

  interface Medication {
    id: number;
    name: string;
    dosage: string;
    frequency: string;
    max_doses_per_day: number;
    instructions?: string;
    doses_taken_today: number;
    last_taken_at?: string | null;
  }

  if (loading) {
    return <div className="text-center p-4">Loading medications...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Medication Tracker</h1>

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
          
          <div className="flex items-center gap-4">
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
          <button
            onClick={() => setShowDailyLog(true)}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            type="button"
          >
            View Daily Log
          </button>
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
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dosage</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <input
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Doses Per Day</label>
                <input
                  type="number"
                  value={formData.max_doses_per_day}
                  onChange={(e) => setFormData({ ...formData, max_doses_per_day: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                {editingMedication ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMedication(false);
                  setEditingMedication(null);
                  resetForm();
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Medications List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {medications.map((medication: Medication) => (
          <div key={medication.id} className="bg-white shadow rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{medication.name}</h3>
              <p className="text-gray-600">{medication.dosage}</p>
              <p className="text-sm text-gray-500">{medication.frequency}</p>
              {medication.instructions && (
                <p className="text-sm text-gray-500 mt-1">{medication.instructions}</p>
              )}
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm">
                <span>Daily Progress</span>
                <span>{medication.doses_taken_today} of {medication.max_doses_per_day}</span>
              </div>
              {medication.last_taken_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Last taken: {new Date(medication.last_taken_at).toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTakeMedication(medication.id)}
                disabled={
                  medication.doses_taken_today >= medication.max_doses_per_day || 
                  isFutureDate(selectedDate)
                }
                className={`px-3 py-2 rounded-md ${
                  medication.doses_taken_today >= medication.max_doses_per_day || isFutureDate(selectedDate)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
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
                onClick={() => toggleHistory(medication.id)}
                className={`px-3 py-2 rounded-md transition-colors ${
                  expandedHistoryId === medication.id 
                    ? "bg-purple-600 text-white" 
                    : "text-purple-600 hover:bg-purple-50"
                }`}
              >
                {expandedHistoryId === medication.id ? 'Hide History' : 'Show History'}
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

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600"
                style={{ width: `${(medication.doses_taken_today / medication.max_doses_per_day) * 100}%` }}
              ></div>
            </div>

            {/* Dose History Section - Inline Display */}
            {expandedHistoryId === medication.id && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-lg mb-3">Dose History</h4>
                
                {loadingHistory[medication.id] ? (
                  <div className="text-center py-4">
                    <div className="text-gray-500">Loading dose history...</div>
                  </div>
                ) : doseHistories[medication.id] && doseHistories[medication.id].length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(groupDosesByDate(doseHistories[medication.id])).map(([date, dayDoses]) => (
                      <div key={date} className="border-b pb-2">
                        <h5 className="font-medium text-gray-800">{date}</h5>
                        <div className="space-y-1 ml-4">
                          {(dayDoses as any[]).map((dose, index) => {
                            const { time } = formatDateTime(dose.taken_at);
                            return (
                              <div key={dose.id} className="flex items-center text-sm text-gray-600">
                                <span className="text-blue-600 font-medium">Dose {index + 1}:</span>
                                <span className="ml-2">{time}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No doses recorded yet</p>
                )}
              </div>
            )}
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

      {/* Daily Dose Log Modal */}
      <DailyDoseLog
        selectedDate={selectedDate}
        isOpen={showDailyLog}
        onClose={() => setShowDailyLog(false)}
      />
    </div>
  );
};

export default MedicationTracker;