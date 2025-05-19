# MediTrack API Documentation

## Overview

The MediTrack API is a RESTful API built with FastAPI that provides endpoints for person management, medication management, and dose tracking. The API supports multi-person functionality, allowing you to track medications for multiple family members or patients. All responses are in JSON format.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

Currently, the API does not require authentication. This will be implemented in a future release.

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Endpoints

### Person Management

#### List All Persons
Get a list of all persons in the system.

```http
GET /persons/
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "date_of_birth": "1985-05-15",
    "notes": "Primary user",
    "is_default": true,
    "created_at": "2024-01-15T08:00:00",
    "medication_count": 3
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "date_of_birth": "1992-03-20",
    "notes": "Family member",
    "is_default": false,
    "created_at": "2024-01-16T09:00:00",
    "medication_count": 1
  }
]
```

#### Create Person
Add a new person to track medications for.

```http
POST /persons/
```

**Request Body:**
```json
{
  "name": "Bob Johnson",
  "date_of_birth": "1978-11-10",
  "notes": "Elderly parent"
}
```

**Response:**
```json
{
  "id": 3,
  "name": "Bob Johnson",
  "date_of_birth": "1978-11-10",
  "notes": "Elderly parent",
  "is_default": false,
  "created_at": "2024-01-17T10:00:00"
}
```

#### Get Person by ID
Retrieve details of a specific person.

```http
GET /persons/{person_id}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "date_of_birth": "1985-05-15",
  "notes": "Primary user",
  "is_default": true,
  "created_at": "2024-01-15T08:00:00",
  "medication_count": 3
}
```

#### Update Person
Update an existing person's details.

```http
PUT /persons/{person_id}
```

**Request Body:**
```json
{
  "name": "John Doe",
  "date_of_birth": "1985-05-15",
  "notes": "Updated notes"
}
```

#### Delete Person
Remove a person from the system. This will also delete all their medications and dose history.

```http
DELETE /persons/{person_id}
```

**Response:**
```
HTTP 204 No Content
```

#### Set Default Person
Set a person as the default (automatically selected on login).

```http
PUT /persons/{person_id}/set-default
```

**Response:**
```json
{
  "id": 2,
  "name": "Jane Smith",
  "date_of_birth": "1992-03-20",
  "notes": "Family member",
  "is_default": true,
  "created_at": "2024-01-16T09:00:00"
}
```

### Medications

#### List All Medications
Get a list of all medications with their current dose information. Medications are filtered by the selected person.

```http
GET /medications/
```

