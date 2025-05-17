# MediTrack Architecture

## Overview

MediTrack follows a modern web application architecture with a clear separation between frontend and backend components. The system is designed for scalability, maintainability, and ease of deployment.

## High-Level Architecture

```mermaid
graph TD
    A[User Browser] -->|HTTP/HTTPS| B[React Frontend]
    B -->|API Calls| C[FastAPI Backend]
    C -->|SQL| D[(SQLite Database)]
    E[Docker Container] -.->|Contains| B
    F[Docker Container] -.->|Contains| C
    F -.->|Contains| D
    G[nginx] -->|Proxy| B
    G -->|Proxy| C
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TD
    subgraph React Application
        A[App.js] --> B[MedicationTracker.jsx]
        B --> C[MedicationList]
        B --> D[MedicationForm]
        B --> E[DailySummary]
        
        F[API Service] --> G[Axios Client]
        C --> F
        D --> F
        E --> F
    end
    
    G -->|HTTP| H[FastAPI Backend]
```

### Backend Architecture

```mermaid
graph TD
    subgraph FastAPI Application
        A[Main App] --> B[API Router]
        B --> C[Medication Endpoints]
        B --> D[Dose Endpoints]
        
        C --> E[Medication Service]
        D --> F[Dose Service]
        
        E --> G[Database Session]
        F --> G
        
        G --> H[SQLAlchemy ORM]
        H --> I[(SQLite DB)]
        
        J[Pydantic Schemas] --> C
        J --> D
        K[SQLAlchemy Models] --> H
    end
```

## Database Schema

```mermaid
erDiagram
    MEDICATION ||--o{ DOSE : has
    
    MEDICATION {
        int id PK
        string name
        string dosage
        string frequency
        int max_doses_per_day
        string instructions
        datetime created_at
        datetime updated_at
    }
    
    DOSE {
        int id PK
        int medication_id FK
        datetime taken_at
    }
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **Axios**: HTTP client
- **React Testing Library**: Testing
- **CSS**: Styling (no framework currently)

### Backend
- **FastAPI**: Web framework
- **SQLAlchemy**: ORM
- **Pydantic**: Data validation
- **Alembic**: Database migrations
- **pytest**: Testing framework

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **nginx**: Reverse proxy (production)
- **GitHub Actions**: CI/CD pipeline

### Database
- **SQLite**: Development and simple deployments
- **PostgreSQL**: Production (planned)

## API Design Principles

1. **RESTful Design**: Following REST conventions for resource URLs
2. **Consistent Response Format**: All responses follow a predictable structure
3. **Proper HTTP Status Codes**: Using appropriate status codes for different scenarios
4. **Validation**: Request validation using Pydantic schemas
5. **Error Handling**: Consistent error response format

## Security Architecture

```mermaid
graph TD
    A[Client Request] --> B{CORS Check}
    B -->|Valid Origin| C[API Endpoint]
    B -->|Invalid Origin| D[403 Forbidden]
    
    C --> E{Input Validation}
    E -->|Valid| F[Process Request]
    E -->|Invalid| G[422 Validation Error]
    
    F --> H{Business Logic}
    H --> I[Database Query]
    I --> J[Response]
    
    K[Dependency Scanner] --> L[Trivy]
    K --> M[CodeQL]
    K --> N[Dependabot]
```

## Data Flow

### Creating a Medication

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend API
    participant D as Database
    
    U->>F: Fill medication form
    F->>B: POST /api/v1/medications/
    B->>B: Validate input
    B->>D: INSERT medication
    D-->>B: Medication created
    B-->>F: 201 Created + medication data
    F-->>U: Show success message
```

### Recording a Dose

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend API
    participant D as Database
    
    U->>F: Click "Take Now"
    F->>B: POST /api/v1/doses/medications/{id}/dose
    B->>D: Check daily dose count
    alt Limit not reached
        B->>D: INSERT dose
        D-->>B: Dose created
        B-->>F: 201 Created + dose data
        F-->>U: Update UI
    else Limit reached
        B-->>F: 400 Bad Request
        F-->>U: Show error message
    end
