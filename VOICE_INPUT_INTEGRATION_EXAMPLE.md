# VoiceInput Component Integration Example

## Step-by-Step Integration Guide

### Step 1: Add State for Interim Transcripts

Add a new state variable to track interim transcripts:

```tsx
function VoiceInput() {
  // ... existing state
  const [transcript, setTranscript] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  
  // ADD THIS: Track interim transcript for live feedback
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListeningActive, setIsListeningActive] = useState(false);
  
  // ... rest of component
}
```

### Step 2: Update Voice Service Initialization

Modify the voice service initialization to include the interim callback:

```tsx
useEffect(() => {
  console.log("🎤 VoiceInput component mounted - initializing VoiceService");

  // ... existing initialization code

  // Define the wake word callback
  const onWakeWordDetected = async (text: string, selectedAlternative?: any) => {
    // Clear interim when final transcript arrives
    setInterimTranscript('');
    setIsListeningActive(false);
    
    // ... existing onWakeWordDetected logic
  };

  // ADD THIS: Interim transcript callback
  const onInterimTranscript = (text: string) => {
    // This is already throttled by VoiceService (300ms)
    setInterimTranscript(text);
    setIsListeningActive(true);
    
    // Optional: Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Interim:', text);
    }
  };

  // Start listening with interim callback
  voiceService.startContinuousListening(
    onWakeWordDetected,
    onWakeWordOnly,
    onWakeWordConfirmation,
    onInterimTranscript  // ADD THIS
  ).catch((error) => {
    // ... error handling
  });

}, []); // dependencies
```

### Step 3: Add Visual Feedback Component

Create a smooth visual indicator for interim transcripts:

