import React, { useState, useEffect, useCallback } from 'react';
import { medicationApi, doseApi, personApi } from '../services/api';
import DailyDoseLog from './DailyDoseLog';
import PersonSelector from './PersonSelector';
import PersonManager from './PersonManager';
import DoseHistoryModal from './DoseHistoryModal';

const MedicationTracker = () => {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [doseHistories, setDoseHistories] = useState<{ [key: number]: any[] }>({});
  const [loadingHistory, setLoadingHistory] = useState<{ [key: number]: boolean }>({});
  
  // For handling deleted medications
  const [deletedMedications, setDeletedMedications] = useState<Array<{name: string, isDeleted: boolean}>>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [printMedicationTracking, setPrintMedicationTracking] = useState(false);
  const [deleteDoseConfirmId, setDeleteDoseConfirmId] = useState<number | null>(null);
  const [showTimeModal, setShowTimeModal] = useState<{ medicationId: number | null, show: boolean }>({ medicationId: null, show: false });
  const [customTime, setCustomTime] = useState<string>('');
  const [recordingDose, setRecordingDose] = useState<number | null>(null);
  const [timePickerPosition, setTimePickerPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [currentPersonId, setCurrentPersonId] = useState<number | null>(null);
  const [showPersonManager, setShowPersonManager] = useState(false);
  const [selectedMedicationForHistory, setSelectedMedicationForHistory] = useState<any>(null);

  // Form state for adding/editing medications
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    max_doses_per_day: 1,
    instructions: ''
  });

  const loadMedications = useCallback(async () => {
    if (!currentPersonId) {
      setLoading(false);
      return; // Don't load medications if no person is selected
    }
    
    try {
      setLoading(true);
      setError(null);
      const dateStr = formatDateForInput(selectedDate); // Use local timezone date string
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Get active medications
      const data = await medicationApi.getAll({ 
        date: dateStr,
        timezone_offset: timezoneOffset,
        person_id: currentPersonId 
      });
      setMedications(data);
      
      // Also get the daily summary to find any deleted medications with doses
      const dailySummary = await doseApi.getDailySummaryByDate(dateStr, timezoneOffset);
      
      // Extract deleted medications that have doses for this date
      const deleted = dailySummary.medications
        .filter((med: any) => med.is_deleted && med.doses_taken > 0)
        .map((med: any) => ({
          name: med.medication_name,
          isDeleted: true
        }));
      
      setDeletedMedications(deleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, currentPersonId]);

  // Load and select default person on component mount
  useEffect(() => {
    const loadDefaultPerson = async () => {
      try {
        // Only load default person if no person is currently selected
        if (!currentPersonId) {
          setLoading(true);
          const persons = await personApi.getAll();
          if (persons && persons.length > 0) {
            // Find default person or use the first one
            const defaultPerson = persons.find((p: any) => p.is_default) || persons[0];
            console.log('Auto-selecting default person:', defaultPerson.name);
            setCurrentPersonId(defaultPerson.id);
          }
        }
      } catch (err) {
        console.error('Error loading default person:', err);
        setError('Failed to load default person. Please select a person manually.');
      } finally {
        setLoading(false);
      }
    };
    
    loadDefaultPerson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Load medications when currentPersonId or selectedDate changes
  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleTakeMedication = async (medicationId: number, time?: string) => {
    // Prevent multiple simultaneous recordings for the same medication
    if (recordingDose === medicationId) {
      return;
    }
    
    try {
      setError(null);
      setRecordingDose(medicationId);
      
      if (time) {
        // If time is provided, use the date-specific API
        const dateStr = formatDateForInput(selectedDate); // Use local timezone date string
        const timezoneOffset = isToday(selectedDate) ? new Date().getTimezoneOffset() : undefined;
        await doseApi.recordDoseForDate(medicationId, dateStr, time, timezoneOffset);
      } else if (isPastDate(selectedDate) && !isToday(selectedDate)) {
        // For past dates, show time picker
        setShowTimeModal({ medicationId, show: true });
        setCustomTime(new Date().toTimeString().slice(0, 5));
        setRecordingDose(null);
        return;
      } else {
        // For today without custom time, include timezone offset
        const timezoneOffset = new Date().getTimezoneOffset();
        await doseApi.recordDoseWithTimezone(medicationId, timezoneOffset);
      }
      
      await loadMedications();
      // Refresh history if it's open
      if (expandedHistoryId === medicationId) {
        await loadDoseHistory(medicationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    } finally {
      setRecordingDose(null);
    }
  };

  const handleRecordDoseWithTime = async () => {
    if (showTimeModal.medicationId && customTime) {
      await handleTakeMedication(showTimeModal.medicationId, customTime);
      setShowTimeModal({ medicationId: null, show: false });
      setCustomTime('');
    }
  };
  
  

  const handleDeleteDose = async (medicationId: number, doseId: number) => {
    try {
      setError(null);
      await doseApi.deleteDose(doseId);
      setDeleteDoseConfirmId(null);
      // Refresh history and medications
      await loadDoseHistory(medicationId);
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dose');
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPersonId) {
      setError('Please select a person first');
      return;
    }
    try {
      setError(null);
      await medicationApi.create({
        ...formData,
        person_id: currentPersonId || undefined
      });
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
      await medicationApi.update(editingMedication.id, {
        ...formData,
        person_id: currentPersonId || undefined
      });
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
    // Create a date in local timezone based on the input value
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    // Compare dates using local timezone
    return date.toLocaleDateString() === today.toLocaleDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    // Use local date comparison
    const todayStr = today.toLocaleDateString();
    const compareDateStr = date.toLocaleDateString();
    return new Date(compareDateStr) < new Date(todayStr);
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    // Use local date comparison
    const todayStr = today.toLocaleDateString();
    const compareDateStr = date.toLocaleDateString();
    return new Date(compareDateStr) > new Date(todayStr);
  };

  // Format a date in YYYY-MM-DD format for the date input in local timezone
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  
  if (!currentPersonId) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Medication Tracker</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 text-center">
          <p className="mb-2">Welcome to MediTrack! Click the button below to select a person and manage their medications.</p>
          <button
            onClick={() => setShowPersonManager(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Select Person
          </button>
        </div>
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000]">
          <PersonManager
            isOpen={showPersonManager}
            onClose={() => setShowPersonManager(false)}
            currentPersonId={currentPersonId}
            onPersonChange={setCurrentPersonId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Medication Tracker</h1>
        <PersonSelector 
          currentPersonId={currentPersonId}
          onPersonChange={setCurrentPersonId}
          onManagePersons={() => setShowPersonManager(true)}
        />
      </div>

      {/* Date Navigation */}
      <div id="date-navigation" className="bg-white shadow rounded-lg p-4 mb-6 relative">
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
              value={formatDateForInput(selectedDate)}
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
        
        {/* Person Manager Modal - Positioned DIRECTLY under date section */}
        {showPersonManager && (
          <div className="absolute top-full left-0 right-0 z-[10000] mt-2">
            <PersonManager
              isOpen={showPersonManager}
              onClose={() => setShowPersonManager(false)}
              currentPersonId={currentPersonId}
              onPersonChange={setCurrentPersonId}
            />
          </div>
        )}
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
                <label htmlFor="medication-name" className="block text-sm font-medium mb-1">Name</label>
                <input
                  id="medication-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="medication-dosage" className="block text-sm font-medium mb-1">Dosage</label>
                <input
                  id="medication-dosage"
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="medication-frequency" className="block text-sm font-medium mb-1">Frequency</label>
                <input
                  id="medication-frequency"
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="medication-max-doses" className="block text-sm font-medium mb-1">Max Doses Per Day</label>
                <input
                  id="medication-max-doses"
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
              <label htmlFor="medication-instructions" className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                id="medication-instructions"
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
                {editingMedication ? 'Update' : 'Save'}
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
              <h3 
                className="text-lg font-semibold cursor-pointer text-blue-600 hover:text-blue-800"
                onClick={() => setSelectedMedicationForHistory(medication)}
              >
                {medication.name}
              </h3>
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
                  isFutureDate(selectedDate) ||
                  recordingDose === medication.id
                }
                className={`px-3 py-2 rounded-md ${
                  medication.doses_taken_today >= medication.max_doses_per_day || isFutureDate(selectedDate) || recordingDose === medication.id
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {recordingDose === medication.id
                  ? "Recording..."
                  : medication.doses_taken_today >= medication.max_doses_per_day
                  ? "Max Taken"
                  : isFutureDate(selectedDate)
                  ? "Future Date"
                  : isPastDate(selectedDate) && !isToday(selectedDate)
                  ? "Record Dose"
                  : "Take Now"}
              </button>
              {!isFutureDate(selectedDate) && medication.doses_taken_today < medication.max_doses_per_day && (
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropdownWidth = 256; // 64 * 4 = 256px (w-64 in tailwind)
                    const dropdownHeight = 200; // Approximate height of the dropdown
                    const padding = 10;
                    
                    let position = { top: 0, left: 0 };
                    
                    if (isMobile) {
                      // Center modal on mobile
                      position = {
                        top: window.scrollY + (window.innerHeight / 2) - (dropdownHeight / 2),
                        left: (window.innerWidth / 2) - (dropdownWidth / 2)
                      };
                    } else {
                      // Calculate horizontal position for desktop
                      let left = rect.left + window.scrollX;
                      
                      // Center the dropdown horizontally relative to the button
                      const buttonCenter = rect.left + (rect.width / 2);
                      left = buttonCenter - (dropdownWidth / 2) + window.scrollX;
                      
                      // Adjust if dropdown would go off-screen horizontally
                      if (left < padding) {
                        left = padding;
                      } else if (left + dropdownWidth > window.innerWidth - padding) {
                        left = window.innerWidth - dropdownWidth - padding;
                      }
                      
                      // Calculate vertical position
                      let top = rect.bottom + window.scrollY + 5;
                      const viewportBottom = window.innerHeight + window.scrollY;
                      
                      // Check if dropdown would go off-screen vertically
                      if (top + dropdownHeight > viewportBottom - padding) {
                        // Position above the button instead
                        top = rect.top + window.scrollY - dropdownHeight - 5;
                        
                        // If still off-screen at top, just position at the bottom of viewport
                        if (top < window.scrollY + padding) {
                          top = viewportBottom - dropdownHeight - padding;
                        }
                      }
                      
                      position = { top, left };
                    }
                    
                    setTimePickerPosition(position);
                    setShowTimeModal({ medicationId: medication.id, show: true });
                    setCustomTime(new Date().toTimeString().slice(0, 5));
                  }}
                  disabled={recordingDose === medication.id}
                  className={`px-3 py-2 rounded-md ${
                    recordingDose === medication.id
                      ? "text-gray-500 bg-gray-50 cursor-not-allowed"
                      : "text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  Take at Time
                </button>
              )}
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
                              <div key={dose.id} className="flex items-center justify-between text-sm text-gray-600">
                                <div>
                                  <span className="text-blue-600 font-medium">Dose {index + 1}:</span>
                                  <span className="ml-2">{time}</span>
                                </div>
                                <div>
                                  {deleteDoseConfirmId === dose.id ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleDeleteDose(medication.id, dose.id)}
                                        className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setDeleteDoseConfirmId(null)}
                                        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteDoseConfirmId(dose.id)}
                                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
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

      {/* Deleted Medications Section - only display if there are deleted medications with doses */}
      {deletedMedications.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Previously Recorded Medications</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              These medications have been deleted but have recorded dose history.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              {deletedMedications.map((medication, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                  <div>
                    <span className="font-medium">{medication.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Medication and Daily Log Buttons */}
      <div className="mt-6 text-center">
        <button 
          onClick={() => setIsAddingMedication(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md"
        >
          + Add Medication
        </button>
        <button
          onClick={() => setShowDailyLog(true)}
          className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          type="button"
        >
          View Daily Log
        </button>
        <button
          onClick={() => {
            setShowDailyLog(true);
            // Set a flag to automatically trigger print dialog when modal opens
            setPrintMedicationTracking(true);
          }}
          className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
          type="button"
          title="Generate a printable medication tracking form for this date"
        >
          Print Tracking Form
        </button>
      </div>

      {/* Daily Dose Log Modal */}
      <DailyDoseLog
        selectedDate={selectedDate}
        isOpen={showDailyLog}
        onClose={() => {
          setShowDailyLog(false);
          setPrintMedicationTracking(false);
        }}
        autoPrint={printMedicationTracking}
      />

      {/* Time Picker Dropdown */}
      {showTimeModal.show && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-25 transition-opacity duration-200" 
            onClick={() => setShowTimeModal({ medicationId: null, show: false })} 
          />
          <div 
            className={`${isMobile ? 'fixed' : 'absolute'} bg-white rounded-lg p-4 shadow-xl border z-50 w-64 transition-all duration-200 transform ${isMobile ? 'animate-slideUp' : 'animate-fadeIn'}`}
            style={{
              top: `${timePickerPosition.top}px`,
              left: `${timePickerPosition.left}px`,
              maxWidth: '90vw',
            }}
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold mb-1">Select Time</h3>
              <p className="text-xs text-gray-600">
                {selectedDate.toLocaleDateString()}
              </p>
            </div>
            <div className="mb-3">
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecordDoseWithTime}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Record
              </button>
              <button
                onClick={() => {
                  setShowTimeModal({ medicationId: null, show: false });
                  setCustomTime('');
                }}
                className="flex-1 px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Dose History Modal */}
      {selectedMedicationForHistory && (
        <DoseHistoryModal
          medication={selectedMedicationForHistory}
          onClose={() => setSelectedMedicationForHistory(null)}
        />
      )}
      
    </div>
  );
};

export default MedicationTracker;