**Query Parameters:**
- `person_id` (required): ID of the person to get medications for
- `skip` (optional): Number of items to skip (default: 0)
- `limit` (optional): Maximum number of items to return (default: 100)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Lisinopril",
    "dosage": "10mg",
    "frequency": "Once daily",
    "max_doses_per_day": 1,
    "instructions": "Take with food in the morning",
    "created_at": "2024-01-15T08:00:00",
    "updated_at": "2024-01-15T08:00:00",
    "doses_taken_today": 0,
    "last_taken_at": null
  },
  {
    "id": 2,
    "name": "Ibuprofen",
    "dosage": "200mg",
    "frequency": "Every 6 hours as needed",
    "max_doses_per_day": 4,
    "instructions": "Take with food or milk",
    "created_at": "2024-01-15T08:00:00",
    "updated_at": "2024-01-15T08:00:00",
    "doses_taken_today": 2,
    "last_taken_at": "2024-01-15T14:30:00"
  }
]
```

#### Create Medication
Add a new medication to track.

```http
POST /medications/
```

**Request Body:**
```json
{
  "person_id": 1,
  "name": "Aspirin",
  "dosage": "81mg",
  "frequency": "Once daily",
  "max_doses_per_day": 1,
  "instructions": "Take with water"
}
```

**Response:**
```json
{
  "id": 3,
  "name": "Aspirin",
  "dosage": "81mg",
  "frequency": "Once daily",
  "max_doses_per_day": 1,
  "instructions": "Take with water",
  "created_at": "2024-01-15T10:00:00",
  "updated_at": null
}
```

**Validation Rules:**
- `person_id`: Required, integer (must be valid person ID)
- `name`: Required, string
- `dosage`: Required, string
- `frequency`: Required, string
- `max_doses_per_day`: Required, integer between 1 and 20
- `instructions`: Optional, string

#### Get Medication by ID
Retrieve details of a specific medication.

```http
GET /medications/{medication_id}
```

**Response:**
```json
{
  "id": 1,
  "name": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "max_doses_per_day": 1,
  "instructions": "Take with food in the morning",
  "created_at": "2024-01-15T08:00:00",
  "updated_at": "2024-01-15T08:00:00",
  "doses_taken_today": 1,
  "last_taken_at": "2024-01-15T09:30:00"
}
```

#### Update Medication
Update an existing medication's details.

```http
PUT /medications/{medication_id}
```

**Request Body (all fields optional):**
```json
{
  "name": "Lisinopril",
  "dosage": "20mg",
  "frequency": "Once daily",
  "max_doses_per_day": 1,
  "instructions": "Take with food in the morning"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Lisinopril",
  "dosage": "20mg",
  "frequency": "Once daily",
  "max_doses_per_day": 1,
  "instructions": "Take with food in the morning",
  "created_at": "2024-01-15T08:00:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

#### Delete Medication
Remove a medication from tracking.

```http
DELETE /medications/{medication_id}
```

**Response:**
```
HTTP 204 No Content
```

### Doses

#### Record a Dose
Record taking a medication dose.

```http
POST /doses/medications/{medication_id}/dose
```

**Response:**
```json
{
  "id": 123,
  "medication_id": 1,
  "taken_at": "2024-01-15T14:30:00"
}
```

**Error Response (if daily limit reached):**
```json
{
  "detail": "Maximum doses (1) taken today"
}
```

#### Get Dose History
Retrieve the dose history for a specific medication.

```http
GET /doses/medications/{medication_id}/doses
```

**Query Parameters:**
- `skip` (optional): Number of items to skip (default: 0)
- `limit` (optional): Maximum number of items to return (default: 100)

**Response:**
```json
[
  {
    "id": 123,
    "medication_id": 1,
    "taken_at": "2024-01-15T14:30:00"
  },
  {
    "id": 122,
    "medication_id": 1,
    "taken_at": "2024-01-14T09:15:00"
  }
]
```

#### Get Daily Summary
Get a summary of all medications and doses taken today.

```http
GET /doses/daily-summary
```

**Response:**
```json
{
  "date": "2024-01-15",
  "medications": [
    {
      "medication_id": 1,
      "medication_name": "Lisinopril",
      "doses_taken": 1,
      "max_doses": 1,
      "dose_times": ["2024-01-15T09:30:00"]
    },
    {
      "medication_id": 2,
      "medication_name": "Ibuprofen",
      "doses_taken": 2,
      "max_doses": 4,
      "dose_times": ["2024-01-15T08:00:00", "2024-01-15T14:30:00"]
    }
  ]
}
```

## Example Usage

### Using cURL

#### Create a new medication:
```bash
curl -X POST "http://localhost:8000/api/v1/medications/" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Vitamin D",
       "dosage": "1000 IU",
       "frequency": "Once daily",
       "max_doses_per_day": 1,
       "instructions": "Take with meal"
     }'
```

#### Record a dose:
```bash
curl -X POST "http://localhost:8000/api/v1/doses/medications/1/dose"
```

#### Get daily summary:
```bash
curl "http://localhost:8000/api/v1/doses/daily-summary"
```

### Using JavaScript/Axios

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create a medication
const createMedication = async (medicationData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/medications/`, medicationData);
    return response.data;
  } catch (error) {
    console.error('Error creating medication:', error.response.data.detail);
  }
};

// Record a dose
const recordDose = async (medicationId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/doses/medications/${medicationId}/dose`);
    return response.data;
  } catch (error) {
    console.error('Error recording dose:', error.response.data.detail);
  }
};

// Get daily summary
const getDailySummary = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/doses/daily-summary`);
    return response.data;
  } catch (error) {
    console.error('Error fetching daily summary:', error.response.data.detail);
  }
};
```

### Using Python/requests

```python
import requests

API_BASE_URL = 'http://localhost:8000/api/v1'

# Create a medication
def create_medication(medication_data):
    response = requests.post(f'{API_BASE_URL}/medications/', json=medication_data)
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Error: {response.json()['detail']}")

# Record a dose
def record_dose(medication_id):
    response = requests.post(f'{API_BASE_URL}/doses/medications/{medication_id}/dose')
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Error: {response.json()['detail']}")

# Get daily summary
def get_daily_summary():
    response = requests.get(f'{API_BASE_URL}/doses/daily-summary')
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.json()['detail']}")

# Example usage
medication = create_medication({
    "name": "Vitamin D",
    "dosage": "1000 IU",
    "frequency": "Once daily",
    "max_doses_per_day": 1,
    "instructions": "Take with meal"
})

dose = record_dose(medication['id'])
summary = get_daily_summary()
```

## Rate Limiting

Currently, there are no rate limits implemented. This feature is planned for future releases.

## WebSocket Support

Future versions will include WebSocket support for real-time dose tracking updates.

## API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

These interfaces allow you to explore and test the API endpoints directly from your browser.