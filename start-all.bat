@echo off
echo Starting SecureCall Platform...
echo.

echo Starting MongoDB...
start cmd /k "mongod"
timeout /t 5

echo Starting Backend Server...
start cmd /k "cd backend && npm run dev"
timeout /t 5

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"
timeout /t 5

echo Starting Deepfake Service...
start cmd /k "cd deepfake-service && venv\Scripts\activate && python app.py"

echo.
echo All services started!
echo Open http://localhost:5173 in your browser
pause
