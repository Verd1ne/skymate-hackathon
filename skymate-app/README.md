# SkyMate - AI Flight Assistant

A modern flight assistant application built with React, TypeScript, and Vite.

## 🚀 NEW: Automatic Motion-Triggered Detection

**Now featuring hands-free, automatic inventory tracking!**

The system automatically detects when items are taken out or put into cabinets:
- ✅ **No manual button press** - Just move items naturally
- ✅ **Automatic motion detection** - Monitors camera feed continuously
- ✅ **Post-event classification** - Records 5-second clips and analyzes
- ✅ **YOLOv8-powered** - Local, offline object detection
- ✅ **Action classification** - Detects "take out", "put in", or "idle"
- ✅ **Multi-frame analysis** - Compares start vs end for accuracy

### How It Works

1. Camera continuously monitors for motion
2. Motion detected → Records 5-second clip (25 frames)
3. Analyzes frames with YOLOv8
4. Compares first 3 frames vs last 3 frames
5. Classifies action: object disappeared = "take out", appeared = "put in"
6. Total latency: ~7-12 seconds from motion to result

See [`MOTION_DETECTION_QUICK_START.md`](./MOTION_DETECTION_QUICK_START.md) for usage guide.

See [`MOTION_DETECTION_IMPLEMENTATION.md`](./MOTION_DETECTION_IMPLEMENTATION.md) for technical details.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory and add your API keys:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_OPENAI_API_KEY=your_openai_key  # No longer required - using local YOLOv8
VITE_DEEPGRAM_API_KEY=your_deepgram_key
```

3. Start the development server:
```bash
npm run dev
```

The YOLOv8 model will automatically load on startup.

## Project Structure

```
src/
├── components/
│   ├── crew/          # Crew app components
│   ├── galley/        # Galley app components
│   ├── analytics/     # Analytics components
│   └── shared/        # Shared components
├── lib/
│   ├── firebase.ts
│   ├── config.ts
│   ├── voice.ts
│   └── ai.ts
├── hooks/
│   ├── useTasks.ts
│   └── useVoice.ts
├── types/
│   └── index.ts
└── utils/
    └── helpers.ts
```

## Features

- Voice input for task creation
- Task management with priority levels
- Real-time Firebase integration
- Modern UI with Tailwind CSS
