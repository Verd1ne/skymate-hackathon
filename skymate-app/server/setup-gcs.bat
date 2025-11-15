@echo off
REM Google Cloud Storage Setup Script for Windows
REM Creates bucket for video analysis with lifecycle policy

setlocal

set PROJECT_ID=skymate-477913
set BUCKET_NAME=skymate-video-analysis
set REGION=us-central1

echo.
echo 🪣 Setting up Google Cloud Storage for Video Intelligence
echo.
echo Project: %PROJECT_ID%
echo Bucket: %BUCKET_NAME%
echo Region: %REGION%
echo.

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: gcloud CLI is not installed
    echo Install from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Check if gsutil is installed
where gsutil >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: gsutil is not installed
    echo Install from: https://cloud.google.com/storage/docs/gsutil_install
    exit /b 1
)

echo ✅ gcloud and gsutil are installed
echo.

REM Set project
echo 📋 Setting project to %PROJECT_ID%...
call gcloud config set project %PROJECT_ID%

REM Check if bucket exists
call gsutil ls -b gs://%BUCKET_NAME% >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Bucket gs://%BUCKET_NAME% already exists
    set /p CONTINUE="Do you want to continue and update lifecycle policy? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        echo Aborted.
        exit /b 0
    )
) else (
    REM Create bucket
    echo 🔨 Creating bucket gs://%BUCKET_NAME%...
    call gsutil mb -p %PROJECT_ID% -l %REGION% gs://%BUCKET_NAME%
    echo ✅ Bucket created successfully
)

REM Set lifecycle policy
echo.
echo ⚙️  Setting lifecycle policy (auto-delete after 1 day)...
call gsutil lifecycle set lifecycle.json gs://%BUCKET_NAME%
echo ✅ Lifecycle policy applied

REM Set CORS policy
echo.
echo 🌐 Setting CORS policy...
(
echo [
echo   {
echo     "origin": ["http://localhost:5173", "http://localhost:3000"],
echo     "method": ["GET", "POST", "PUT", "DELETE"],
echo     "responseHeader": ["Content-Type"],
echo     "maxAgeSeconds": 3600
echo   }
echo ]
) > cors.json

call gsutil cors set cors.json gs://%BUCKET_NAME%
echo ✅ CORS policy applied

REM Clean up
del cors.json

REM Verify bucket configuration
echo.
echo 📊 Bucket configuration:
call gsutil ls -L -b gs://%BUCKET_NAME%

echo.
echo ✅ Setup complete!
echo.
echo Bucket URI: gs://%BUCKET_NAME%
echo Console: https://console.cloud.google.com/storage/browser/%BUCKET_NAME%?project=%PROJECT_ID%
echo.
echo ⚠️  Note: Make sure your service account has the following roles:
echo    - Storage Object Admin
echo    - Storage Object Creator
echo.

endlocal

