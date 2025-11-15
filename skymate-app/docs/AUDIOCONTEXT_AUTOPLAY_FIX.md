# AudioContext Autoplay Policy Fix

## Problem

After refreshing the page, the wake word confirmation audio ("Hi, I'm here") would sometimes fail to play when saying "skymate" immediately. This was caused by Chrome's autoplay policy which requires AudioContext to be resumed after a user gesture.

### Error Message
```
The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.
```

### Root Cause

1. **Browser Autoplay Policy**: Modern browsers (Chrome, Edge, Safari) require AudioContext to be resumed after a user interaction (click, touch, keypress) before audio can play.

2. **Critical Chrome Behavior**: Per [Chrome's autoplay policy](https://developer.chrome.com/blog/autoplay/#web_audio):
   - If an AudioContext is created **before** a user gesture → it starts in "suspended" state
   - If an AudioContext is created **during** a user gesture → it starts in "running" state
   - In both cases, you need to call `resume()` after the user gesture to ensure it's running

3. **Timing Issue**: When a user refreshes the page and immediately says "skymate" without clicking anywhere:
   - The AudioContext may be created before any user gesture (suspended state)
   - Event listeners for click/touch/keypress are set up but haven't fired yet
   - Speech recognition (wake word detection) doesn't count as a user gesture
   - Wake word confirmation tries to play audio but AudioContext is still suspended
   - Audio fails silently with the autoplay policy error

## Solution

### 1. Persistent Event Listeners for AudioContext Resumption

**File**: `skymate-app/src/components/crew/VoiceInput.tsx`

The fix uses persistent event listeners that keep trying until AudioContext is successfully resumed:

```typescript
// Resume AudioContext on first user interaction (required for browser autoplay policy)
let hasResumed = false;
const events = ["click", "touchstart", "keydown"];

const resumeOnInteraction = async () => {
  if (!hasResumed && ttsServiceRef.current) {
    try {
      await ttsServiceRef.current.resumeAudioContextOnUserInteraction();
      console.log("✅ AudioContext resumed on user interaction");
      hasResumed = true; // Only set to true if successful
      
      // Remove all event listeners after successful resume
      events.forEach((event) => {
        document.removeEventListener(event, resumeOnInteraction);
      });
    } catch (error) {
      console.warn("⚠️ Failed to resume AudioContext on user interaction:", error);
      // Don't set hasResumed = true, so it will try again on next interaction
    }
  }
};

// Listen for user interactions (click, touch, keypress)
// Don't use {once: true} so it keeps trying until successful
events.forEach((event) => {
  document.addEventListener(event, resumeOnInteraction, {
    passive: true,
  });
});
```

**Key Features:**
- Event listeners persist until AudioContext is successfully resumed
- Automatically removes listeners after success to avoid unnecessary calls
- Handles failures gracefully and retries on next user interaction
- Works with click, touch, and keyboard interactions

### 2. Enhanced AudioContext State Logging

**File**: `skymate-app/src/lib/ttsService.ts`

Improved the `ensureAudioContextReady()` method with better logging to help diagnose AudioContext issues:

```typescript
private async ensureAudioContextReady(): Promise<void> {
  // Initialize Web Audio API context if needed
  if (!this.audioContext) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // CRITICAL: Resume AudioContext if suspended (required for browser autoplay policy)
  if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
    console.log('🔄 Attempting to resume AudioContext, current state:', this.audioContext.state);
    
    try {
      await this.audioContext.resume();
      console.log('✅ AudioContext resumed, state:', this.audioContext.state);
      
      // Wait a tiny bit to ensure context is fully resumed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Double-check state after resume
      if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
        console.warn('⚠️ AudioContext not running after resume, state:', this.audioContext.state);
        // Try one more time
        try {
          await this.audioContext.resume();
          console.log('✅ AudioContext resumed on retry, state:', this.audioContext.state);
        } catch (retryError) {
          console.warn('⚠️ Failed to resume AudioContext on retry:', retryError);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to resume AudioContext (may need user interaction):', error);
      console.warn('💡 TIP: Audio will work after clicking, tapping, or pressing a key on the page.');
    }
  } else {
    console.log('✅ AudioContext already running, state:', this.audioContext.state);
  }
}
```

## AudioContext State Lifecycle

### Scenario A: AudioContext Created Before User Gesture
```
Page Load
    ↓
AudioContext created (state: "suspended") ⚠️
    ↓
User Gesture (click/mic permission)
    ↓
audioContext.resume() called
    ↓
AudioContext running (state: "running") ✅
    ↓
Audio playback works ✅
```

### Scenario B: AudioContext Created During User Gesture (Optimal)
```
Page Load
    ↓
User Gesture (mic permission)
    ↓
AudioContext created (state: "running") ✅
    ↓
Audio playback works immediately ✅
```

## User Experience Flow

### Before Fix
```
1. User refreshes page
2. Page loads, event listeners set up
3. User immediately says "skymate" (no click/touch yet)
4. Wake word detected ✅
5. ensureAudioContextReady() creates AudioContext (suspended state) ⚠️
6. Audio confirmation tries to play ❌ (AudioContext still suspended)
7. Silent failure - no audio feedback
```

### After Fix
```
1. User refreshes page
2. Page loads, persistent event listeners set up for click/touch/keypress
3. User clicks anywhere on page (or touches/presses key) 👆
4. resumeAudioContextOnUserInteraction() called
5. AudioContext created during user gesture (running state) ✅
6. Event listeners automatically removed after success
7. User says "skymate"
8. Wake word detected ✅
9. Audio confirmation plays ✅ ("Hi, I'm here")
```

**Important Note:** The first wake word after page load might not have audio confirmation if the user hasn't clicked/touched the page yet. This is a browser security feature that cannot be bypassed. However, after the first click/touch/keypress, all subsequent wake words will have audio confirmation.

## Testing

### Test Scenario 1: Wake Word Without Prior Click (First Time)
1. Refresh the page
2. Immediately say "skymate" without clicking anywhere
3. **Expected**: Wake word detected, but NO audio confirmation (browser security)
4. Click anywhere on the page
5. Say "skymate" again
6. **Expected**: Audio confirmation plays ✅ ("Hi, I'm here")

### Test Scenario 2: Wake Word After User Interaction
1. Refresh the page
2. Click anywhere on the page (or touch/press key)
3. Say "skymate"
4. **Expected**: Audio confirmation plays ✅ ("Hi, I'm here")

### Test Scenario 3: Console Logging
Check the browser console for these log messages:

**After first click/touch/keypress:**
- `🎵 AudioContext created, initial state: running` (or `suspended`)
- `✅ AudioContext resumed, state: running` - Confirms AudioContext is ready
- Event listeners removed after success

**When wake word is detected:**
- `🔊 Playing wake word confirmation: Hi mate` - Confirms audio playback started
- `✅ AudioContext already running, state: running` - Confirms playback succeeded

**If audio fails (before user interaction):**
- `⚠️ AudioContext operation failed (may need user interaction)` - Expected before first click

## Browser Compatibility

This fix works with all modern browsers that support Web Audio API:
- ✅ Chrome/Edge (Chromium-based)
- ✅ Safari (WebKit)
- ✅ Firefox

## Related Documentation

- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay/#web_audio)
- [MDN: AudioContext.resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)
- [Web Audio API Autoplay Policy](https://developer.chrome.com/blog/autoplay/)

## Additional Notes

### Why Microphone Permission Counts as User Gesture

When the browser requests microphone permission, the user must explicitly click "Allow" in the permission dialog. This click counts as a user gesture, which allows us to:
1. Create a new AudioContext (will start in "running" state)
2. Resume an existing AudioContext (will transition from "suspended" to "running")

### AudioContext Creation Timing

The implementation uses **lazy initialization** for optimal behavior:

```typescript
// AudioContext is initialized as null
private audioContext: AudioContext | null = null;

// Only created when needed (during user gesture)
if (!this.audioContext) {
  this.audioContext = new AudioContext();
  // If created during user gesture → starts in "running" state ✅
  // If created before user gesture → starts in "suspended" state ⚠️
}
```

This ensures:
- No AudioContext is created unnecessarily
- If created during microphone permission (user gesture), it starts ready to use
- If somehow created earlier, the resume() call will activate it

### Fallback Mechanisms

The code still maintains the original event listeners (click, touch, keypress) as fallback mechanisms:
1. If microphone permission was already granted (no dialog shown), the click/touch/keypress listeners will resume AudioContext
2. Multiple resume attempts are safe - calling `resume()` on an already-running AudioContext is a no-op

### Non-Critical Failures

All AudioContext resume failures are handled gracefully with warnings instead of errors. This ensures that:
- Voice recognition continues to work even if audio feedback fails
- The app remains functional in all scenarios
- Users can still use the system without audio confirmation

## Implementation Date

November 9, 2025

## Related Issues

- Fixed: "Cannot read properties of undefined (reading 'parsed')" error in voice.ts
- Fixed: AudioContext autoplay policy blocking wake word confirmation