```

## Deployment Architecture

### Development Environment

```mermaid
graph TD
    A[Developer Machine] --> B[Docker Desktop]
    B --> C[Frontend Container :3000]
    B --> D[Backend Container :8000]
    D --> E[SQLite Volume]
```

### Production Environment

```mermaid
graph TD
    A[Internet] --> B[Load Balancer]
    B --> C[nginx]
    C --> D[Frontend Container]
    C --> E[Backend Container]
    E --> F[(PostgreSQL)]
    G[CI/CD Pipeline] --> H[Docker Registry]
    H --> I[Kubernetes/ECS]
    I --> D
    I --> E
```

## Performance Considerations

1. **Database Indexing**: Primary keys are indexed by default
2. **Query Optimization**: Using SQLAlchemy's query builder for efficient queries
3. **Caching**: Currently no caching implemented, planned for future releases
4. **Pagination**: Implemented for list endpoints
5. **Connection Pooling**: SQLAlchemy manages connection pooling

## Monitoring and Logging

### Current Implementation
- Application logs to stdout
- Docker logs accessible via `docker logs`
- Error tracking through structured logging

### Planned Improvements
- Structured logging with JSON format
- Log aggregation service integration
- Performance monitoring (APM)
- Health check endpoints

## Scalability Strategy

1. **Horizontal Scaling**: Stateless API design allows multiple backend instances
2. **Database Scaling**: Migration path from SQLite to PostgreSQL
3. **Caching Layer**: Redis for frequently accessed data (planned)
4. **CDN**: Static asset delivery for frontend (planned)
5. **Message Queue**: For async operations (planned)

## Directory Structure

```
meditrack/
├── backend/
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   │   ├── __init__.py
│   │   │   ├── api.py      # Main API router
│   │   │   └── endpoints/  # Individual endpoint modules
│   │   ├── core/           # Core application configurations
│   │   │   ├── __init__.py
│   │   │   └── config.py   # Application settings
│   │   ├── db/             # Database configurations
│   │   │   ├── __init__.py
│   │   │   ├── base.py     # Base model declaration
│   │   │   └── session.py  # Database session management
│   │   ├── models/         # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── medication.py
│   │   │   └── dose.py
│   │   ├── schemas/        # Pydantic validation schemas
│   │   │   ├── __init__.py
│   │   │   ├── medication.py
│   │   │   └── dose.py
│   │   ├── services/       # Business logic layer
│   │   │   └── __init__.py
│   │   └── main.py         # FastAPI application entry point
│   ├── alembic/            # Database migration files
│   ├── tests/              # Test files
│   ├── scripts/            # Utility scripts
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container definition
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   └── MedicationTracker.jsx
│   │   ├── services/       # API service layer
│   │   │   └── api.js
│   │   ├── App.js          # Main React application
│   │   ├── App.css         # Application styles
│   │   └── index.js        # React entry point
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   └── Dockerfile          # Frontend container definition
│
├── .github/
│   └── workflows/          # CI/CD pipeline definitions
│       ├── ci.yml
│       └── security.yml
│
├── docs/                   # Documentation
├── docker-compose.simple.yml  # SQLite deployment configuration
├── docker-compose.postgres.yml # PostgreSQL deployment configuration
└── README.md              # Project overview
```

## Development Workflow

1. **Local Development**: Use Docker Compose for consistent environment
2. **Testing**: Automated tests run on every commit
3. **Code Review**: All changes go through pull request review
4. **CI/CD**: Automated testing and deployment via GitHub Actions
5. **Monitoring**: Application and infrastructure monitoring

## Future Architecture Improvements

1. **Authentication & Authorization**: JWT-based auth system
2. **Microservices**: Split into smaller services as needed
3. **Event-Driven Architecture**: For real-time updates
4. **GraphQL API**: Alternative to REST for complex queries
5. **Mobile Apps**: Native iOS/Android applications
6. **Multi-tenancy**: Support for multiple users/organizations