/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_DATABASE_URL: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_DEEPGRAM_API_KEY: string
  readonly VITE_AZURE_SPEECH_KEY?: string
  readonly VITE_AZURE_SPEECH_REGION?: string
  readonly azure_speech_key?: string
  readonly azure_speech_region?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

