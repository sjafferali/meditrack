import React, { useState, useEffect, useRef } from 'react';
import { personApi } from '../services/api';

interface Person {
  id: number;
  name: string;
  is_default: boolean;
  medication_count?: number;
}

interface PersonSelectorProps {
  currentPersonId: number | null;
  onPersonChange: (personId: number) => void;
  onManagePersons: () => void;
}

const PersonSelector: React.FC<PersonSelectorProps> = ({ 
  currentPersonId, 
  onPersonChange,
  onManagePersons 
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPersons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPersons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await personApi.getAll();
      setPersons(data);
      
      // If no current person is selected, select the default person
      if (!currentPersonId && data.length > 0) {
        const defaultPerson = data.find((p: Person) => p.is_default) || data[0];
        console.log('Setting default person:', defaultPerson);
        onPersonChange(defaultPerson.id);
      }
      
      // Force selection of a person if none is selected at this point
      if (data.length > 0 && !currentPersonId) {
        console.log('Forcing person selection as fallback');
        onPersonChange(data[0].id);
      }
    } catch (err) {
      console.error('Person loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load persons');
      
      // Fallback: Create a local default person if API fails
      if (!currentPersonId) {
        console.log('Using fallback local person');
        const fallbackPerson = { id: 1, name: 'Default Person', is_default: true };
        setPersons([fallbackPerson]);
        onPersonChange(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePersonSelect = (personId: number) => {
    onPersonChange(personId);
    setIsOpen(false);
  };

  const currentPerson = persons.find(p => p.id === currentPersonId);

  if (loading) {
    return <div className="inline-block px-4 py-2 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="inline-block px-4 py-2 text-red-500">Error: {error}</div>;
  }

  return (
    <div 
      className="relative w-[320px] min-w-[320px] max-w-[320px] overflow-hidden" 
      ref={dropdownRef} 
      style={{ isolation: 'isolate', boxSizing: 'border-box' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[320px] h-[48px] min-w-[320px] max-w-[320px] min-h-[48px] max-h-[48px] flex items-center justify-between px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
        style={{ boxSizing: 'border-box' }}
      >
        <span className="font-medium truncate mr-3 flex-1 min-w-0">{currentPerson?.name || 'Select Person'}</span>
        <svg 
          className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed z-50 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          style={{ 
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
            boxSizing: 'border-box'
          }}
        >
          <div className="py-2">
            {persons.map((person) => (
              <button
                key={person.id}
                onClick={() => handlePersonSelect(person.id)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between min-w-0 overflow-hidden ${
                  person.id === currentPersonId ? 'bg-blue-50' : ''
                }`}
                style={{ boxSizing: 'border-box' }}
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="font-medium truncate">{person.name}</div>
                  {person.medication_count !== undefined && (
                    <div className="text-sm text-gray-500 truncate">
                      {person.medication_count} medication{person.medication_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {person.is_default && (
                  <span className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                onManagePersons();
              }}
              className="w-full px-4 py-3 text-left text-blue-600 hover:bg-gray-50 font-medium truncate overflow-hidden"
              style={{ boxSizing: 'border-box' }}
            >
              Manage People
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonSelector;