@echo off
REM Video Intelligence Installation Script for Windows
REM Automates the complete setup process

setlocal

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  🎥 Skymate Video Intelligence Installer              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed
    echo Install from: https://nodejs.org/
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed
    exit /b 1
)

where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ gcloud CLI is not installed
    echo Install from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

where gsutil >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ gsutil is not installed
    exit /b 1
)

echo ✅ All prerequisites installed
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd server
call npm install
echo ✅ Backend dependencies installed
echo.

REM Setup GCS bucket
echo 🪣 Setting up Google Cloud Storage...
call setup-gcs.bat
echo.

REM Enable Video Intelligence API
echo 🔧 Enabling Video Intelligence API...
call gcloud services enable videointelligence.googleapis.com --project=skymate-477913
echo ✅ Video Intelligence API enabled
echo.

REM Create .env file if not exists
if not exist .env (
    echo 📝 Creating .env file...
    (
        echo PORT=3001
        echo GOOGLE_CLOUD_PROJECT_ID=skymate-477913
        echo GCS_BUCKET_NAME=skymate-video-analysis
        echo FRONTEND_URL=http://localhost:5173
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)
echo.

REM Go back to root
cd ..

REM Update frontend .env
echo 📝 Updating frontend .env...
if not exist .env (
    copy env.example .env
)

REM Add video API URL if not present
findstr /C:"VITE_VIDEO_API_URL" .env >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo VITE_VIDEO_API_URL=http://localhost:3001 >> .env
    echo ✅ Added VITE_VIDEO_API_URL to .env
) else (
    echo ✅ VITE_VIDEO_API_URL already configured
)
echo.

REM Summary
echo ╔════════════════════════════════════════════════════════╗
echo ║  ✅ Installation Complete!                             ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 🚀 Next Steps:
echo.
echo 1. Start backend server:
echo    cd skymate-app\server
echo    npm run dev
echo.
echo 2. Start frontend (in another terminal):
echo    cd skymate-app
echo    npm run dev
echo.
echo 3. Open http://localhost:5173 and test!
echo.
echo 📚 Documentation:
echo    - Quick Start: VIDEO_INTELLIGENCE_QUICKSTART.md
echo    - Testing Guide: VIDEO_INTELLIGENCE_TESTING.md
echo    - Implementation: VIDEO_INTELLIGENCE_IMPLEMENTATION.md
echo.
echo 🎉 Happy coding!
echo.

endlocal

