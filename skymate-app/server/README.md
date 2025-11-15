# Skymate Video Intelligence Server

Backend Express server untuk memproses video menggunakan Google Cloud Video Intelligence API.

## Setup

### 1. Install Dependencies

```bash
cd skymate-app/server
npm install
```

### 2. Configure Environment Variables

Copy `env.example` ke `.env` dan isi dengan nilai yang sesuai:

```bash
cp env.example .env
```

Edit `.env`:
```
PORT=3001
GOOGLE_CLOUD_PROJECT_ID=skymate-477913
GCS_BUCKET_NAME=skymate-video-analysis
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### 3. Setup Google Cloud Storage Bucket

Jalankan script setup (memerlukan `gcloud` CLI):

```bash
chmod +x setup-gcs.sh
./setup-gcs.sh
```

Atau buat bucket secara manual:
```bash
gsutil mb -p skymate-477913 -l us-central1 gs://skymate-video-analysis
gsutil lifecycle set lifecycle.json gs://skymate-video-analysis
```

### 4. Start Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3001`

## API Endpoints

### POST `/api/video/analyze`

Upload dan analisis video untuk deteksi gerakan tangan.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: 
  - `video`: Video file (max 50MB)

**Response:**
```json
{
  "direction": "in" | "out" | "unknown",
  "confidence": 0.92,
  "detectedObjects": [
    {
      "entity": "Hand",
      "confidence": 0.95,
      "segment": {
        "startTime": "0s",
        "endTime": "5s"
      },
      "frames": [...]
    }
  ],
  "handDetected": true,
  "itemDetected": true,
  "processingTime": 15234
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "skymate-video-intelligence"
}
```

## Development

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build directory
npm run clean
```

## Architecture

```
server/
├── src/
│   ├── index.ts                    # Express server entry
│   ├── routes/
│   │   └── video.routes.ts         # Video API routes
│   ├── services/
│   │   ├── storage.service.ts      # Google Cloud Storage
│   │   ├── videoIntelligence.service.ts  # Video Intelligence API
│   │   └── motionAnalysis.service.ts     # Motion classification
│   ├── middleware/
│   │   └── upload.middleware.ts    # Multer file upload
│   └── types/
│       └── video.types.ts          # TypeScript interfaces
├── uploads/                        # Temporary video storage
└── dist/                           # Compiled JavaScript
```

## Troubleshooting

### Error: "Bucket not found"

Pastikan bucket sudah dibuat:
```bash
gsutil ls -p skymate-477913
```

### Error: "Permission denied"

Pastikan service account memiliki role:
- Cloud Storage Admin
- Video Intelligence API User

### Error: "Video Intelligence API not enabled"

Enable API:
```bash
gcloud services enable videointelligence.googleapis.com --project=skymate-477913
```

