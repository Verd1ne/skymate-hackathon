export const config = {
  openai: import.meta.env.VITE_OPENAI_API_KEY,
  deepgram: import.meta.env.VITE_DEEPGRAM_API_KEY,
  azureSpeech: {
    key: import.meta.env.VITE_AZURE_SPEECH_KEY || import.meta.env.azure_speech_key,
    region: import.meta.env.VITE_AZURE_SPEECH_REGION || import.meta.env.azure_speech_region,
  },
};

