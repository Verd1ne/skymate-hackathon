@echo off
echo ========================================
echo   Starting SkyMate Backend
echo ========================================
echo.
cd server
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting server...
call npm run dev

