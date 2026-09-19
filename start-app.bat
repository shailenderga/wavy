@echo off
echo ========================================================
echo   Starting React + MySQL + Tailwind CSS Chat App
echo ========================================================

echo.
echo 1. Launching Backend Server (Port 5000)...
start "Chat App - Backend Server" cmd /k "cd server && npm start"

echo 2. Launching Frontend Client (Port 5173)...
start "Chat App - Frontend Client" cmd /k "cd client && npm run dev"

echo.
echo ========================================================
echo App launched!
echo Open your browser at: http://localhost:5173
echo ========================================================