```tsx
function VoiceInput() {
  // ... state and logic
  
  return (
    <div className="voice-input-container">
      {/* Existing UI elements */}
      
      {/* ADD THIS: Interim transcript display */}
      {isListening && interimTranscript && !isParsing && (
        <div className="interim-transcript-container">
          <div className="interim-transcript-content">
            {/* Listening indicator */}
            <div className="listening-indicator">
              <div className="pulse-dot" />
              <span className="listening-label">Listening...</span>
            </div>
            
            {/* Interim text with smooth fade */}
            <div className="interim-text-wrapper">
              <p className="interim-text">
                {interimTranscript}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Existing parsing/loading states */}
      {isParsing && (
        <div className="processing-container">
          <Spinner />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Add CSS Styles

Add these styles to your component's CSS file or Tailwind classes:

```css
/* Interim transcript container */
.interim-transcript-container {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.interim-transcript-content {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Listening indicator */
.listening-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.listening-label {
  color: #3b82f6;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Interim text */
.interim-text-wrapper {
  transition: all 0.2s ease-in-out;
}

.interim-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
  font-style: italic;
  transition: opacity 0.2s ease-in-out;
}

/* Smooth text update animation */
.interim-text-wrapper.updating {
  opacity: 0.7;
}

/* Processing container */
.processing-container {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  font-weight: 600;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
}
```

### Step 5 (Optional): Use React Hooks for Extra Smoothing

If you want even smoother transitions, use the throttling hooks:

```tsx
import { useThrottledValue, useSmoothTransition } from '@/hooks/useThrottledValue';

function VoiceInput() {
  const [interimTranscript, setInterimTranscript] = useState("");
  
  // Add extra throttling layer (optional - voice service already throttles)
  const smoothedInterim = useThrottledValue(interimTranscript, 200);
  
  // Or use smooth transition with CSS class
  const { value: displayText, className } = useSmoothTransition(interimTranscript, 200);
  
  return (
    <div className="interim-transcript-container">
      <p className={`interim-text ${className}`}>
        {displayText}
      </p>
    </div>
  );
}
```

## Tailwind CSS Version

If you're using Tailwind, here's the same styling:

```tsx
{isListening && interimTranscript && !isParsing && (
  <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 max-w-[90%] z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
    <div className="bg-black/85 backdrop-blur-md rounded-2xl px-5 py-4 shadow-2xl border border-white/10">
      {/* Listening indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-blue-500 text-xs font-semibold uppercase tracking-wide">
          Listening...
        </span>
      </div>
      
      {/* Interim text */}
      <p className="text-white/90 text-base leading-relaxed m-0 italic transition-opacity duration-200">
        {interimTranscript}
      </p>
    </div>
  </div>
)}

{/* Processing state */}
{isParsing && (
  <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 bg-blue-500/95 backdrop-blur-md px-6 py-3 rounded-xl flex items-center gap-3 text-white font-semibold animate-in slide-in-from-bottom-5 fade-in duration-300 shadow-2xl shadow-blue-500/40">
    <Spinner className="w-4 h-4" />
    <span>Processing...</span>
  </div>
)}
```

## Complete Example with All Features

```tsx
import { useState, useEffect, useRef } from 'react';
import { VoiceService } from '@/lib/voice';
import { useThrottledValue } from '@/hooks/useThrottledValue';

function VoiceInput() {
  // Existing state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  
  // NEW: Interim transcript state
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListeningActive, setIsListeningActive] = useState(false);
  
  // Optional: Extra smoothing
  const smoothedInterim = useThrottledValue(interimTranscript, 200);
  
  const voiceServiceRef = useRef<VoiceService | null>(null);

  useEffect(() => {
    console.log("🎤 Initializing VoiceService");
    
    const voiceService = new VoiceService();
    voiceServiceRef.current = voiceService;

    // Final transcript handler
    const onWakeWordDetected = async (text: string) => {
      console.log("✅ Final transcript:", text);
      
      // Clear interim state
      setInterimTranscript('');
      setIsListeningActive(false);
      
      // Set final transcript and start processing
      setTranscript(text);
      setIsParsing(true);
      
      // Your existing processing logic here...
      // await parseIntent(text);
      // ...
      
      setIsParsing(false);
    };

    // NEW: Interim transcript handler
    const onInterimTranscript = (text: string) => {
      console.log("📝 Interim (throttled):", text);
      setInterimTranscript(text);
      setIsListeningActive(true);
    };

    // Wake word confirmation (beep sound)
    const onWakeWordConfirmation = () => {
      console.log("🔔 Wake word confirmed - beep!");
      // Play confirmation sound
    };

    // Start listening with all callbacks
    voiceService.startContinuousListening(
      onWakeWordDetected,
      undefined, // onWakeWordOnly
      onWakeWordConfirmation,
      onInterimTranscript // NEW
    ).then(() => {
      setIsListening(true);
      console.log("✅ Voice service started");
    }).catch((error) => {
      console.error("❌ Voice service error:", error);
      // Handle error...
    });

    return () => {
      voiceService.stopListening();
      console.log("🛑 Voice service stopped");
    };
  }, []);

  return (
    <div className="relative">
      {/* Main UI */}
      <div className="voice-controls">
        {/* Your existing UI */}
      </div>

      {/* NEW: Interim transcript feedback */}
      {isListening && smoothedInterim && !isParsing && (
        <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 max-w-[90%] z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-black/85 backdrop-blur-md rounded-2xl px-5 py-4 shadow-2xl border border-white/10">
            {/* Pulse indicator */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping" />
                <div className="relative w-2 h-2 bg-blue-500 rounded-full" />
              </div>
              <span className="text-blue-500 text-xs font-semibold uppercase tracking-wide">
                Listening...
              </span>
            </div>
            
            {/* Interim text */}
            <p className="text-white/90 text-base leading-relaxed m-0 italic">
              "{smoothedInterim}"
            </p>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isParsing && (
        <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 bg-blue-500/95 backdrop-blur-md px-6 py-3 rounded-xl flex items-center gap-3 text-white font-semibold animate-in slide-in-from-bottom-5 fade-in duration-300 shadow-2xl shadow-blue-500/40">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Processing your request...</span>
        </div>
      )}
    </div>
  );
}

export default VoiceInput;
```

## Testing the Integration

1. **Test interim updates**:
   - Say "Skymate remind me of 50"
   - You should see smooth, throttled updates as you speak
   - No flickering or rapid changes

2. **Test processing flow**:
   - Interim display should clear when final transcript arrives
   - Processing indicator should show immediately
   - Smooth transitions between states

3. **Test error cases**:
   - Pauses during speech should work
   - Multiple requests should not conflict
   - State should reset properly between requests

## Summary

✅ **Minimal changes** - Just add interim state and callback
✅ **Automatic throttling** - Voice service handles it (300ms)
✅ **Smooth animations** - CSS transitions for professional feel
✅ **Better feedback** - Users see what's being recognized in real-time
✅ **No breaking changes** - Backward compatible with existing code

The integration is **simple but powerful** - your users will notice the difference immediately!

