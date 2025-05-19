import React, { useState, useEffect } from 'react';
import { personApi } from '../services/api';

interface Person {
  id: number;
  name: string;
  date_of_birth?: string | null;
  notes?: string | null;
  is_default: boolean;
  medication_count?: number;
}

interface PersonManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPersonId: number | null;
  onPersonChange: (personId: number) => void;
}

const PersonManager: React.FC<PersonManagerProps> = ({
  isOpen,
  onClose,
  currentPersonId,
  onPersonChange
}) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPersons();
    }
  }, [isOpen]);

  const loadPersons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await personApi.getAll();
      setPersons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load persons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const newPerson = await personApi.create({
        ...formData,
        date_of_birth: formData.date_of_birth || null
      });
      setPersons([...persons, newPerson]);
      setIsAddingPerson(false);
      resetForm();
      
      // Switch to newly created person
      onPersonChange(newPerson.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add person');
    }
  };

  const handleUpdatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    
    try {
      setError(null);
      const updatedPerson = await personApi.update(editingPerson.id, {
        ...formData,
        date_of_birth: formData.date_of_birth || null
      });
      
      setPersons(persons.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      setEditingPerson(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update person');
    }
  };

  const handleDeletePerson = async (id: number) => {
    try {
      setError(null);
      await personApi.delete(id);
      setDeleteConfirmId(null);
      setPersons(persons.filter(p => p.id !== id));
      
      // If the deleted person was the current person, switch to another
      if (currentPersonId === id && persons.length > 1) {
        const remainingPersons = persons.filter(p => p.id !== id);
        const defaultPerson = remainingPersons.find(p => p.is_default) || remainingPersons[0];
        onPersonChange(defaultPerson.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete person');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      setError(null);
      const updatedPerson = await personApi.setDefault(id);
      // Update the persons list to reflect the new default
      setPersons(persons.map(p => ({
        ...p,
        is_default: p.id === id
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default person');
    }
  };

  const startEdit = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      date_of_birth: person.date_of_birth || '',
      notes: person.notes || ''
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date_of_birth: '',
      notes: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg w-full max-w-2xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Manage People</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
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

            {/* Add/Edit Person Form */}
            {(isAddingPerson || editingPerson) && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">
                  {editingPerson ? 'Edit Person' : 'Add New Person'}
                </h3>
                <form onSubmit={editingPerson ? handleUpdatePerson : handleAddPerson}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="person-name" className="block text-sm font-medium mb-1">Name</label>
                      <input
                        id="person-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="person-dob" className="block text-sm font-medium mb-1">Date of Birth</label>
                      <input
                        id="person-dob"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="person-notes" className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      id="person-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      {editingPerson ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPerson(false);
                        setEditingPerson(null);
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

            {/* Persons List */}
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {persons.map((person) => (
                  <div key={person.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium">{person.name}</h4>
                        {person.date_of_birth && (
                          <p className="text-sm text-gray-500">
                            Born: {new Date(person.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                        {person.notes && (
                          <p className="text-sm text-gray-600 mt-1">{person.notes}</p>
                        )}
                        {person.medication_count !== undefined && (
                          <p className="text-sm text-gray-500 mt-1">
                            {person.medication_count} medication{person.medication_count !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {person.is_default && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>
                        )}
                        {!person.is_default && (
                          <button
                            onClick={() => handleSetDefault(person.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(person)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        {deleteConfirmId === person.id ? (
                          <>
                            <button
                              onClick={() => handleDeletePerson(person.id)}
                              className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(person.id)}
                            className="text-red-600 hover:text-red-800"
                            disabled={persons.length === 1}
                            title={persons.length === 1 ? "Cannot delete the last person" : ""}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Person Button */}
            {!isAddingPerson && !editingPerson && (
              <button 
                onClick={() => setIsAddingPerson(true)}
                className="mt-6 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md"
              >
                + Add Person
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonManager;