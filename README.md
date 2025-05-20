# MediTrack 💊

[![CI Pipeline](https://github.com/sjafferali/meditrack/actions/workflows/ci.yml/badge.svg)](https://github.com/sjafferali/meditrack/actions/workflows/ci.yml)
[![Security Scan](https://github.com/sjafferali/meditrack/actions/workflows/security.yml/badge.svg)](https://github.com/sjafferali/meditrack/actions/workflows/security.yml)
[![codecov](https://codecov.io/gh/sjafferali/meditrack/branch/main/graph/badge.svg)](https://codecov.io/gh/sjafferali/meditrack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MediTrack is a modern medication tracking application that helps users manage their daily medication schedules and maintain adherence to their prescribed regimens. Built with FastAPI and React, it provides a clean, intuitive interface for medication management with robust API support. Done

## 🌟 Features

- **Multi-Person Support**: Track medications for multiple family members or patients
- **Medication Management**: Add, edit, and delete medications with detailed information
- **Dose Tracking**: Record when medications are taken with automatic daily limit enforcement
- **Daily Summary**: View comprehensive daily medication status and history
- **Real-time Updates**: Instant UI updates when doses are recorded
- **Progress Tracking**: Visual progress bars showing daily dose completion
- **Person Management**: Create and manage profiles for different individuals
- **Data Persistence**: Reliable SQLite database with migration support
- **RESTful API**: Full-featured API with automatic documentation
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Security First**: Regular vulnerability scanning and security best practices

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional)
- Git

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/sjafferali/meditrack.git
cd meditrack

# Build the single-container image
docker build -t meditrack:latest .

# Option 1: Start with SQLite (simplest)
docker compose -f docker-compose.simple.yml up -d

# Option 2: Start with PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Access the application at http://localhost:8080
```

### Manual Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sjafferali/meditrack.git
   cd meditrack
   ```

2. **Set up the backend**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Set up the database
   alembic upgrade head
   
   # Run the backend server
   uvicorn app.main:app --reload
   ```

3. **Set up the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs
   - Alternative API Docs: http://localhost:8000/redoc

## 📱 Usage

### Managing People

1. **Select Person**: Use the person selector dropdown in the header to switch between individuals
2. **Add Person**: Click "Manage People" to add new family members or patients
3. **Edit Person**: Update person details including name, date of birth, and notes
4. **Set Default**: Mark a person as the default for quick access

### Managing Medications

1. **Add a Medication**: Click "Add Medication" and fill in the details
2. **Edit Medication**: Click "Edit" on any medication card to modify details
3. **Delete Medication**: Click "Delete" to remove (with confirmation)
4. **Record a Dose**: Click "Take Now" to record taking a medication

### Tracking Your Doses

- View daily dose count for each medication
- Progress bars show completion towards daily limits
- "Take Now" button disables when daily limit is reached
- Last taken time displayed for each medication
- Daily summary available through the API
- Each person's medications are tracked separately

## 🏗️ Architecture

```
meditrack/
├── backend/              # FastAPI backend
│   ├── app/             # Application code
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core configurations
│   │   ├── db/          # Database configurations
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # Business logic
│   ├── tests/           # Backend tests
│   ├── alembic/         # Database migrations
│   └── requirements.txt # Python dependencies
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── __tests__/   # Frontend tests
│   ├── public/          # Static assets
│   └── package.json     # Node dependencies
│
├── .github/workflows/   # CI/CD configurations with webhook notification
└── docs/               # Documentation
```

## 🔌 API Endpoints

### Person Management
- `GET /api/v1/persons/` - List all persons
- `POST /api/v1/persons/` - Create a new person
- `GET /api/v1/persons/{id}` - Get specific person
- `PUT /api/v1/persons/{id}` - Update person
- `DELETE /api/v1/persons/{id}` - Delete person
- `PUT /api/v1/persons/{id}/set-default` - Set person as default

### Medications
- `GET /api/v1/medications/` - List all medications (filtered by person)
- `POST /api/v1/medications/` - Create a new medication
- `GET /api/v1/medications/{id}` - Get specific medication
- `PUT /api/v1/medications/{id}` - Update medication
- `DELETE /api/v1/medications/{id}` - Delete medication

### Doses
- `POST /api/v1/doses/medications/{id}/dose` - Record a dose
- `GET /api/v1/doses/medications/{id}/doses` - Get dose history
- `GET /api/v1/doses/daily-summary` - Get daily summary (filtered by person)

Full API documentation available at `/docs` when running the backend.

## 💻 Development

### Running Tests

```bash
# Backend tests
cd backend
pytest -v --cov=app

# Frontend tests
cd frontend
npm test -- --coverage
```

### Code Quality

```bash
# Backend
cd backend
black .          # Format code
isort .          # Sort imports
flake8 .         # Lint code
mypy app/        # Type checking

# Frontend
cd frontend
npm run lint     # ESLint
npm run format   # Prettier
```

### Database Migrations

```bash
cd backend
# Create a new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🚀 Deployment

### Production with Docker

```bash
# Option 1: Single container with SQLite
docker compose -f docker-compose.simple.yml up -d

# Option 2: With PostgreSQL database
docker compose -f docker-compose.postgres.yml up -d

# View logs
docker compose logs -f
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions on deploying to various platforms.

## 🔒 Security

- Regular dependency scanning with Dependabot
- Vulnerability scanning with Trivy
- Code analysis with CodeQL
- Input validation and sanitization
- CORS configuration for production
- Regular security updates

## 📚 Documentation

- [API Documentation](docs/API.md) - Detailed API reference
- [Architecture Guide](docs/ARCHITECTURE.md) - System design and architecture
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions
- [User Guide](docs/USER_GUIDE.md) - End-user documentation
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Saad Jafferali** - *Initial work* - [sjafferali](https://github.com/sjafferali)

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- React team for the frontend framework
- All contributors and users of MediTrack

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/sjafferali/meditrack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sjafferali/meditrack/discussions)
- **Email**: saad@example.com

## 🏗️ Roadmap

See [TASKS.md](TASKS.md) for the current development roadmap and upcoming features.
