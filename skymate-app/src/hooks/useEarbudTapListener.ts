import { useEffect } from "react";

/**
 * Custom hook to detect earbud single-tap events via Media Session API.
 * This provides an alternative activation method alongside the wake-word system.
 * 
 * @param isListening - Current listening state (true if actively listening)
 * @param onStart - Callback to start listening session
 * @param onStop - Callback to stop listening session
 * 
 * @example
 * ```tsx
 * function VoiceInput() {
 *   useEarbudTapListener(isListening, startListening, stopListening);
 *   // ... rest of component
 * }
 * ```
 */
export function useEarbudTapListener(
  isListening: boolean,
  onStart: () => void | Promise<void>,
  onStop: () => void
) {
  useEffect(() => {
    // Check if Media Session API is supported
    if (typeof navigator === "undefined" || !navigator.mediaSession) {
      console.warn("⚠️ Media Session API not supported in this browser");
      return;
    }

    console.log("🎧 Media Session API initialized for earbud controls");

    // CRITICAL: Set metadata to activate Media Session
    // Without this, many browsers/OS won't route earbud controls to the web page
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "SkyMate Voice Assistant",
        artist: "Voice Control",
        album: "Cabin Crew App",
        // Remove artwork to avoid placeholder errors
      });
      
      // Set playback state to indicate we're ready for controls
      navigator.mediaSession.playbackState = "paused";
    } catch (error) {
      console.warn("⚠️ Failed to set Media Session metadata:", error);
    }

    // Handler toggles between start/stop based on current state
    const handleAction = (details: any) => {
      console.log("🎧 Earbud tap detected");
      
      if (isListening) {
        console.log("🎧 Stopping session");
        onStop();
      } else {
        console.log("🎧 Starting session");
        // Call onStart and handle if it returns a Promise
        const result = onStart();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("❌ Error in earbud tap handler:", error);
          });
        }
      }
    };

    // Register handlers for ALL possible media session actions
    const actions = [
      "play",
      "pause",
      "previoustrack",
      "nexttrack",
      "seekbackward",
      "seekforward",
      "seekto",
      "stop",
    ];
    
    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action as any, handleAction);
      } catch (error) {
        // Silently ignore unsupported actions
      }
    });

    console.log("✅ Earbud controls ready");

    // Cleanup function - remove handlers on unmount
    return () => {
      try {
        actions.forEach((action) => {
          try {
            navigator.mediaSession.setActionHandler(action as any, null);
          } catch (error) {
            // Ignore cleanup errors
          }
        });
        
        // Clear metadata
        navigator.mediaSession.metadata = null;
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [isListening, onStart, onStop]);
}

