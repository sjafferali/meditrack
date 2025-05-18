import React, { useState, useEffect } from 'react';
import { doseApi } from '../services/api';

interface DailyDoseLogProps {
  selectedDate: Date;
  isOpen: boolean;
  onClose: () => void;
}

interface DailySummary {
  date: string;
  medications: Array<{
    medication_id: number;
    medication_name: string;
    doses_taken: number;
    max_doses: number;
    dose_times: string[];
  }>;
}

const DailyDoseLog: React.FC<DailyDoseLogProps> = ({ selectedDate, isOpen, onClose }) => {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDailySummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await doseApi.getDailySummaryByDate(dateStr);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDailySummary();
    }
  }, [isOpen, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimeFromISO = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatExportText = () => {
    if (!summary) return '';

    const dateFormatted = new Date(summary.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let text = `MEDICATION LOG - ${dateFormatted}\n`;
    text += '═'.repeat(40) + '\n\n';

    // Collect all doses with medication names
    const allDoses: Array<{ time: string; medication: string; dosage?: string }> = [];
    
    summary.medications.forEach(medication => {
      if (medication.doses_taken > 0) {
        medication.dose_times.forEach(time => {
          allDoses.push({
            time,
            medication: medication.medication_name
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
        text += `${formatTimeFromISO(dose.time)} - ${dose.medication}\n`;
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
          <p className="text-lg text-gray-600">
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
            {error}
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