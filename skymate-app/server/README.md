# SkyMate Backend Server

Express backend server for SkyMate voice-powered task management system.

## Setup

### 1. Install Dependencies

```bash
cd skymate-app/server
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Server will run at `http://localhost:3001`

## API Endpoints

### GET `/`

Health check endpoint.

**Response:**
```json
{
  "name": "SkyMate Server",
  "version": "1.0.0",
  "status": "running",
  "message": "SkyMate backend server for voice-powered task management"
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
```

## Architecture

```
server/
├── src/
│   ├── index.ts                    # Express server entry
│   ├── routes/                     # API routes
│   ├── services/                   # Business logic services
│   ├── middleware/                 # Express middleware
│   ├── types/                      # TypeScript type definitions
│   └── utils/                      # Utility functions
└── dist/                           # Compiled JavaScript
```

## Tech Stack

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **CORS**: Cross-origin resource sharing
- **Nodemon**: Development auto-reload

## Notes

This backend server provides API endpoints for the SkyMate application. The main business logic for task management and voice processing happens on the frontend using Firebase Realtime Database.
