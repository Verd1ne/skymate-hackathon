# Speech Recognition Accuracy Improvements

## Current Implementation
- **Service**: Web Speech API (browser-based, Google's speech recognition)
- **Post-processing**: Extensive corrections for common misrecognitions
- **Grammar**: Aviation-specific vocabulary hints

## ✅ Improvements Just Added

### 1. **Confidence Threshold Filtering**
- Filters out low-confidence results (< 30% confidence)
- Automatically retries if confidence is too low
- Adjustable threshold in code (`MIN_CONFIDENCE`)

### 2. **Max Alternatives**
- Requests top 3 alternatives from recognition engine
- Can help with better word selection

## 🚀 Additional Options to Improve Accuracy

### Option 1: Switch to Deepgram (Recommended for Best Accuracy)
**Pros:**
- Much higher accuracy than Web Speech API
- Better handling of noisy environments
- Custom models and fine-tuning available
- Better number/letter recognition
- More reliable API

**Cons:**
- Requires API key (free tier available)
- Costs money at scale
- Network dependency

**How to switch:**
1. Install: `npm install @deepgram/sdk`
2. Add API key to `.env`: `VITE_DEEPGRAM_API_KEY=your_key`
3. The old Deepgram code is still in git history - can be restored

### Option 2: Use AssemblyAI
**Pros:**
- Better accuracy than Web Speech API
- Good for real-time transcription
- Free tier available

**Cons:**
- Requires API key
- Additional service dependency

### Option 3: Improve Current Implementation

#### A. Adjust Confidence Threshold
In `voice.ts`, line ~162, change:
```typescript
const MIN_CONFIDENCE = 0.3; // Increase for stricter filtering (0.5-0.7 recommended)
```

#### B. Use Better Microphone Settings
Add audio constraints when requesting microphone:
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100
  }
});
```

#### C. Expand Grammar
Add more aviation terms to the grammar in `voice.ts`:
- More seat number variations
- More meal/beverage terms
- More common phrases

#### D. Improve Post-Processing
- Add more correction patterns
- Use machine learning for context-aware corrections
- Add phonetic similarity matching

### Option 4: Hybrid Approach
1. Use Web Speech API for initial recognition
2. Send to OpenAI for correction/enhancement
3. Use post-processing for common patterns

## 📊 Accuracy Comparison

| Service | Accuracy | Cost | Setup Difficulty |
|---------|----------|------|------------------|
| Web Speech API | ~70-80% | Free | Easy |
| Deepgram | ~90-95% | Paid (free tier) | Medium |
| AssemblyAI | ~85-90% | Paid (free tier) | Medium |
| Google Cloud Speech | ~90-95% | Paid | Medium |

## 🎯 Recommended Next Steps

1. **Short term**: Adjust confidence threshold to 0.5-0.7
2. **Medium term**: Switch back to Deepgram for better accuracy
3. **Long term**: Consider custom model training with your specific vocabulary

## Testing Accuracy

To test improvements:
1. Speak 10 predefined phrases
2. Count correct recognitions
3. Adjust confidence threshold based on results
4. Compare accuracy before/after changes

