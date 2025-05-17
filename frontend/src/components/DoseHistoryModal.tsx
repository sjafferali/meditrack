import React, { useState, useEffect, useCallback } from 'react';
import { doseApi } from '../services/api';

interface DoseHistoryModalProps {
  medication: {
    id: number;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

interface Dose {
  id: number;
  medication_id: number;
  taken_at: string;
}

const DoseHistoryModal: React.FC<DoseHistoryModalProps> = ({ medication, isOpen, onClose }) => {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDoseHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doseApi.getDoses(medication.id);
      setDoses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dose history');
    } finally {
      setLoading(false);
    }
  }, [medication.id]);

  useEffect(() => {
    if (isOpen && medication) {
      loadDoseHistory();
    }
  }, [isOpen, medication, loadDoseHistory]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const groupDosesByDate = (doses: Dose[]) => {
    const grouped: { [key: string]: Dose[] } = {};
    doses.forEach(dose => {
      const { date } = formatDateTime(dose.taken_at);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(dose);
    });
    return grouped;
  };

  if (!isOpen) return null;

  const groupedDoses = groupDosesByDate(doses);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Dose History - {medication.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-gray-500">Loading dose history...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedDoses).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No doses recorded yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedDoses).map(([date, dayDoses]) => (
                  <div key={date} className="border-b pb-3">
                    <h3 className="font-semibold text-lg mb-2 text-gray-800">{date}</h3>
                    <div className="space-y-1">
                      {dayDoses.map((dose, index) => {
                        const { time } = formatDateTime(dose.taken_at);
                        return (
                          <div key={dose.id} className="flex items-center text-gray-600">
                            <span className="text-blue-600 font-medium">Dose {index + 1}:</span>
                            <span className="ml-2">{time}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoseHistoryModal;