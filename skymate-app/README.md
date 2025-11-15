# SkyMate - AI Flight Assistant

A modern flight assistant application built with React, TypeScript, and Vite.

## ✨ Features

**Voice-Powered Task Management:**
- 🎤 **Voice Commands** - Create and manage tasks with natural language
- ✅ **Task Tracking** - Real-time task management with Firebase
- 📦 **Inventory Integration** - Automatic stock checking and reservation
- 🔊 **Audio Feedback** - Spoken confirmations for all actions
- 👥 **Priority Management** - Smart task prioritization based on passenger status

**New:**  
- 🗣️ **AI Voice Playground** - A dedicated page where you can type any announcement and have Azure Speech read it aloud, complete with speed/pitch/volume controls for rapid iteration.

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
VITE_DEEPGRAM_API_KEY=your_deepgram_key
VITE_AZURE_SPEECH_KEY=your_azure_speech_key
VITE_AZURE_SPEECH_REGION=your_azure_region
```

3. Start the development server:
```bash
npm run dev
```

4. Open the top navigation switcher in the running app and pick **TTS Playground** to try the text-to-speech page. Enter any copy, tweak the sliders, and hit **Speak**.

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
