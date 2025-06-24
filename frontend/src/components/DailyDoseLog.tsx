import React, { useState, useEffect } from 'react';
import { doseApi } from '../services/api';

// Optional import to allow tests to run without react-router-dom
let useParams: () => { personId?: string } = () => ({ personId: undefined });
try {
  const router = require('react-router-dom');
  if (router && router.useParams) {
    useParams = router.useParams;
  }
} catch (error) {
  // Silently fail if react-router-dom is not available (in tests)
  console.log('React Router not available, using mock useParams');
}

interface DailyDoseLogProps {
  selectedDate: Date;
  isOpen: boolean;
  onClose: () => void;
  personId?: string; // Optional prop for tests
  autoPrint?: boolean; // Automatically trigger print when true
}

interface DailySummary {
  date: string;
  medications: Array<{
    medication_id: number | null;
    medication_name: string;
    doses_taken: number;
    max_doses: number;
    dose_times: string[];
    is_deleted?: boolean;
  }>;
}

const DailyDoseLog: React.FC<DailyDoseLogProps> = ({ selectedDate, isOpen, onClose, personId: propPersonId, autoPrint = false }) => {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Get the current person ID from the URL if available, or from props
  const { personId: urlPersonId } = useParams();
  const personId = propPersonId || urlPersonId;

  const loadDailySummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Format date directly from the Date object to ensure correct date in local timezone
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get timezone offset in minutes from user's browser
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Pass timezone offset as a number
      const data = await doseApi.getDailySummaryByDate(dateStr, timezoneOffset);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  // Function to reload data - helpful for fixing inconsistent loading issues
  const reloadDailySummary = async () => {
    if (!loading) {
      await loadDailySummary();
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDailySummary();
      
      // Set up a small delay then reload to ensure data is properly loaded
      // This helps fix the issue where data doesn't appear on first attempt
      const reloadTimer = setTimeout(() => {
        reloadDailySummary();
      }, 300);
      
      return () => clearTimeout(reloadTimer);
    }
  }, [isOpen, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Effect to handle automatic printing when requested
  useEffect(() => {
    // Only trigger when modal is open, summary is loaded, and autoPrint is true
    if (isOpen && !loading && !error && summary && autoPrint) {
      // Short delay to ensure the modal is fully rendered
      const printTimer = setTimeout(() => {
        handlePrintTracking();
      }, 500);
      
      return () => clearTimeout(printTimer);
    }
  }, [isOpen, loading, error, summary, autoPrint]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimeFromISO = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatExportText = () => {
    if (!summary) return '';

    // Use the selectedDate from props instead of summary.date to ensure consistency
    const dateFormatted = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let text = `MEDICATION LOG - ${dateFormatted}\n`;
    text += '═'.repeat(40) + '\n\n';

    // Collect all doses with medication names
    const allDoses: Array<{ time: string; medication: string; dosage?: string; isDeleted?: boolean }> = [];
    
    summary.medications.forEach(medication => {
      if (medication.doses_taken > 0) {
        medication.dose_times.forEach(time => {
          allDoses.push({
            time,
            medication: medication.medication_name,
            isDeleted: medication.is_deleted || false
          });
        });
      }
    });

    // Sort by time
    allDoses.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    if (allDoses.length === 0) {
      text += 'No medications taken on this date.\n';
    } else {
      allDoses.forEach(dose => {
        // Add appropriate formatting for deleted medications
        const medicationText = dose.isDeleted 
          ? `${dose.medication}` // The (deleted) suffix is already added by the backend
          : dose.medication;
        
        text += `${formatTimeFromISO(dose.time)} - ${medicationText}\n`;
      });
    }

    text += '\n' + '─'.repeat(40) + '\n';
    text += `Generated on: ${new Date().toLocaleString()}`;

    return text;
  };

  const handleCopyToClipboard = async () => {
    try {
      const text = formatExportText();
      
      // Fallback for environments where clipboard API might not be available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback method using a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard. Please try again.');
    }
  };
  
  const handlePrintTracking = async () => {
    try {
        setError(null);
      
      // Format date for the API call - YYYY-MM-DD format
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get timezone offset in minutes from user's browser
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Prepare options for the PDF generation
      const options: {
        timezoneOffset: number;
        days: number;
        personId?: number;
      } = {
        timezoneOffset,
        days: 1 // Default to 1 day
      };
      
      // Add person ID if available
      if (personId) {
        options.personId = parseInt(personId, 10);
      }
      
      // Call the API to generate and download the PDF
      await doseApi.downloadMedicationTrackingPDF(dateStr, options);
      
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF tracking form');
    } finally {
      }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal content */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-2xl w-[90%] max-h-[80vh] overflow-hidden flex flex-col z-[10000] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Daily Medication Log</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-center mb-4">
          <p className="text-lg text-gray-600 font-semibold">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading daily log...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex justify-between">
              <span>{error}</span>
              <button
                onClick={reloadDailySummary}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {!loading && !error && (!summary || (summary?.medications?.length === 0 && summary?.date)) && (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-2">No data found for this date.</p>
            <button
              onClick={reloadDailySummary}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors text-sm"
            >
              Reload Data
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{formatExportText()}</pre>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleCopyToClipboard}
                className={`px-6 py-2 rounded-md transition-colors ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handlePrintTracking}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Print Tracking Form
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DailyDoseLog;