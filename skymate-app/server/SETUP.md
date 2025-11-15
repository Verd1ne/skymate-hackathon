# Backend Server Setup Guide

## Prerequisites

- Node.js 18+ installed
- Google Cloud SDK (gcloud) installed
- Access to skymate-477913 Google Cloud project

## Step 1: Install Dependencies

```bash
cd skymate-app/server
npm install
```

## Step 2: Setup Google Cloud Storage

### Option A: Automatic Setup (Recommended)

**On macOS/Linux:**
```bash
chmod +x setup-gcs.sh
./setup-gcs.sh
```

**On Windows:**
```bash
setup-gcs.bat
```

### Option B: Manual Setup

1. Create bucket:
```bash
gsutil mb -p skymate-477913 -l us-central1 gs://skymate-video-analysis
```

2. Set lifecycle policy:
```bash
gsutil lifecycle set lifecycle.json gs://skymate-video-analysis
```

3. Verify:
```bash
gsutil ls -L -b gs://skymate-video-analysis
```

## Step 3: Enable Video Intelligence API

```bash
gcloud services enable videointelligence.googleapis.com --project=skymate-477913
```

Or enable via console:
https://console.cloud.google.com/apis/library/videointelligence.googleapis.com?project=skymate-477913

## Step 4: Configure Environment Variables

Create `.env` file in `skymate-app/server/`:

```bash
cp env.example .env
```

Edit `.env`:
```
PORT=3001
GOOGLE_CLOUD_PROJECT_ID=skymate-477913
GCS_BUCKET_NAME=skymate-video-analysis
FRONTEND_URL=http://localhost:5173
```

**Note:** Service account credentials are embedded in the code (same as frontend).

## Step 5: Start Development Server

```bash
npm run dev
```

Server will start at http://localhost:3001

## Step 6: Test Backend

### Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "skymate-video-intelligence"
}
```

### Video Health Check
```bash
curl http://localhost:3001/api/video/health
```

## Troubleshooting

### Error: "Bucket not found"

Make sure bucket exists:
```bash
gsutil ls gs://skymate-video-analysis
```

If not, run setup script again.

### Error: "Video Intelligence API not enabled"

Enable the API:
```bash
gcloud services enable videointelligence.googleapis.com --project=skymate-477913
```

### Error: "Permission denied"

Check service account roles:
1. Go to IAM & Admin in Google Cloud Console
2. Find `skymate-service@skymate-477913.iam.gserviceaccount.com`
3. Ensure it has:
   - Cloud Storage Admin (or Storage Object Admin)
   - Video Intelligence API User

### Port 3001 already in use

Change port in `.env`:
```
PORT=3002
```

And update frontend `.env`:
```
VITE_VIDEO_API_URL=http://localhost:3002
```

## Production Deployment

### Option 1: Google Cloud Run

1. Build Docker image:
```bash
docker build -t gcr.io/skymate-477913/video-server .
```

2. Push to Container Registry:
```bash
docker push gcr.io/skymate-477913/video-server
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy video-intelligence \
  --image gcr.io/skymate-477913/video-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 2: Vercel/Netlify Functions

Convert Express routes to serverless functions.

### Option 3: Traditional VPS

1. Build:
```bash
npm run build
```

2. Start:
```bash
npm start
```

3. Use PM2 for process management:
```bash
pm2 start dist/index.js --name video-server
```

## API Documentation

See README.md for API endpoint documentation.

