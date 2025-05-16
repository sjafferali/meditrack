# MediTrack - Medication Tracker

A web application for tracking daily medication doses, built with FastAPI (backend) and React (frontend).

## Features

- ✅ View and manage medications
- ✅ Track daily doses with automatic counting
- ✅ Enforce maximum daily dose limits
- ✅ Record dose timestamps
- ✅ Display last taken time
- ✅ Add, edit, and delete medications
- ✅ Real-time dose count updates
- ✅ Data persistence with SQLite

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, Alembic
- **Frontend**: React, Axios
- **Testing**: pytest, Jest
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sjafferali/meditrack.git
cd meditrack
```

2. Start both servers:
```bash
./start_dev.sh
```

Or start them separately:

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_data.py  # Optional: Add sample data
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Usage

1. Access the frontend at http://localhost:3000
2. API documentation is available at http://localhost:8000/docs

### Managing Medications

- Click "Add Medication" to create a new medication
- Click "Edit" to modify medication details
- Click "Delete" to remove a medication (with confirmation)
- Click "Take Now" to record a dose

### Tracking Doses

- The app displays how many doses have been taken today
- A progress bar shows daily dose completion
- The "Take Now" button is disabled when the daily limit is reached
- Last taken time is displayed for each medication

## API Endpoints

### Medications
- `GET /api/v1/medications/` - List all medications
- `POST /api/v1/medications/` - Create new medication
- `GET /api/v1/medications/{id}` - Get medication details
- `PUT /api/v1/medications/{id}` - Update medication
- `DELETE /api/v1/medications/{id}` - Delete medication

### Doses
- `POST /api/v1/doses/medications/{id}/dose` - Record a dose
- `GET /api/v1/doses/medications/{id}/doses` - Get dose history
- `GET /api/v1/doses/daily-summary` - Get daily summary

## Docker Support

Build and run with Docker Compose:

```bash
docker-compose up
```

## Testing

### Backend Tests

```bash
cd backend
pytest -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Development

- Backend development server: http://localhost:8000
- Frontend development server: http://localhost:3000
- API documentation: http://localhost:8000/docs

## Project Structure

```
meditrack/
├── backend/
│   ├── app/
│   │   ├── api/        # API endpoints
│   │   ├── core/       # Core configuration
│   │   ├── db/         # Database setup
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic schemas
│   │   └── services/   # Business logic
│   ├── alembic/        # Database migrations
│   ├── tests/          # Backend tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── services/   # API client
│   │   └── App.js      # Main app component
│   ├── public/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write or update tests
4. Ensure all tests pass
5. Submit a pull request

## License

[MIT License](LICENSE)