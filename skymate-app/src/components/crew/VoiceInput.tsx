import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2 } from "lucide-react";
import { VoiceService } from "../../lib/voice";
import {
  parseRequest,
  type ParsedIntent,
  getParsePerformanceStats,
} from "../../lib/ai";
import { useTasks } from "../../hooks/useTasks";
import { useInventory } from "../../hooks/useInventory";
import { mapTaskItemToInventory } from "../../lib/itemMapping";
import { rawDGTest } from "../../lib/dgSmoke";
import { config } from "../../lib/config";
import { TTSService } from "../../lib/ttsService";
import { generateTaskScript } from "../../lib/taskScriptGenerator";
import { useToast } from "../shared/ToastContainer";
import { MicrophoneTest } from "./MicrophoneTest";
import { initializeFlightTasks } from "../../lib/flightInitialization";
import { useEarbudTapListener } from "../../hooks/useEarbudTapListener";

function VoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [showMicTest, setShowMicTest] = useState(false);
  const [isFlightStarted, setIsFlightStarted] = useState(false);
  const [isInitializingFlight, setIsInitializingFlight] = useState(false);

  const { createTask, tasks, cancelTaskItem, checkTaskItem } = useTasks();
  const { checkStock, reserveItemForTask } = useInventory();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const wakeWordCallbackRef = useRef<((text: string) => void) | null>(null);
  const wakeWordOnlyCallbackRef = useRef<((text: string) => void) | null>(null);
  const wakeWordConfirmationRef = useRef<(() => void) | null>(null);
  const ttsServiceRef = useRef<TTSService | null>(null);
  const hasAutoCreatedRef = useRef<boolean>(false); // Track if we've auto-created for this parsedIntent
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set()); // Track all timeouts for cleanup
  const isProcessingSessionRef = useRef<boolean>(false); // STRICT: Prevent ANY concurrent sessions (wake word OR earbud tap)
  const sessionTypeRef = useRef<"wake_word" | "earbud_tap" | null>(null); // Track session type to prevent mixing
  const lastWakeWordTimeRef = useRef<number>(0); // Debounce wake word detection
  const lastTranscriptRef = useRef<string>(""); // Track last transcript for smart debouncing
  const silentAudioRef = useRef<HTMLAudioElement | null>(null); // Silent audio for Media Session API
  const handleEarbudTapRef = useRef<(() => Promise<void>) | null>(null); // Ref for earbud tap handler
  const timingRef = useRef<{
    voiceRecognitionStart?: number;
    voiceRecognitionEnd?: number;
    aiParsingStart?: number;
    aiParsingEnd?: number;
    taskCreationStart?: number;
    taskCreationEnd?: number;
  }>({});

  // Manual flight initialization function
  const handleStartFlight = async () => {
    if (isFlightStarted || isInitializingFlight) return;

    setIsInitializingFlight(true);
    console.log("🛫 Starting flight manually...");

    try {
      const stats = await initializeFlightTasks();

      if (stats.tasksCreated > 0) {
        console.log(
          `✅ Flight started: ${stats.tasksCreated} tasks created`,
          stats
        );
        showSuccess(
          "Flight Started",
          `Created ${stats.tasksCreated} tasks from passenger manifest`
        );
        setIsFlightStarted(true);
      } else {
        console.log("ℹ️ No tasks to create or flight already started");
        showInfo("Flight Status", "No tasks to create");
        setIsFlightStarted(true);
      }
    } catch (error) {
      console.error("❌ Failed to start flight:", error);
      showError("Flight Start Error", "Failed to initialize flight tasks");
    } finally {
      setIsInitializingFlight(false);
    }
  };

  useEffect(() => {
    console.log("🎤 VoiceInput component mounted - initializing VoiceService");
    voiceServiceRef.current = new VoiceService();
    ttsServiceRef.current = new TTSService();

    // MEDIA SESSION HACK: Create and play silent audio to activate Media Session API
    // This tricks Chrome into routing media control events (earbud taps) to our page
    console.log(
      "🔇 Creating silent audio element for Media Session API activation"
    );

    // Create a silent 1-second MP3 using a data URI (tiny file)
    // This is a valid, ultra-minimal silent MP3
    const silentMP3 =
      "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

    const audio = new Audio(silentMP3);
    audio.loop = true;
    audio.volume = 0; // Silent
    silentAudioRef.current = audio;

    // CRITICAL FIX: Try to play immediately (may fail due to autoplay policy, but worth trying)
    // This ensures Media Session API is active as early as possible
    audio
      .play()
      .then(() => {
        console.log(
          "✅ Silent audio started immediately - Media Session API active!"
        );
      })
      .catch((error) => {
        console.log(
          "ℹ️ Silent audio autoplay blocked (expected) - waiting for user interaction:",
          error.message
        );
      });

    // Resume AudioContext on first user interaction (required for browser autoplay policy)
    let hasResumed = false;
    const events = ["click", "touchstart", "keydown"];

    const resumeOnInteraction = async () => {
      if (!hasResumed && ttsServiceRef.current) {
        try {
          await ttsServiceRef.current.resumeAudioContextOnUserInteraction();
          console.log("✅ AudioContext resumed on user interaction");
          hasResumed = true; // Only set to true if successful

          // MEDIA SESSION HACK: Start playing silent audio after user interaction
          // This activates Media Session API for earbud controls
          if (silentAudioRef.current) {
            try {
              await silentAudioRef.current.play();
              console.log(
                "✅ Silent audio playing - Media Session API should now work!"
              );
            } catch (audioError) {
              console.warn("⚠️ Could not start silent audio:", audioError);
            }
          }

          // Remove all event listeners after successful resume
          events.forEach((event) => {
            document.removeEventListener(event, resumeOnInteraction);
          });
        } catch (error) {
          console.warn(
            "⚠️ Failed to resume AudioContext on user interaction:",
            error
          );
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

    // Define the wake word callback
    const onWakeWordDetected = async (
      text: string,
      selectedAlternative?: any
    ) => {
      // STRICT SESSION GUARD: Block ALL new sessions if one is active
      if (isProcessingSessionRef.current) {
        console.log(
          `⛔ SESSION BLOCKED: A ${sessionTypeRef.current} session is already active, ignoring wake word`
        );
        return;
      }

      const now = Date.now();
      const timeSinceLastWakeWord = now - lastWakeWordTimeRef.current;
      const trimmedText = text.trim();

      // DEBOUNCE: Prevent rapid duplicate detections within 500ms
      const isExactDuplicate = trimmedText === lastTranscriptRef.current;
      const isTooQuick = timeSinceLastWakeWord < 500;

      if (isExactDuplicate && isTooQuick) {
        console.log(
          `⏸️ Ignoring duplicate wake word (${timeSinceLastWakeWord}ms since last)`
        );
        return;
      }

      // LOCK SESSION: Mark as active immediately to prevent race conditions
      isProcessingSessionRef.current = true;
      sessionTypeRef.current = "wake_word";
      lastWakeWordTimeRef.current = now;
      lastTranscriptRef.current = trimmedText;
      console.log(`🔒 WAKE WORD SESSION LOCKED: "${trimmedText}"`);

      // OPTIMIZATION: Handle low-confidence signal (empty transcript OR keepWakeWordActive flag)
      // When voice.ts passes an empty transcript or keepWakeWordActive flag, it means recognition failed quality checks
      const shouldRetry =
        trimmedText.length === 0 ||
        trimmedText === "" ||
        selectedAlternative?.keepWakeWordActive === true;

      if (shouldRetry) {
        console.warn(
          "⚠️ Low confidence or failed quality checks - requesting repeat",
          {
            emptyTranscript: trimmedText.length === 0,
            keepWakeWordActive: selectedAlternative?.keepWakeWordActive,
            transcript: trimmedText,
          }
        );

        // Play TTS feedback asking user to repeat
        if (ttsServiceRef.current) {
          try {
            await ttsServiceRef.current.speak(
              "I couldn't hear that, please repeat",
              {
                rate: 1.0,
                onEnd: () => {
                  console.log("✅ Low confidence TTS feedback complete");
                },
                onError: (error) => {
                  console.error("❌ TTS Error for low confidence:", error);
                },
              }
            );
          } catch (ttsError) {
            console.warn("⚠️ TTS failed for low confidence:", ttsError);
          }
        }

        // Reset state and ensure listening continues
        setTranscript("");
        setParsedIntent(null);
        setIsListening(false);
        setIsMicReady(false);
        hasAutoCreatedRef.current = false;

        // UNLOCK SESSION: Allow new sessions
        isProcessingSessionRef.current = false;
        sessionTypeRef.current = null;
        console.log(`🔓 Session unlocked (low confidence)`);

        // Restart continuous listening (wake word stays active per keepWakeWordActive flag)
        if (voiceServiceRef.current && wakeWordCallbackRef.current) {
          setTimeout(() => {
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              voiceServiceRef.current.ensureContinuousListening(
                wakeWordCallbackRef.current,
                wakeWordOnlyCallbackRef.current || undefined
              );
            }
          }, 100);
        }

        return; // Exit early - don't process failed transcript
      }

      // Check if it's empty or only contains wake word
      const isOnlyWakeWord =
        !trimmedText ||
        trimmedText.length === 0 ||
        /^(skymate|sky\s+mate|sky-mate|sky\s+make)(\s*|\.|,|!|\?)*$/i.test(
          trimmedText
        ) ||
        trimmedText
          .replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s*/i, "")
          .trim().length === 0;

      if (isOnlyWakeWord) {
        console.log("⏸️ Wake word only detected, waiting for request...", text);
        // UNLOCK SESSION: Allow new wake words since this was incomplete
        isProcessingSessionRef.current = false;
        sessionTypeRef.current = null;
        console.log(`🔓 Session unlocked (wake word only)`);
        // Don't process - just wait for the actual request
        // The timeout will handle resetting if no speech comes
        return;
      }

      // Wake word detected with actual request - process it
      console.log("🎯 Processing request after wake word:", text);

      // TIMING: Reset and mark voice recognition complete
      timingRef.current = {
        voiceRecognitionStart: Date.now(), // Approximate - actual start is when wake word detected
        voiceRecognitionEnd: Date.now(),
      };
      console.log(
        "⏱️ TIMING: Voice recognition complete, starting measurement"
      );

      setTranscript(text);
      setIsListening(true);
      setIsMicReady(true);

      // ==========================================
      // PRIORITY CHECK: CANCELLATION AND CHECK-OFF DETECTION
      // Must happen BEFORE other validations since these commands don't need wake word
      // ==========================================

      // Normalize speech-to-text seat variations for cancel/check commands
      // "one a" → "1A", "fifteen c" → "15C", etc.
      let normalizedForCancel = trimmedText
        .replace(/\bone\s+([a-f])\b/gi, "1$1")
        .replace(/\btwo\s+([a-f])\b/gi, "2$1")
        .replace(/\bthree\s+([a-f])\b/gi, "3$1")
        .replace(/\bfour\s+([a-f])\b/gi, "4$1")
        .replace(/\bfive\s+([a-f])\b/gi, "5$1")
        .replace(/\bsix\s+([a-f])\b/gi, "6$1")
        .replace(/\bseven\s+([a-f])\b/gi, "7$1")
        .replace(/\beight\s+([a-f])\b/gi, "8$1")
        .replace(/\bnine\s+([a-f])\b/gi, "9$1")
        .replace(/\bten\s+([a-f])\b/gi, "10$1")
        .replace(/\beleven\s+([a-f])\b/gi, "11$1")
        .replace(/\btwelve\s+([a-f])\b/gi, "12$1")
        .replace(/\bthirteen\s+([a-f])\b/gi, "13$1")
        .replace(/\bfourteen\s+([a-f])\b/gi, "14$1")
        .replace(/\bfifteen\s+([a-f])\b/gi, "15$1")
        .replace(/\bsixteen\s+([a-f])\b/gi, "16$1")
        .replace(/\bseventeen\s+([a-f])\b/gi, "17$1")
        .replace(/\beighteen\s+([a-f])\b/gi, "18$1")
        .replace(/\bnineteen\s+([a-f])\b/gi, "19$1")
        .replace(/\btwenty\s+([a-f])\b/gi, "20$1");

      // Check for CANCELLATION commands (e.g., "cancel 62B" or "cancel 1A chicken")
      const cancelPattern =
        /^cancel\s+(?:seat\s+)?([a-z]?\d+[a-z]?)(?:\s+(.+))?$/i;
      const cancelMatch = normalizedForCancel.match(cancelPattern);

      if (cancelMatch) {
        const seatToCancel = cancelMatch[1];
        const itemToCancel = (cancelMatch[2] || "").trim();

        // VALIDATION: Check if seat format is valid (e.g., "62A", not "62ab")
        const validSeatFormat = /^\d+[A-F]$/i;
        if (!validSeatFormat.test(seatToCancel)) {
          console.warn(`⚠️ Invalid seat format detected: "${seatToCancel}"`);

          // Play TTS feedback for invalid command
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                "Couldn't quite hear that, please repeat",
                { rate: 1.0 }
              );
            } catch (error) {
              console.warn("⚠️ TTS failed:", error);
            }
          }

          // Reset and restart listening
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);
          setParsedIntent(null);

          // UNLOCK SESSION: Command complete (invalid)
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (invalid cancel command)`);

          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }

          return; // Early return for invalid commands
        }

        // Check if this is a request to cancel entire order
        const cancelAllKeywords = /^(order|all|everything|task)$/i;
        const isCancelAll = cancelAllKeywords.test(itemToCancel);

        console.log(`🚫 Cancellation request detected (normalized)`, {
          original: trimmedText,
          normalized: normalizedForCancel,
          seat: seatToCancel,
          item: itemToCancel,
          cancelAll: isCancelAll,
        });

        setIsParsing(true);

        try {
          let result;

          if (isCancelAll) {
            // Cancel entire order - use special keyword to delete whole task
            result = await cancelTaskItem(seatToCancel, "__CANCEL_ALL__");
          } else {
            // Cancel specific item
            result = await cancelTaskItem(seatToCancel, itemToCancel);
          }

          if (result.success) {
            console.log(`✅ Cancellation successful`, result);

            // Provide TTS feedback
            if (ttsServiceRef.current) {
              try {
                if (result.deletedTask) {
                  if (isCancelAll) {
                    await ttsServiceRef.current.speak(
                      `Cancelled entire order for ${seatToCancel}`,
                      { rate: 1.0 }
                    );
                  } else {
                    await ttsServiceRef.current.speak("Cancel success", {
                      rate: 1.0,
                    });
                  }
                } else {
                  await ttsServiceRef.current.speak(
                    `Cancelled ${itemToCancel} for ${seatToCancel}. Remaining: ${result.remainingItems}`,
                    { rate: 1.0 }
                  );
                }
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            showSuccess(
              isCancelAll ? "Order Cancelled" : "Item Cancelled",
              result.message || "Cancellation successful"
            );
          } else {
            console.warn(`⚠️ Cancellation failed:`, result.message);

            // Provide TTS feedback - use "couldn't quite hear that" for consistency
            if (ttsServiceRef.current) {
              try {
                await ttsServiceRef.current.speak(
                  "Couldn't quite hear that, please repeat",
                  { rate: 1.0 }
                );
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            showWarning(
              "Cancellation Failed",
              result.message || "Item not found"
            );
          }
        } catch (error: any) {
          console.error("❌ Cancellation error:", error);
          showError(
            "Cancellation Error",
            error.message || "Failed to cancel item"
          );

          // Provide TTS feedback - use "couldn't quite hear that" for consistency
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                "Couldn't quite hear that, please repeat",
                { rate: 1.0 }
              );
            } catch (ttsError) {
              console.warn("⚠️ TTS failed:", ttsError);
            }
          }
        } finally {
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);
          setParsedIntent(null);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (cancel complete)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        }

        return; // Early return for cancellation commands
      }

      // Check for CHECK-OFF commands (e.g., "check 10A off" or "complete 52B" or "checkoff 9F")
      // CRITICAL FIX: Also match "checkoff" which is what voice service produces from "check X off"
      const checkPattern =
        /^(?:check|checkoff|complete)\s+(?:seat\s+)?([a-z]?\d+[a-z]?)(?:\s+(.+))?$/i;
      const checkMatch = normalizedForCancel.match(checkPattern);

      if (checkMatch) {
        const seatToCheck = checkMatch[1];
        const itemToCheck = (checkMatch[2] || "").trim();

        // VALIDATION: Check if seat format is valid (e.g., "62A", not "62ab")
        const validSeatFormat = /^\d+[A-F]$/i;
        if (!validSeatFormat.test(seatToCheck)) {
          console.warn(`⚠️ Invalid seat format detected: "${seatToCheck}"`);

          // Play TTS feedback for invalid command
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                "Couldn't quite hear that, please repeat",
                { rate: 1.0 }
              );
            } catch (error) {
              console.warn("⚠️ TTS failed:", error);
            }
          }

          // Reset and restart listening
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);
          setParsedIntent(null);

          // UNLOCK SESSION: Command complete (invalid)
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (invalid check command)`);

          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }

          return; // Early return for invalid commands
        }

        // Check if this is a request to check off entire order
        // CRITICAL FIX: Also treat empty itemToCheck as "check all" (e.g., "checkoff 9F" with no item)
        const checkAllKeywords = /^(off|all|everything|order|task|done)$/i;
        const isCheckAll = !itemToCheck || checkAllKeywords.test(itemToCheck);

        console.log(`✅ Check-off request detected (normalized)`, {
          original: trimmedText,
          normalized: normalizedForCancel,
          seat: seatToCheck,
          item: itemToCheck,
          checkAll: isCheckAll,
        });

        setIsParsing(true);

        try {
          let result;

          if (isCheckAll) {
            // Complete entire order
            result = await checkTaskItem(seatToCheck, "__CHECK_ALL__");
          } else {
            // Complete specific item
            result = await checkTaskItem(seatToCheck, itemToCheck);
          }

          if (result.success) {
            console.log(`✅ Check-off successful`, result);

            // Provide TTS feedback
            if (ttsServiceRef.current) {
              try {
                if (result.completedTask) {
                  if (isCheckAll) {
                    await ttsServiceRef.current.speak(
                      `Order completed for ${seatToCheck}`,
                      { rate: 1.0 }
                    );
                  } else {
                    await ttsServiceRef.current.speak(
                      `${itemToCheck} completed for ${seatToCheck}`,
                      { rate: 1.0 }
                    );
                  }
                } else {
                  await ttsServiceRef.current.speak(
                    `${itemToCheck} completed for ${seatToCheck}. Remaining: ${result.remainingItems}`,
                    { rate: 1.0 }
                  );
                }
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            showSuccess(
              isCheckAll ? "Order Completed" : "Item Completed",
              result.message || "Check-off successful"
            );
          } else {
            console.warn(`⚠️ Check-off failed:`, result.message);

            // Provide TTS feedback - use "couldn't quite hear that" for consistency
            if (ttsServiceRef.current) {
              try {
                await ttsServiceRef.current.speak(
                  "Couldn't quite hear that, please repeat",
                  { rate: 1.0 }
                );
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            showWarning("Check-off Failed", result.message || "Item not found");
          }
        } catch (error: any) {
          console.error("❌ Check-off error:", error);
          showError(
            "Check-off Error",
            error.message || "Failed to check off item"
          );

          // Provide TTS feedback - use "couldn't quite hear that" for consistency
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                "Couldn't quite hear that, please repeat",
                { rate: 1.0 }
              );
            } catch (ttsError) {
              console.warn("⚠️ TTS failed:", ttsError);
            }
          }
        } finally {
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);
          setParsedIntent(null);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (check complete)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        }

        return; // Early return for check-off commands
      }

      // ==========================================
      // END PRIORITY CHECK: CANCELLATION AND CHECK-OFF DETECTION
      // ==========================================

      // Check if it starts with seat number pattern (wake word already removed)
      // ENHANCED: Also accept just a seat number without space (e.g., "30C" or "30C ice cream")
      const seatNumberPattern = /^(\d+[A-F])(\s+|$)/i;
      const startsWithSeatNumber = seatNumberPattern.test(trimmedText);

      // PRODUCTION: Check if this is a task command (e.g., "remind me of Task 1" or "show tasks")

      // Pattern for task range with multiple formats:
      // 1. "task 1 to 4", "task 1 through 4", "task 1-4"
      // 2. "task 1:00 4:00" (speech recognition interprets "1 to 4" as times)
      // 3. "past 1:00 until 4:00" (speech recognition mishears "task" as "past")
      // 4. "task 1 2 3" (without "to") - FIXED: Handle missing "to"
      // Use \s+ for robust whitespace handling

      // First, try to fix time misrecognitions: "1:00 to 3:00" → "1 to 3"
      let normalizedText = trimmedText.replace(/(\d+):00/g, "$1");

      const taskRangePattern =
        /\b(remind|show|display|list|tell|what).*?\b(Task|task|past)s?\s+(\d+)\s+(?:(?:to|through|-|until|and)\s+)?(\d+)(?:\b|$)/i;
      const taskRangeMatch = normalizedText.match(taskRangePattern);

      // Debug: Log pattern matching
      console.log(`🔍 Task range pattern test:`, {
        original: trimmedText,
        normalized: normalizedText,
        rangeMatch: taskRangeMatch
          ? {
              fullMatch: taskRangeMatch[0],
              start: taskRangeMatch[3],
              end: taskRangeMatch[4],
              allGroups: taskRangeMatch,
            }
          : "NO MATCH",
      });

      // Pattern for single task number
      // Also handles "past" as a common misrecognition of "task"
      // Use normalized text (without :00)
      const taskCommandWithNumberPattern =
        /\b(remind|show|display|list|tell|what).*?\b(Task|task|past)\s+(\d+)\b/i;
      const taskCommandWithNumberMatch = normalizedText.match(
        taskCommandWithNumberPattern
      );

      // Also check for general task commands without number (e.g., "show tasks", "list tasks")
      const taskCommandGeneralPattern =
        /\b(remind|show|display|list|tell|what).*?\b(tasks?)\b/i;
      const taskCommandGeneralMatch = normalizedText.match(
        taskCommandGeneralPattern
      );

      // NEW: Check for meal description commands (e.g., "describe chicken meal", "describe beef")
      const describeMealPattern =
        /\b(describe|tell me about|what's in|what is in|info about|information about)\s+(?:the\s+)?(.+?)(?:\s+meal)?$/i;
      const describeMealMatch = normalizedText.match(describeMealPattern);

      // NEW: Check for seat information commands (e.g., "remind me of 52B", "tell me about seat 25A")
      // Pattern matches with or without the word "seat"
      // Handles both: "remind me of 50A" AND "50A remind me of" (reversed order from Azure)
      // ENHANCED: Also handles bare seat numbers like "5B" or "32B" being repeated in speech recognition
      const seatInfoPattern1 =
        /\b(remind|tell|show|display|what|who|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+seat)?\s+(\d{1,2}[A-F])\b/i;
      const seatInfoPattern2 =
        /\b(\d{1,2}[A-F])\s+(remind|tell|show|display|what|who|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?/i;
      // ENHANCED: Pattern for "5B five b remind me" or similar misrecognitions
      const seatInfoPattern3 =
        /^(\d{1,2}[A-F])(?:\s+\w+\s+\w+)?\s+(remind|tell|show|display|what|who|info|information)/i;

      const seatInfoMatch =
        normalizedText.match(seatInfoPattern1) ||
        normalizedText.match(seatInfoPattern2) ||
        normalizedText.match(seatInfoPattern3);

      // Extract seat number from whichever pattern matched
      let seatNumber: string | null = null;
      if (seatInfoMatch) {
        if (seatInfoMatch[2] && /^\d{1,2}[A-F]$/i.test(seatInfoMatch[2])) {
          // Pattern 1: seat is in group 2
          seatNumber = seatInfoMatch[2];
        } else if (
          seatInfoMatch[1] &&
          /^\d{1,2}[A-F]$/i.test(seatInfoMatch[1])
        ) {
          // Pattern 2 & 3: seat is in group 1
          seatNumber = seatInfoMatch[1];
        }
      }

      // Exclude if it's a task command (e.g., "remind me of task 1")
      const isTaskCommand = /\b(task|past|ask)\s+\d+/i.test(normalizedText);
      const validSeatInfo = seatInfoMatch && seatNumber && !isTaskCommand;

      // NEW: Check for special requests list command (e.g., "remind me of special requests", "list special requests")
      // ENHANCED: Also handle reversed word order from speech recognition (e.g., "requests remind me of special")
      const specialRequestsPattern =
        /\b(remind|tell|show|display|list|what|give|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+the)?(?:\s+all)?(?:\s+special\s*requests?)\b/i;
      const specialRequestsPatternReversed =
        /\b(?:requests?|request)(?:\s+special)?(?:\s+remind|tell|show|display|list|what|give|info|information)/i;
      const specialRequestsMatch =
        normalizedText.match(specialRequestsPattern) ||
        normalizedText.match(specialRequestsPatternReversed);

      // NEW: Check for priority members list command (e.g., "who is priority member", "list priority members")
      // ENHANCED: Also handle reversed word order from speech recognition (e.g., "members priority who is")
      const priorityMembersPattern =
        /\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+priority\s*members?)\b/i;
      const priorityMembersPatternReversed =
        /\b(?:members?|member)(?:\s+priority)?(?:\s+who|which|list|show|display|tell|what|give|info|information)/i;
      const priorityMembersMatch =
        normalizedText.match(priorityMembersPattern) ||
        normalizedText.match(priorityMembersPatternReversed);

      console.log(`🔍 Priority members pattern test:`, {
        text: normalizedText,
        match: priorityMembersMatch ? "MATCH" : "NO MATCH",
        pattern: "priority members pattern",
      });

      // NEW: Check for team introduction command (e.g., "introduce our team", "introduce the team", "introduce yourself")
      const teamIntroPattern =
        /\b(introduce|show|tell|display|present)(?:\s+me)?(?:\s+(?:our|the|yourself))?\s*(?:team)?\b/i;
      const teamIntroMatch =
        normalizedText.match(teamIntroPattern) &&
        (normalizedText.includes("team") ||
          normalizedText.includes("yourself"));

      console.log(`🔍 Team introduction pattern test:`, {
        text: normalizedText,
        match: teamIntroMatch ? "MATCH" : "NO MATCH",
        pattern: "team introduction pattern",
      });

      // Handle seat information requests
      if (validSeatInfo) {
        console.log("🪑 Seat information request detected:", {
          command: normalizedText,
          seatNumber: seatNumber,
        });

        const seatNumberUpper = seatNumber!.toUpperCase().trim();

        // Import passenger data
        const { getPassengerInfo } = await import("../../data/passengerData");

        const passengerInfo = getPassengerInfo(seatNumberUpper);

        if (passengerInfo) {
          console.log(
            `✅ Found passenger information for seat: ${seatNumberUpper}`
          );

          // Check if there are any pending tasks for this seat
          const seatTasks = tasks.filter(
            (task) =>
              task.seat.toUpperCase() === seatNumberUpper &&
              task.status === "pending"
          );

          console.log(
            `📋 Found ${seatTasks.length} pending task(s) for seat ${seatNumberUpper}`
          );

          // Play TTS with passenger information
          if (ttsServiceRef.current) {
            try {
              let description: string;

              if (seatTasks.length > 0) {
                // If there are pending tasks, mention what they actually requested
                const taskDescriptions = seatTasks
                  .map((task, index) => {
                    if (seatTasks.length === 1) {
                      return `requested ${task.item || task.request}`;
                    } else if (index === 0) {
                      return `requested ${task.item || task.request}`;
                    } else if (index === seatTasks.length - 1) {
                      return `and ${task.item || task.request}`;
                    } else {
                      return `${task.item || task.request}`;
                    }
                  })
                  .join(", ");

                description = `Seat ${seatNumberUpper}, ${passengerInfo.passengerName} ${taskDescriptions}.`;

                // Add dietary restrictions if relevant
                if (
                  passengerInfo.dietaryRestrictions &&
                  passengerInfo.dietaryRestrictions.length > 0
                ) {
                  const restrictions =
                    passengerInfo.dietaryRestrictions.join(" and ");
                  description += ` They have ${restrictions} dietary restrictions.`;
                }
              } else {
                // If no pending tasks, provide basic passenger info
                description = `Seat ${seatNumberUpper}, ${passengerInfo.passengerName}`;
                if (
                  passengerInfo.dietaryRestrictions &&
                  passengerInfo.dietaryRestrictions.length > 0
                ) {
                  const restrictions =
                    passengerInfo.dietaryRestrictions.join(" and ");
                  description += ` with ${restrictions} dietary restrictions`;
                }
              }

              console.log(`🔊 Speaking passenger information: ${description}`);

              await ttsServiceRef.current.speak(description, {
                rate: 1.0,
                onEnd: () => {
                  console.log("✅ Passenger information spoken successfully");
                },
                onError: (error) => {
                  console.error("❌ TTS Error for passenger info:", error);
                },
              });
            } catch (error) {
              console.error("❌ Error playing passenger information:", error);
            }
          }

          // Reset state and restart listening
          setTranscript("");
          setParsedIntent(null);
          setIsListening(false);
          setIsMicReady(false);
          hasAutoCreatedRef.current = false;

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (passenger info found)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        } else {
          console.warn(
            `⚠️ No passenger information found for seat: ${seatNumberUpper}`
          );

          // Play TTS with "not found" message
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                `Sorry, I don't have passenger information for seat ${seatNumberUpper}. This seat may be unassigned.`,
                {
                  rate: 1.0,
                }
              );
            } catch (error) {
              console.warn("⚠️ TTS failed:", error);
            }
          }

          // Reset state and restart listening
          setTranscript("");
          setParsedIntent(null);
          setIsListening(false);
          setIsMicReady(false);
          hasAutoCreatedRef.current = false;

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (passenger info not found)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        }

        return; // Exit early - don't process as regular request
      }

      // Handle special requests list command
      if (specialRequestsMatch) {
        console.log("📋 Special requests list command detected:", {
          command: normalizedText,
        });

        // Import passenger data
        const { formatAllSpecialRequests } = await import(
          "../../data/passengerData"
        );

        const specialRequestsText = formatAllSpecialRequests();

        console.log(`✅ Found special requests: ${specialRequestsText}`);

        // Play TTS with special requests
        if (ttsServiceRef.current) {
          try {
            console.log(`🔊 Speaking special requests: ${specialRequestsText}`);

            await ttsServiceRef.current.speak(specialRequestsText, {
              rate: 1.0,
              onEnd: () => {
                console.log("✅ Special requests spoken successfully");
              },
              onError: (error) => {
                console.error("❌ TTS Error for special requests:", error);
              },
            });
          } catch (error) {
            console.error("❌ Error playing special requests:", error);
          }
        }

        // Reset state and restart listening
        setTranscript("");
        setParsedIntent(null);
        setIsListening(false);
        setIsMicReady(false);
        hasAutoCreatedRef.current = false;

        // UNLOCK SESSION: Command complete
        isProcessingSessionRef.current = false;
        console.log(`🔓 Session unlocked (special requests)`);

        // Restart continuous listening
        if (voiceServiceRef.current && wakeWordCallbackRef.current) {
          createTimeout(() => {
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              voiceServiceRef.current.ensureContinuousListening(
                wakeWordCallbackRef.current,
                wakeWordOnlyCallbackRef.current || undefined
              );
            }
          }, 100);
        }

        return; // Exit early for special requests list command
      }

      // Handle priority members list command
      if (priorityMembersMatch) {
        console.log("⭐ Priority members list command detected:", {
          command: normalizedText,
        });

        // Import passenger data
        const { formatAllPriorityMembers } = await import(
          "../../data/passengerData"
        );

        const priorityMembersText = formatAllPriorityMembers();

        console.log(`✅ Found priority members: ${priorityMembersText}`);

        // Play TTS with priority members
        if (ttsServiceRef.current) {
          try {
            console.log(`🔊 Speaking priority members: ${priorityMembersText}`);

            await ttsServiceRef.current.speak(priorityMembersText, {
              rate: 1.0,
              onEnd: () => {
                console.log("✅ Priority members spoken successfully");
              },
              onError: (error) => {
                console.error("❌ TTS Error for priority members:", error);
              },
            });
          } catch (error) {
            console.error("❌ Error playing priority members:", error);
          }
        }

        // Reset state and restart listening
        setTranscript("");
        setParsedIntent(null);
        setIsListening(false);
        setIsMicReady(false);
        hasAutoCreatedRef.current = false;

        // UNLOCK SESSION: Command complete
        isProcessingSessionRef.current = false;
        console.log(`🔓 Session unlocked (priority members)`);

        // Restart continuous listening
        if (voiceServiceRef.current && wakeWordCallbackRef.current) {
          createTimeout(() => {
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              voiceServiceRef.current.ensureContinuousListening(
                wakeWordCallbackRef.current,
                wakeWordOnlyCallbackRef.current || undefined
              );
            }
          }, 100);
        }

        return; // Exit early for priority members list command
      }

      // Handle team introduction command
      if (teamIntroMatch) {
        console.log("👥 Team introduction command detected:", {
          command: normalizedText,
        });

        const teamIntroText =
          "Sorry, I couldnt catch that. JUST KIDDING, Hello Judges, I'm the sixth member, skymate! We are C O B";

        console.log(`✅ Team introduction: ${teamIntroText}`);

        // Play TTS with team introduction
        if (ttsServiceRef.current) {
          try {
            console.log(`🔊 Speaking team introduction: ${teamIntroText}`);

            await ttsServiceRef.current.speak(teamIntroText, {
              rate: 1.0,
              onEnd: () => {
                console.log("✅ Team introduction spoken successfully");

                // Reset state and restart listening AFTER TTS completes
                setTranscript("");
                setParsedIntent(null);
                setIsListening(false);
                setIsMicReady(false);
                hasAutoCreatedRef.current = false;

                // UNLOCK SESSION: Command complete
                isProcessingSessionRef.current = false;
                console.log(`🔓 Session unlocked (team introduction)`);

                // Restart continuous listening
                if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                  createTimeout(() => {
                    if (
                      voiceServiceRef.current &&
                      wakeWordCallbackRef.current
                    ) {
                      voiceServiceRef.current.ensureContinuousListening(
                        wakeWordCallbackRef.current,
                        wakeWordOnlyCallbackRef.current || undefined
                      );
                    }
                  }, 100);
                }
              },
              onError: (error) => {
                console.error("❌ TTS Error for team introduction:", error);

                // Reset state even on error
                setTranscript("");
                setParsedIntent(null);
                setIsListening(false);
                setIsMicReady(false);
                hasAutoCreatedRef.current = false;
                isProcessingSessionRef.current = false;

                // Restart listening even on error
                if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                  createTimeout(() => {
                    if (
                      voiceServiceRef.current &&
                      wakeWordCallbackRef.current
                    ) {
                      voiceServiceRef.current.ensureContinuousListening(
                        wakeWordCallbackRef.current,
                        wakeWordOnlyCallbackRef.current || undefined
                      );
                    }
                  }, 100);
                }
              },
            });
          } catch (error) {
            console.error("❌ Error playing team introduction:", error);

            // Reset state on exception
            setTranscript("");
            setParsedIntent(null);
            setIsListening(false);
            setIsMicReady(false);
            hasAutoCreatedRef.current = false;
            isProcessingSessionRef.current = false;

            // Restart listening
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              createTimeout(() => {
                if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                  voiceServiceRef.current.ensureContinuousListening(
                    wakeWordCallbackRef.current,
                    wakeWordOnlyCallbackRef.current || undefined
                  );
                }
              }, 100);
            }
          }
        }

        return; // Exit early for team introduction command
      }

      // Handle meal description requests
      if (describeMealMatch) {
        console.log("🍽️ Meal description request detected:", {
          command: describeMealMatch[1],
          mealName: describeMealMatch[2],
        });

        const mealName = describeMealMatch[2].trim();

        // Import meal ingredients data
        const { getMealIngredients, formatMealDescription } = await import(
          "../../data/mealIngredients"
        );

        const mealInfo = getMealIngredients(mealName);

        if (mealInfo) {
          console.log(`✅ Found meal information for: ${mealInfo.name}`);

          // Play TTS with meal description
          if (ttsServiceRef.current) {
            try {
              const description = formatMealDescription(mealInfo);
              console.log(`🔊 Speaking meal description: ${description}`);

              await ttsServiceRef.current.speak(description, {
                rate: 1.0,
                onEnd: () => {
                  console.log("✅ Meal description complete");
                },
                onError: (error) => {
                  console.error("❌ TTS Error for meal description:", error);
                },
              });
            } catch (error) {
              console.error("❌ Error playing meal description:", error);
            }
          }

          // Reset state and restart listening
          setTranscript("");
          setParsedIntent(null);
          setIsListening(false);
          setIsMicReady(false);
          hasAutoCreatedRef.current = false;

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (meal info found)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        } else {
          console.warn(`⚠️ No meal information found for: ${mealName}`);

          // Play TTS with "not found" message
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                `Sorry, I don't have information about ${mealName}. Available meals include chicken, beef, fish, vegetarian, and vegan.`,
                {
                  rate: 1.0,
                }
              );
            } catch (error) {
              console.warn("⚠️ TTS failed:", error);
            }
          }

          // Reset state and restart listening
          setTranscript("");
          setParsedIntent(null);
          setIsListening(false);
          setIsMicReady(false);
          hasAutoCreatedRef.current = false;

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (meal info not found)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        }

        return; // Exit early - don't process as regular request
      }

      if (taskRangeMatch) {
        // This is a task range command - handle TTS for multiple tasks
        const startTask = parseInt(taskRangeMatch[3]);
        const endTask = parseInt(taskRangeMatch[4]);
        console.log(
          `📋 Task range command detected: Task ${startTask} to ${endTask}`
        );

        // Filter to pending tasks only (to match what user sees on screen)
        const pendingTasks = tasks.filter((t) => t.status === "pending");

        // PRODUCTION: Early check - if no pending tasks exist, skip GPT call and database operations
        if (pendingTasks.length === 0) {
          const noTasksMessage = "There are no pending tasks.";
          console.log("⏸️ No pending tasks available, skipping GPT call");

          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(noTasksMessage, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ No tasks message spoken");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
              },
            });
          } else {
            showInfo("No Tasks", noTasksMessage);
          }

          setParsedIntent(null);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (no tasks - task range)`);

          // Ensure continuous listening restarts
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            setTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 200);
          }
          return; // Early return - no database or GPT calls
        }

        setIsParsing(true);
        try {
          // Generate script using GPT for task range (only called if tasks exist)
          // Use pendingTasks so task numbers match what user sees
          const script = await generateTaskScript(pendingTasks, {
            startTask,
            endTask,
          });

          // Speak the script
          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(script, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ Task range reminder spoken successfully");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
                showError(
                  "TTS Error",
                  `Failed to speak task reminder: ${error.message}`
                );
              },
            });
          } else {
            // Fallback: just show the script
            showInfo("Task Reminder", script);
          }

          // Don't create a task for task commands
          setParsedIntent(null);
        } catch (error: any) {
          console.error("Failed to generate/speak task script:", error);
          showError(
            "Task Reminder Failed",
            `Failed to generate task reminder: ${
              error.message || "Unknown error"
            }`
          );
        } finally {
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (task range complete)`);

          // Azure Speech Service will auto-restart via its internal mechanism
        }
        return; // Early return for task range commands
      } else if (taskCommandWithNumberMatch) {
        // This is a task command with specific number - handle TTS
        const taskNumber = parseInt(taskCommandWithNumberMatch[3]);
        console.log(`📋 Task command detected: Task ${taskNumber}`);

        // Filter to pending tasks only (to match what user sees on screen)
        const pendingTasks = tasks.filter((t) => t.status === "pending");

        // PRODUCTION: Early check - if no pending tasks exist, skip GPT call and database operations
        if (pendingTasks.length === 0) {
          const noTasksMessage = "There are no pending tasks.";
          console.log("⏸️ No pending tasks available, skipping GPT call");

          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(noTasksMessage, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ No tasks message spoken");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
              },
            });
          } else {
            showInfo("No Tasks", noTasksMessage);
          }

          setParsedIntent(null);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (no tasks - single task)`);

          // Azure Speech Service will auto-restart via its internal mechanism
          return; // Early return - no database or GPT calls
        }

        setIsParsing(true);
        try {
          // Generate script using GPT (only called if tasks exist)
          // Use pendingTasks so task numbers match what user sees
          const script = await generateTaskScript(pendingTasks, { taskNumber });

          // Speak the script
          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(script, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ Task reminder spoken successfully");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
                showError(
                  "TTS Error",
                  `Failed to speak task reminder: ${error.message}`
                );
              },
            });
          } else {
            // Fallback: just show the script
            showInfo("Task Reminder", script);
          }

          // Don't create a task for task commands
          setParsedIntent(null);
        } catch (error: any) {
          console.error("Failed to generate/speak task script:", error);
          showError(
            "Task Reminder Failed",
            `Failed to generate task reminder: ${
              error.message || "Unknown error"
            }`
          );
        } finally {
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (single task complete)`);

          // Azure Speech Service will auto-restart via its internal mechanism
        }
        return; // Early return for task commands
      } else if (taskCommandGeneralMatch) {
        // This is a general task command (no number) - show all tasks
        console.log(`📋 General task command detected: show/list tasks`);

        // PRODUCTION: Early check - if no pending tasks exist, skip GPT call and database operations
        const pendingTasks = tasks.filter((t) => t.status === "pending");
        if (pendingTasks.length === 0) {
          const noTasksMessage = "There are no tasks.";
          console.log("⏸️ No pending tasks available, skipping GPT call");

          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(noTasksMessage, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ No tasks message spoken");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
              },
            });
          } else {
            showInfo("No Tasks", noTasksMessage);
          }

          setParsedIntent(null);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (no tasks - general)`);

          // Azure Speech Service will auto-restart via its internal mechanism
          return; // Early return - no database or GPT calls
        }

        setIsParsing(true);
        try {
          // Generate script for all pending tasks (only called if tasks exist)
          const script = await generateTaskScript(tasks, { allTasks: false }); // Show pending tasks

          // Speak the script
          if (ttsServiceRef.current) {
            await ttsServiceRef.current.speak(script, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onEnd: () => {
                console.log("✅ Task reminder spoken successfully");
              },
              onError: (error) => {
                console.error("❌ TTS Error:", error);
                showError(
                  "TTS Error",
                  `Failed to speak task reminder: ${error.message}`
                );
              },
            });
          } else {
            // Fallback: just show the script
            showInfo("Task Reminder", script);
          }

          // Don't create a task for task commands
          setParsedIntent(null);
        } catch (error: any) {
          console.error("Failed to generate/speak task script:", error);
          showError(
            "Task Reminder Failed",
            `Failed to generate task reminder: ${
              error.message || "Unknown error"
            }`
          );
        } finally {
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);

          // UNLOCK SESSION: Command complete
          isProcessingSessionRef.current = false;
          console.log(`🔓 Session unlocked (general task complete)`);

          // Azure Speech Service will auto-restart via its internal mechanism
        }
        return; // Early return for task commands
      }

      // If it doesn't start with seat number, check for wake word
      let textToParse: string;
      if (!startsWithSeatNumber) {
        // Accept: skymate, sky mate, sky-mate, sky make (common misrecognitions)
        const skymatePattern = /^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i;

        if (!skymatePattern.test(trimmedText)) {
          // ENHANCED: Check if this might be a valid command without wake word
          // Some commands might have wake word stripped by voice service
          const hasValidCommandWords =
            /\b(cancel|check|complete|remind|show|list|tell|describe|who|what)\b/i.test(
              trimmedText
            );

          if (!hasValidCommandWords) {
            // Definitely not a valid command
            console.log(
              'Transcript does not start with "Skymate" or variant and has no valid command words, ignoring:',
              text
            );
            setParsedIntent(null);

            // UNLOCK SESSION: Not a valid command
            isProcessingSessionRef.current = false;
            sessionTypeRef.current = null;
            console.log(`🔓 Session unlocked (invalid wake word)`);
            return;
          } else {
            // Might be valid command with wake word stripped - try to process it
            console.log(
              "⚠️ No wake word prefix but has valid command words, attempting to process:",
              text
            );
            textToParse = trimmedText;
          }
        } else {
          // Remove "Skymate" prefix (or variant) and process the rest
          const normalizedText = trimmedText
            .replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i, "")
            .trim();
          console.log("Original:", text, "| Processed:", normalizedText);
          textToParse = normalizedText;
        }
      } else {
        // Already starts with seat number, use as-is
        textToParse = trimmedText;
        console.log("Text already has seat number, using as-is:", textToParse);
      }

      // PERFORMANCE OPTIMIZATION: Restart listening immediately in parallel with GPT parsing
      // This allows user to say "skymate" again without waiting for parsing to complete
      setIsListening(false);
      setIsMicReady(false);

      // DEBUG: Log command detection summary
      console.log(`📊 Command detection summary:`, {
        text: trimmedText,
        textToParse: textToParse,
        startsWithSeatNumber: startsWithSeatNumber,
        taskRangeMatch: !!taskRangeMatch,
        taskCommandMatch: !!taskCommandWithNumberMatch,
        taskGeneralMatch: !!taskCommandGeneralMatch,
        mealDescMatch: !!describeMealMatch,
        seatInfoMatch: !!validSeatInfo,
        specialRequestsMatch: !!specialRequestsMatch,
        priorityMembersMatch: !!priorityMembersMatch,
        sessionLocked: isProcessingSessionRef.current,
      });

      if (voiceServiceRef.current && wakeWordCallbackRef.current) {
        createTimeout(() => {
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            voiceServiceRef.current.ensureContinuousListening(
              wakeWordCallbackRef.current,
              wakeWordOnlyCallbackRef.current || undefined
            );
            console.log(
              "✅ Continuous listening restarted immediately (parallel with parsing)"
            );
          }
        }, 100);
      }

      // Parse with AI in background (non-blocking)
      setIsParsing(true);

      // TIMING: Mark AI parsing start
      timingRef.current.aiParsingStart = Date.now();

      // Run parsing asynchronously without blocking
      parseRequest(textToParse)
        .then((intent) => {
          // TIMING: Mark AI parsing complete
          timingRef.current.aiParsingEnd = Date.now();

          setParsedIntent(intent);
          setIsParsing(false);
        })
        .catch(async (error: any) => {
          console.error("❌ Parsing failed:", error);

          // Play TTS feedback for all errors: "couldn't hear that"
          if (ttsServiceRef.current) {
            try {
              await ttsServiceRef.current.speak(
                "Couldn't hear that, please repeat",
                { rate: 1.0 }
              );
            } catch (ttsError) {
              console.warn("⚠️ TTS failed:", ttsError);
            }
          }

          // Reset state - don't set parsedIntent for errors
          setParsedIntent(null);
          setIsParsing(false);
          setIsListening(false);
          setIsMicReady(false);

          // UNLOCK SESSION: Parsing failed
          isProcessingSessionRef.current = false;
          sessionTypeRef.current = null;
          console.log(`🔓 Session unlocked (parsing error)`);

          // Restart continuous listening
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            createTimeout(() => {
              if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                voiceServiceRef.current.ensureContinuousListening(
                  wakeWordCallbackRef.current,
                  wakeWordOnlyCallbackRef.current || undefined
                );
              }
            }, 100);
          }
        });
    };

    const onWakeWordOnly = (_text: string) => {
      // Optional: callback for when wake word is not detected (for debugging)
      // Could show a subtle indicator that it's listening
    };

    // Wake word confirmation callback - plays notification beep
    const onWakeWordConfirmation = async () => {
      console.log("🔔 Playing wake word confirmation beep");
      if (ttsServiceRef.current) {
        try {
          await ttsServiceRef.current.playWakeWordConfirmation();
        } catch (error) {
          console.warn(
            "⚠️ Wake word confirmation failed (non-critical):",
            error
          );
          // If audio fails on first wake word, it will work on subsequent ones
          // after the user has clicked/touched the page
        }
      }
    };

    // Store callbacks for later use
    wakeWordCallbackRef.current = onWakeWordDetected;
    wakeWordOnlyCallbackRef.current = onWakeWordOnly;
    wakeWordConfirmationRef.current = onWakeWordConfirmation;

    // Start continuous listening with wake word detection
    if (voiceServiceRef.current) {
      voiceServiceRef.current.startContinuousListening(
        onWakeWordDetected,
        onWakeWordOnly,
        onWakeWordConfirmation
      );
    }

    return () => {
      // Clean up event listeners
      events.forEach((event) => {
        document.removeEventListener(event, resumeOnInteraction);
      });

      // Clean up all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();

      // Stop and clean up silent audio
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }

      voiceServiceRef.current?.stopListening();
      ttsServiceRef.current?.stop();
      ttsServiceRef.current?.dispose();
    };
  }, [tasks]); // Include tasks in dependencies so we have access to latest tasks

  // Helper function to create tracked timeouts
  const createTimeout = (
    callback: () => void,
    delay: number
  ): NodeJS.Timeout => {
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      callback();
    }, delay);
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  };

  // Auto-create task when parsedIntent is set (and valid)
  useEffect(() => {
    // Only auto-create if:
    // 1. parsedIntent exists
    // 2. Not currently parsing
    // 3. Seat is not "unknown" (which indicates a parsing error)
    // 4. We haven't already auto-created for this intent
    if (
      parsedIntent &&
      !isParsing &&
      parsedIntent.seat !== "unknown" &&
      !hasAutoCreatedRef.current
    ) {
      console.log("🤖 Auto-creating task for parsed intent:", parsedIntent);
      hasAutoCreatedRef.current = true; // Mark as created to prevent duplicates
      handleCreateTask();
    }

    // Reset the flag when parsedIntent changes or is cleared
    if (!parsedIntent) {
      hasAutoCreatedRef.current = false;
    }
  }, [parsedIntent, isParsing]); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = async () => {
    console.log("🎤 Microphone button clicked - starting to listen");
    if (!voiceServiceRef.current) {
      console.error(
        "❌ VoiceService is null - Web Speech API may not be supported"
      );
      showError(
        "Voice Service Unavailable",
        "Please use Chrome, Edge, or Safari browser."
      );
      return;
    }

    // Set listening state immediately for visual feedback
    setIsListening(true);
    setIsMicReady(false);
    setTranscript("");
    setParsedIntent(null);

    // Add a small delay to ensure mic is ready before user speaks
    // This prevents missing the first word "Seat"
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsMicReady(true); // Indicate mic is ready

    await voiceServiceRef.current.startListening(async (text) => {
      // TIMING: Reset and mark voice recognition complete
      timingRef.current = {
        voiceRecognitionStart: Date.now(),
        voiceRecognitionEnd: Date.now(),
      };
      console.log(
        "⏱️ TIMING: Voice recognition complete (manual), starting measurement"
      );

      setTranscript(text);
      setIsListening(false);
      setIsMicReady(false);
      voiceServiceRef.current?.stopListening();

      // The text from VoiceService should already have the seat preserved
      // But check if it starts with a seat number pattern (e.g., "26B needs chicken")
      // If it does, it means the wake word was already processed
      const trimmedText = text.trim();

      // Check if it starts with seat number pattern (wake word already removed)
      const seatNumberPattern = /^(\d+[A-F])\s+/i;
      const startsWithSeatNumber = seatNumberPattern.test(trimmedText);

      // If it doesn't start with seat number, check for wake word
      if (!startsWithSeatNumber) {
        // Accept: skymate, sky mate, sky-mate, sky make (common misrecognitions)
        const skymatePattern = /^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i;

        if (!skymatePattern.test(trimmedText)) {
          // If it doesn't start with "Skymate" or a variant, don't process it
          console.log(
            'Transcript does not start with "Skymate" or variant, ignoring:',
            text
          );
          showWarning(
            "Wake Word Required",
            'Please start your request with "Skymate" (e.g., "Skymate 32B needs water")'
          );
          setParsedIntent(null);
          return;
        }

        // Remove "Skymate" prefix (or variant) and process the rest
        // Normalize all variants to "skymate" for consistency, then remove it
        const normalizedText = trimmedText
          .replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i, "")
          .trim();
        console.log("Original:", text, "| Processed:", normalizedText);

        // Use normalized text for parsing
        var textToParse = normalizedText;
      } else {
        // Already starts with seat number, use as-is
        var textToParse = trimmedText;
        console.log("Text already has seat number, using as-is:", textToParse);
      }

      // Parse with AI
      setIsParsing(true);

      // TIMING: Mark AI parsing start
      timingRef.current.aiParsingStart = Date.now();

      try {
        // Optional: You can provide flight context here if available
        const intent = await parseRequest(textToParse);

        // TIMING: Mark AI parsing complete
        timingRef.current.aiParsingEnd = Date.now();

        setParsedIntent(intent);
      } catch (error: any) {
        console.error("Parsing failed:", error);
        // Show user-friendly error message
        const errorMessage =
          error?.message || "Failed to process your request. Please try again.";
        showWarning("Parsing Error", errorMessage);

        // Still show the transcript so user can manually create a task
        setParsedIntent({
          seat: "unknown",
          type: "assistance",
          priority: "normal",
          suggestedResponse: "Please review and create task manually.",
        });
      } finally {
        setIsParsing(false);
      }
    });
  };

  const stopListening = () => {
    voiceServiceRef.current?.stopListening();
    setIsListening(false);
    setIsMicReady(false);
  };

  // Earbud tap handler - SIMPLIFIED to use virtual wake-word system
  // This leverages the proven Azure Speech wake-word detection for 100% reliability
  // CRITICAL FIX: Use useCallback to create stable reference that's available from first render
  const handleEarbudTap = useCallback(async () => {
    console.log("🎧 Earbud tap detected - checking session lock...");

    // STRICT SESSION GUARD: Block if any session is already active
    if (isProcessingSessionRef.current) {
      console.log(
        `⛔ EARBUD TAP BLOCKED: A ${sessionTypeRef.current} session is already active`
      );
      return;
    }

    if (!voiceServiceRef.current) {
      console.error("❌ VoiceService not available");
      return;
    }

    try {
      // Play wake-word confirmation beep (same audio as "Skymate")
      if (wakeWordConfirmationRef.current) {
        await wakeWordConfirmationRef.current();
      }

      // Trigger virtual wake-word detection
      // This uses the EXACT same proven flow as saying "Skymate"
      voiceServiceRef.current.simulateWakeWordDetection();

      console.log("✅ Virtual wake word activated successfully");
    } catch (error) {
      console.error("❌ Error in handleEarbudTap:", error);
    }
  }, []); // Empty deps - voice service ref is stable

  // Store the handler in a ref for keyboard shortcut access
  handleEarbudTapRef.current = handleEarbudTap;

  // Register earbud tap listener as an alternative activation method
  // Works alongside the existing wake-word detection system
  // Earbud tap activates listening without requiring "Skymate" wake word
  // CRITICAL FIX: Pass handleEarbudTap directly (not through ref) to ensure it's available immediately
  useEarbudTapListener(
    isListening,
    handleEarbudTap, // Direct reference - always available from first render
    stopListening
  );

  // DEV: Keyboard shortcut for testing earbud tap logic (Ctrl+Space or Cmd+Space)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.log(
      "⌨️ Keyboard shortcut listener registered (Ctrl+Space or Cmd+Space)"
    );

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Space or Cmd+Space
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        console.log("⌨️ === KEYBOARD SHORTCUT TRIGGERED ===");
        console.log("⌨️ Calling handleEarbudTap()...");
        handleEarbudTap().catch((error) => {
          console.error("❌ Error in keyboard shortcut handler:", error);
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      console.log("⌨️ Keyboard shortcut listener removed");
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dev-only: Raw WebSocket smoke test
  // @ts-ignore - Kept for future debugging
  const handleSmokeTest = async () => {
    if (!import.meta.env.DEV) return;

    const apiKey = config.deepgram;
    if (!apiKey) {
      showError("Configuration Error", "No API key configured");
      return;
    }

    console.log("🧪 Running raw WebSocket smoke test...");
    try {
      await rawDGTest(apiKey);
      showSuccess(
        "Test Passed",
        "Raw WS test PASSED - browser/network/CSP is OK"
      );
    } catch (error: any) {
      console.error("❌ Raw WS test FAILED:", error);
      showError(
        "Test Failed",
        `Raw WS test FAILED: ${error.message}. Check browser console for details.`
      );
    }
  };

  // Dev-only: Show AI parsing performance stats
  const handleShowPerformanceStats = () => {
    if (!import.meta.env.DEV) return;

    const stats = getParsePerformanceStats();
    console.log("📊 AI Parsing Performance Stats:", stats);

    if ("message" in stats) {
      showInfo("Performance Stats", stats.message);
    } else {
      showInfo(
        "🚀 AI Parsing Performance",
        `Avg: ${stats.averageDuration} | Fast: ${stats.speedupRate} | Cache: ${stats.cacheHitRate} | Estimated speedup: ${stats.estimatedSpeedup}`
      );
    }
  };

  const handleCreateTask = async () => {
    if (!parsedIntent) return;

    // VALIDATION: Check if item is present (reject "unknown" or missing items)
    if (
      !parsedIntent.item ||
      parsedIntent.item === "unknown" ||
      parsedIntent.item.trim() === ""
    ) {
      console.warn("⚠️ Task rejected: No valid item detected");

      // Play audio feedback asking to repeat
      if (ttsServiceRef.current) {
        try {
          await ttsServiceRef.current.speak(
            "I couldn't hear that, please repeat",
            {
              rate: 1.0,
            }
          );
        } catch (error) {
          console.warn("⚠️ TTS failed:", error);
        }
      }

      // Reset state and restart listening
      setTranscript("");
      setParsedIntent(null);
      setIsListening(false);
      setIsMicReady(false);
      hasAutoCreatedRef.current = false;

      // UNLOCK SESSION: No valid item detected
      isProcessingSessionRef.current = false;
      sessionTypeRef.current = null;
      console.log(`🔓 Session unlocked (no valid item)`);

      // Restart continuous listening
      if (voiceServiceRef.current && wakeWordCallbackRef.current) {
        createTimeout(() => {
          if (voiceServiceRef.current && wakeWordCallbackRef.current) {
            voiceServiceRef.current.ensureContinuousListening(
              wakeWordCallbackRef.current,
              wakeWordOnlyCallbackRef.current || undefined
            );
          }
        }, 100);
      }

      return; // Exit without creating task
    }

    // TIMING: Mark task creation start
    timingRef.current.taskCreationStart = Date.now();

    try {
      // INVENTORY CHECK: Verify stock and reserve item before creating task
      if (parsedIntent.item) {
        const inventoryItemName = mapTaskItemToInventory(parsedIntent.item);

        if (inventoryItemName) {
          const stockCheck = await checkStock(inventoryItemName);

          if (!stockCheck.inStock) {
            // Play "no stock available" audio warning
            if (ttsServiceRef.current) {
              try {
                await ttsServiceRef.current.speak("No stock available", {
                  rate: 1.0,
                });
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            // Don't create the task
            showWarning(
              "Out of Stock",
              `${inventoryItemName} is not available`
            );

            // Reset state and restart listening
            setTranscript("");
            setParsedIntent(null);
            setIsListening(false);
            setIsMicReady(false);
            hasAutoCreatedRef.current = false;

            // UNLOCK SESSION: Out of stock
            isProcessingSessionRef.current = false;
            console.log(`🔓 Session unlocked (out of stock)`);

            // Restart continuous listening
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              createTimeout(() => {
                if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                  voiceServiceRef.current.ensureContinuousListening(
                    wakeWordCallbackRef.current,
                    wakeWordOnlyCallbackRef.current || undefined
                  );
                }
              }, 100);
            }

            return; // Exit without creating task
          }

          // Reserve the item - move to queue and reduce main inventory
          const reserved = await reserveItemForTask(
            inventoryItemName,
            parsedIntent.seat,
            1
          );

          if (!reserved) {
            console.error("❌ Failed to reserve item for task");

            // Play audio feedback
            if (ttsServiceRef.current) {
              try {
                await ttsServiceRef.current.speak(
                  "Unable to process request, please try again",
                  {
                    rate: 1.0,
                  }
                );
              } catch (error) {
                console.warn("⚠️ TTS failed:", error);
              }
            }

            showError(
              "Reservation Failed",
              `Could not reserve ${inventoryItemName}`
            );

            // Reset state and restart listening
            setTranscript("");
            setParsedIntent(null);
            setIsListening(false);
            setIsMicReady(false);
            hasAutoCreatedRef.current = false;

            // UNLOCK SESSION: Reservation failed
            isProcessingSessionRef.current = false;
            console.log(`🔓 Session unlocked (reservation failed)`);

            // Restart continuous listening (keeps wake word active)
            if (voiceServiceRef.current && wakeWordCallbackRef.current) {
              createTimeout(() => {
                if (voiceServiceRef.current && wakeWordCallbackRef.current) {
                  voiceServiceRef.current.ensureContinuousListening(
                    wakeWordCallbackRef.current,
                    wakeWordOnlyCallbackRef.current || undefined
                  );
                }
              }, 100);
            }

            return; // Exit without creating task
          }
        }
      }

      // Import ContextAnalyzer from voice service to extract multiple items
      const { VoiceService } = await import("../../lib/voice");

      // Extract multiple items from the transcript
      // Note: Transcript is already cleaned by voice service (duplicates removed, garbled text cleaned)
      // This handles requests like "4A wants chicken and water" → creates 2 items
      const items =
        (VoiceService as any).extractMultipleItemsFromText?.(transcript) || [];

      console.log(`🔍 Multi-item extraction: Found ${items.length} item(s)`, {
        transcript,
        items: items.map((i: any) => ({
          item: i.item,
          category: i.category,
          score: i.score,
        })),
      });

      // Show visual feedback for multi-item detection
      if (items.length > 1) {
        showInfo(
          "Multiple Items Detected",
          `Found ${items.length} items: ${items
            .map((i: any) => i.item)
            .join(", ")}`
        );
      }

      // If we detected multiple items, create separate tasks for each
      // Note: Due to task consolidation, these will be merged into one task automatically
      if (items.length > 1) {
        console.log(
          `✅ Multiple items detected (${items.length}) - Creating consolidated task:`,
          items.map((i: any) => i.item).join(" + ")
        );

        let tasksCreated = 0;
        let finalConsolidatedItems = "";

        // CRITICAL: Create tasks SEQUENTIALLY (not in parallel)
        // This allows the second task to find and merge with the first task
        for (const itemData of items) {
          try {
            console.log(
              `📝 Creating task ${tasksCreated + 1}/${items.length}: ${
                itemData.item
              }`
            );

            const result = await createTask({
              seat: parsedIntent.seat,
              request: `${parsedIntent.seat} wants ${itemData.item}`,
              type:
                itemData.category === "meals"
                  ? "meal"
                  : itemData.category === "beverages"
                  ? "beverage"
                  : itemData.category === "comfort"
                  ? "comfort"
                  : "assistance",
              item: itemData.item,
              ...(parsedIntent.specialRequirements &&
              parsedIntent.specialRequirements.length > 0
                ? { specialRequirements: parsedIntent.specialRequirements }
                : {}),
            });

            tasksCreated++;

            // Store consolidated items from each task (last one will have all items)
            if (result.consolidatedItems) {
              console.log(
                `📦 Task ${tasksCreated} (${itemData.item}): consolidated items = "${result.consolidatedItems}"`
              );
              finalConsolidatedItems = result.consolidatedItems;
            }

            console.log(
              `✅ Task ${tasksCreated}/${items.length} created for: ${itemData.item}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to create task for ${itemData.item}:`,
              error
            );
          }
        }

        // TIMING: Mark task creation complete (all tasks pushed to Firebase)
        timingRef.current.taskCreationEnd = Date.now();

        // Log timing breakdown
        const timing = timingRef.current;
        if (
          timing.voiceRecognitionEnd &&
          timing.aiParsingStart &&
          timing.aiParsingEnd &&
          timing.taskCreationStart &&
          timing.taskCreationEnd
        ) {
          const voiceRecognitionTime =
            timing.aiParsingStart - timing.voiceRecognitionEnd;
          const aiParsingTime = timing.aiParsingEnd - timing.aiParsingStart;
          const taskCreationTime =
            timing.taskCreationEnd - timing.taskCreationStart;
          const totalTime = timing.taskCreationEnd - timing.voiceRecognitionEnd;

          console.log("⏱️ TIMING BREAKDOWN:", {
            voiceRecognition: `${voiceRecognitionTime}ms`,
            aiParsing: `${aiParsingTime}ms`,
            taskCreation: `${taskCreationTime}ms`,
            total: `${totalTime}ms`,
            breakdown: {
              voiceRecognition: `${(
                (voiceRecognitionTime / totalTime) *
                100
              ).toFixed(1)}%`,
              aiParsing: `${((aiParsingTime / totalTime) * 100).toFixed(1)}%`,
              taskCreation: `${((taskCreationTime / totalTime) * 100).toFixed(
                1
              )}%`,
            },
          });

          // Show timing in UI
          showInfo(
            "⏱️ Response Time",
            `Total: ${totalTime}ms (Voice: ${voiceRecognitionTime}ms, AI: ${aiParsingTime}ms, Task: ${taskCreationTime}ms)`
          );
        }

        console.log(`🎉 ${tasksCreated} tasks created successfully!`);

        // REWARD LEARNING: Report successful task creation
        if (voiceServiceRef.current && tasksCreated > 0) {
          voiceServiceRef.current.reportTaskSuccess(transcript, {
            seat: parsedIntent.seat,
            item: items.map((i: any) => i.item).join(", "),
            action: parsedIntent.type,
          });
        }

        // AUDIO CONFIRMATION: Speak the consolidated order
        if (
          ttsServiceRef.current &&
          tasksCreated > 0 &&
          finalConsolidatedItems
        ) {
          try {
            console.log(
              `🔊 Multi-item confirmation: "${finalConsolidatedItems}"`
            );
            // Format items list naturally: "chicken, beef, and water"
            const itemsArray = finalConsolidatedItems.split(", ");
            const formattedItems =
              itemsArray.length === 2
                ? `${itemsArray[0]} and ${itemsArray[1]}`
                : itemsArray.length > 2
                ? `${itemsArray.slice(0, -1).join(", ")}, and ${
                    itemsArray[itemsArray.length - 1]
                  }`
                : itemsArray[0];

            const confirmationMessage = `${parsedIntent.seat} wanted ${formattedItems}`;
            console.log(`🔊 Speaking: "${confirmationMessage}"`);

            await ttsServiceRef.current.speak(confirmationMessage, {
              rate: 1.1,
              pitch: 1.0,
              volume: 1.0,
            });

            showSuccess(
              "Multiple Items Created",
              `Created task with ${tasksCreated} items for ${parsedIntent.seat}`
            );
          } catch (error) {
            console.warn("⚠️ Audio confirmation failed (non-critical):", error);
          }
        } else {
          showSuccess(
            "Multiple Items Created",
            `Created ${tasksCreated} items for ${parsedIntent.seat}`
          );
        }
      } else {
        // Single item - create one task (existing behavior)
        const result = await createTask({
          seat: parsedIntent.seat,
          request: transcript,
          type: parsedIntent.type,
          item: parsedIntent.item,
          ...(parsedIntent.specialRequirements &&
          parsedIntent.specialRequirements.length > 0
            ? { specialRequirements: parsedIntent.specialRequirements }
            : {}),
        });

        // TIMING: Mark task creation complete (task pushed to Firebase)
        timingRef.current.taskCreationEnd = Date.now();

        // Log timing breakdown
        const timing = timingRef.current;
        if (
          timing.voiceRecognitionEnd &&
          timing.aiParsingStart &&
          timing.aiParsingEnd &&
          timing.taskCreationStart &&
          timing.taskCreationEnd
        ) {
          const voiceRecognitionTime =
            timing.aiParsingStart - timing.voiceRecognitionEnd;
          const aiParsingTime = timing.aiParsingEnd - timing.aiParsingStart;
          const taskCreationTime =
            timing.taskCreationEnd - timing.taskCreationStart;
          const totalTime = timing.taskCreationEnd - timing.voiceRecognitionEnd;

          console.log("⏱️ TIMING BREAKDOWN:", {
            voiceRecognition: `${voiceRecognitionTime}ms`,
            aiParsing: `${aiParsingTime}ms`,
            taskCreation: `${taskCreationTime}ms`,
            total: `${totalTime}ms`,
            breakdown: {
              voiceRecognition: `${(
                (voiceRecognitionTime / totalTime) *
                100
              ).toFixed(1)}%`,
              aiParsing: `${((aiParsingTime / totalTime) * 100).toFixed(1)}%`,
              taskCreation: `${((taskCreationTime / totalTime) * 100).toFixed(
                1
              )}%`,
            },
          });

          // Show timing in UI
          showInfo(
            "⏱️ Response Time",
            `Total: ${totalTime}ms (Voice: ${voiceRecognitionTime}ms, AI: ${aiParsingTime}ms, Task: ${taskCreationTime}ms)`
          );
        }

        // REWARD LEARNING: Report successful task creation to VoiceService
        // This will reward the patterns that led to this successful task
        if (voiceServiceRef.current) {
          // Use transcript as identifier to find the session
          voiceServiceRef.current.reportTaskSuccess(transcript, {
            seat: parsedIntent.seat,
            item: parsedIntent.item,
            action: parsedIntent.type,
          });

          console.log("🎉 Task created successfully - patterns rewarded!");
        }

        // AUDIO CONFIRMATION: Speak the order confirmation (including consolidated items)
        if (ttsServiceRef.current && result.consolidatedItems) {
          try {
            console.log(
              `🔊 Received consolidated items from createTask: "${result.consolidatedItems}"`
            );
            // Format consolidated items naturally: "chicken, beef, and water"
            const items = result.consolidatedItems.split(", ");
            console.log(`🔊 Split into ${items.length} items:`, items);
            const formattedItems =
              items.length === 2
                ? `${items[0]} and ${items[1]}`
                : items.length > 2
                ? `${items.slice(0, -1).join(", ")}, and ${
                    items[items.length - 1]
                  }`
                : items[0];

            const confirmationMessage = `${parsedIntent.seat} wanted ${formattedItems}`;
            console.log(`🔊 Speaking confirmation: "${confirmationMessage}"`);

            await ttsServiceRef.current.speak(confirmationMessage, {
              rate: 1.1,
              pitch: 1.0,
              volume: 1.0,
            });
          } catch (error) {
            console.warn(
              "⚠️ Task creation audio confirmation failed (non-critical):",
              error
            );
          }
        }
      }

      // Clear form
      setTranscript("");
      setParsedIntent(null);
      setIsListening(false);
      setIsMicReady(false);
      hasAutoCreatedRef.current = false; // Reset auto-create flag

      // UNLOCK SESSION: Task created successfully
      isProcessingSessionRef.current = false;
      sessionTypeRef.current = null;
      console.log(`🔓 Session unlocked (task created)`);

      // Azure Speech Service will auto-restart via its internal mechanism
      // No manual restart needed - this prevents restart loops and conflicts

      // Show success notification (non-blocking)
      showSuccess("Task Created", "Task created! Ready for next request.");
    } catch (error: any) {
      console.error("Failed to create task:", error);
      showError(
        "Task Creation Failed",
        `Failed to create task: ${error.message || "Unknown error"}`
      );

      // Even on error, ensure continuous listening continues
      setIsListening(false);
      setIsMicReady(false);

      // UNLOCK SESSION: Task creation failed
      isProcessingSessionRef.current = false;
      sessionTypeRef.current = null;
      console.log(`🔓 Session unlocked (task creation error)`);

      // Azure Speech Service will auto-restart via its internal mechanism
      // No manual restart needed - this prevents restart loops and conflicts
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Start Flight Button */}
      <div className="w-full max-w-2xl mb-4">
        <button
          onClick={handleStartFlight}
          disabled={isFlightStarted || isInitializingFlight}
          className={`
            w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all
            ${
              isFlightStarted
                ? "bg-green-600 text-white cursor-default"
                : isInitializingFlight
                ? "bg-blue-400 text-white cursor-wait"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
            }
          `}
        >
          {isInitializingFlight ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Starting Flight...
            </span>
          ) : isFlightStarted ? (
            <span className="flex items-center justify-center gap-2">
              ✅ Flight Started
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🛫 Start Flight
            </span>
          )}
        </button>
        {isFlightStarted && (
          <p className="text-center text-white/80 text-sm mt-2">
            Flight tasks initialized from passenger manifest
          </p>
        )}
      </div>

      {/* Microphone Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isParsing}
        className={`
          relative w-32 h-32 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-2xl
          ${
            isListening
              ? "bg-red-500 animate-pulse"
              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105"
          }
          ${isParsing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isParsing ? (
          <Loader2 size={48} className="text-white animate-spin" />
        ) : (
          <Mic size={48} className="text-white" />
        )}
      </button>

      {/* Physical Button Alternative - Guaranteed 100% Reliability */}
      <button
        onClick={handleEarbudTap}
        disabled={isParsing}
        className={`
          px-6 py-3 rounded-lg font-semibold text-white
          transition-all duration-200 shadow-lg
          ${
            isListening
              ? "bg-green-600 animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
          }
          ${isParsing ? "opacity-50 cursor-not-allowed" : ""}
          flex items-center gap-2
        `}
        title="Tap to activate voice input (same as saying 'Skymate')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
        </svg>
        {isListening ? "Listening..." : "Tap to Activate"}
      </button>

      <p className="text-white text-sm">
        {isListening
          ? isMicReady
            ? "Processing request..."
            : "Initializing microphone..."
          : "Always listening... (say 'Skymate' to activate)"}
        {isParsing && " - Processing..."}
      </p>

      {/* Helpful instructions for button activation */}
      <p className="text-white/70 text-xs max-w-md text-center">
        💡 Three ways to activate: Say "Skymate", tap the button above, or use
        your earbud controls
      </p>

      {/* Voice Service Health Status - Development Only */}
      {import.meta.env.DEV && voiceServiceRef.current && (
        <div className="text-xs text-white/60 mt-2">
          Health:{" "}
          {voiceServiceRef.current.getHealthCheck?.()?.status || "unknown"} |
          API:{" "}
          {voiceServiceRef.current.getHealthCheck?.()?.useAzureSpeech
            ? "Azure Speech"
            : "Web Speech"}
        </div>
      )}

      {/* Performance Stats Button - Development Only */}
      {import.meta.env.DEV && (
        <button
          onClick={handleShowPerformanceStats}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          📊 Show AI Performance Stats
        </button>
      )}
    </div>
  );
}

export default VoiceInput;
