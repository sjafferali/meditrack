#!/bin/bash

# Start both frontend and backend development servers

echo "Starting MediTrack development servers..."

# Start backend server
echo "Starting backend server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Servers started!"
echo "Backend (FastAPI): http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Frontend (React): http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait