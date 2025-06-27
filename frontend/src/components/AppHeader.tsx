import React, { useState, useEffect } from 'react';
import { personApi } from '../services/api';

interface Person {
  id: number;
  first_name: string;
  last_name?: string;
  name?: string; // computed: first_name + (last_name ? ' ' + last_name : '')
  is_default: boolean;
  medication_count?: number;
}

interface AppHeaderProps {
  currentPersonId: number | null;
  onPersonChange: (personId: number) => void;
  onManagePersons: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  currentPersonId, 
  onPersonChange,
  onManagePersons 
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersons();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPersons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await personApi.getAll();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setPersons(data);
        
        // If no current person is selected, select the default person
        if (!currentPersonId && data.length > 0) {
          const defaultPerson = data.find((p: Person) => p.is_default) || data[0];
          onPersonChange(defaultPerson.id);
        }
        
        // Force selection of a person if none is selected at this point
        if (data.length > 0 && !currentPersonId) {
          onPersonChange(data[0].id);
        }
      } else {
        console.error('API returned non-array data:', data);
        setPersons([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error loading persons:', err);
      setPersons([]); // Ensure persons is always an array
      setError(err instanceof Error ? err.message : 'Failed to load persons');
      
      // Fallback: Create a local default person if API fails
      if (!currentPersonId) {
        const fallbackPerson = { id: 1, first_name: 'Default', last_name: 'Person', name: 'Default Person', is_default: true };
        setPersons([fallbackPerson]);
        onPersonChange(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentPerson = persons.find(p => p.id === currentPersonId);
  
  const getInitials = (person: Person | undefined) => {
    if (!person || !person.first_name) return '?';
    
    if (person.last_name) {
      return `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
    }
    // If no last name, use first two letters of first name
    return person.first_name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between">
          {/* App Title */}
          <h1 className="text-xl font-bold text-blue-600">MediTrack</h1>

          {/* Person Selection */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                <span className="text-sm">Loading...</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">Error loading persons</div>
            ) : (
              <>
                {/* Current Person Display */}
                <div className="flex items-center gap-2">
                  {/* Avatar with integrated dropdown */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center relative hover:bg-blue-200 transition-colors">
                      <span className="text-blue-600 font-medium text-sm absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        {getInitials(currentPerson)}
                      </span>
                    </div>
                    
                    {/* Person Selector - positioned over avatar */}
                    <select
                      value={currentPersonId || ''}
                      onChange={(e) => onPersonChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title={currentPerson?.name || `${currentPerson?.first_name} ${currentPerson?.last_name || ''}`.trim() || 'Select Person'}
                    >
                      {Array.isArray(persons) && persons.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name || `${person.first_name} ${person.last_name || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Manage Button */}
                  <button
                    onClick={onManagePersons}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200"
                    title="Manage People"
                  >
                    Manage
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;