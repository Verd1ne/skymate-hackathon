import { useEffect, useRef } from "react";

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
  // ANTI-STUTTER FIX: Use refs to store callbacks so we don't re-initialize on every change
  // This prevents Media Session API cleanup/re-init cycle that interrupts audio
  const isListeningRef = useRef(isListening);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);
  const isInitializedRef = useRef(false);
  const initializationAttemptedRef = useRef(false);

  // Update refs when props change (without triggering effect re-run)
  useEffect(() => {
    isListeningRef.current = isListening;
    onStartRef.current = onStart;
    onStopRef.current = onStop;
  }, [isListening, onStart, onStop]);

  // Initialize Media Session API ONCE (no dependencies except initial mount)
  useEffect(() => {
    // RELIABILITY CHECK: Verify Media Session API support early
    if (typeof navigator === "undefined" || !navigator.mediaSession) {
      console.warn("⚠️ Media Session API not supported - earbud controls unavailable");
      return;
    }

    console.log("🎧 Media Session API initialized for earbud controls (one-time setup)");

    // CRITICAL: Set metadata to activate Media Session
    // Without this, many browsers/OS won't route earbud controls to the web page
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "SkyMate Voice Assistant",
        artist: "Voice Control",
        album: "Cabin Crew App",
        // Remove artwork to avoid placeholder errors
      });
      
      // RELIABILITY FIX: Set playback state to 'playing' (not 'paused')
      // 'playing' ensures media controls are always active and responsive
      navigator.mediaSession.playbackState = "playing";
      console.log("✅ Media Session playback state set to 'playing'");
    } catch (error) {
      console.warn("⚠️ Failed to set Media Session metadata:", error);
    }

    // Handler toggles between start/stop based on current state (uses refs)
    const handleAction = (_details: any) => {
      console.log("🎧 Earbud tap detected via Media Session API");
      
      // Read from refs to get latest values without re-registering handlers
      // Note: Callbacks are always defined since they're passed as required parameters
      if (isListeningRef.current) {
        console.log("🎧 Stopping session");
        onStopRef.current();
      } else {
        console.log("🎧 Starting session");
        // Call onStart and handle if it returns a Promise
        const result = onStartRef.current();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("❌ Error in earbud tap handler:", error);
          });
        }
      }
    };

    // RELIABILITY FIX: Register handlers for ALL possible media session actions
    // Different earbuds/OS may use different action types
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
    
    let handlersRegistered = 0;
    actions.forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action as any, handleAction);
        handlersRegistered++;
      } catch (error) {
        // Silently ignore unsupported actions (browser may not support all)
        console.debug(`Action '${action}' not supported by this browser`);
      }
    });

    console.log(`✅ Earbud controls ready (${handlersRegistered}/${actions.length} actions registered)`);

    // Mark as initialized after a short delay to ensure everything is ready
    // This prevents race conditions where tap happens before handlers are fully registered
    setTimeout(() => {
      isInitializedRef.current = true;
      initializationAttemptedRef.current = true;
      console.log("✅ Media Session API fully initialized and ready for taps");
    }, 150);

    // Cleanup function - remove handlers ONLY on unmount (not on every render)
    return () => {
      isInitializedRef.current = false;
      try {
        actions.forEach((action) => {
          try {
            navigator.mediaSession.setActionHandler(action as any, null);
          } catch (error) {
            // Ignore cleanup errors
          }
        });
        
        // Clear metadata and reset playback state
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
        console.log("🎧 Media Session API cleaned up (component unmounted)");
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []); // CRITICAL: Empty deps array = initialize ONCE, cleanup on unmount only
}



