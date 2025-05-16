import React, { useState } from 'react';

const MedicationTracker = () => {
  // Sample medication data - in a real app this would come from a database
  const [medications, setMedications] = useState([
    {
      id: 1,
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      maxDosesPerDay: 1,
      dosesTaken: 0,
      lastTakenAt: null,
      instructions: "Take with food in the morning"
    },
    {
      id: 2,
      name: "Ibuprofen",
      dosage: "200mg",
      frequency: "Every 6 hours as needed",
      maxDosesPerDay: 4,
      dosesTaken: 1,
      lastTakenAt: "08:30 AM",
      instructions: "Take with food or milk"
    },
    {
      id: 3,
      name: "Vitamin D",
      dosage: "1000 IU",
      frequency: "Once daily",
      maxDosesPerDay: 1,
      dosesTaken: 0,
      lastTakenAt: null,
      instructions: "Take with a meal"
    },
    {
      id: 4,
      name: "Amoxicillin",
      dosage: "500mg",
      frequency: "Every 8 hours",
      maxDosesPerDay: 3,
      dosesTaken: 2,
      lastTakenAt: "2:15 PM",
      instructions: "Complete full course of treatment"
    }
  ]);

  // Function to handle taking medication
  const takeMedication = (id) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setMedications(medications.map(med => {
      if (med.id === id && med.dosesTaken < med.maxDosesPerDay) {
        return {
          ...med,
          dosesTaken: med.dosesTaken + 1,
          lastTakenAt: timeString
        };
      }
      return med;
    }));
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Medication Tracker</h1>
        <p className="text-gray-600">Track your daily medications</p>
        <p className="text-sm text-gray-500 mt-1">Today: {new Date().toLocaleDateString()}</p>
      </div>

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
                  <span className="text-blue-600">{medication.dosesTaken}</span>
                  <span className="text-gray-500"> / {medication.maxDosesPerDay} doses taken</span>
                </div>
                <div className="text-xs text-gray-500">
                  {medication.lastTakenAt 
                    ? `Last taken: ${medication.lastTakenAt}` 
                    : "Not taken today"}
                </div>
              </div>

              {/* Take Button */}
              <div className="md:ml-4">
                <button
                  onClick={() => takeMedication(medication.id)}
                  disabled={medication.dosesTaken >= medication.maxDosesPerDay}
                  className={`w-full md:w-auto px-4 py-2 rounded-md text-white font-medium ${
                    medication.dosesTaken >= medication.maxDosesPerDay
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {medication.dosesTaken >= medication.maxDosesPerDay
                    ? "Max Taken"
                    : "Take Now"}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600"
                style={{ width: `${(medication.dosesTaken / medication.maxDosesPerDay) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Medication Button - for a complete app */}
      <div className="mt-6 text-center">
        <button className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md">
          + Add Medication
        </button>
      </div>
    </div>
  );
};

export default MedicationTracker;
