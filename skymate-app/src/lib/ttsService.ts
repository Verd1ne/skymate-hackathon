/**
 * Text-to-Speech Service - Production Grade (Azure Speech)
 *
 * Provides natural-sounding speech synthesis for task reminders and announcements
 * Uses Azure Cognitive Services Speech SDK for high-quality TTS
 */

import { config } from "./config";

/**
 * Text-to-Speech Service using Azure Speech SDK
 * Handles speech synthesis with production-grade features
 */
export class TTSService {
	private synthesizer: any = null; // Azure SpeechSynthesizer
	private sdk: any = null; // Azure Speech SDK
	private isInitialized = false;
	private isSpeaking = false;
	private audioConfig: any = null;
	private audioContext: AudioContext | null = null; // Web Audio API context
	private maxRetries = 2; // Maximum retry attempts for failed TTS
	private retryDelay = 1000; // Delay between retries in ms
	private synthesisTimeout = 30000; // 30 second timeout for synthesis
	private onSpeakingStartCallback: (() => void) | null = null; // Callback when TTS starts
	private onSpeakingStopCallback: (() => void) | null = null; // Callback when TTS stops

	constructor() {
		// Initialize will be called lazily when needed
	}

	/**
	 * Set callback for when TTS starts speaking
	 */
	onSpeakingStart(callback: () => void): void {
		this.onSpeakingStartCallback = callback;
	}

	/**
	 * Set callback for when TTS stops speaking
	 */
	onSpeakingStop(callback: () => void): void {
		this.onSpeakingStopCallback = callback;
	}

	/**
	 * Initialize Azure Speech SDK for TTS
	 */
	private async initialize(): Promise<void> {
		if (this.isInitialized && this.sdk) {
			return;
		}

		if (!config.azureSpeech?.key || !config.azureSpeech?.region) {
			throw new Error(
				"Azure Speech credentials not configured. Please set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION in your .env file."
			);
		}

		try {
			// Dynamic import to avoid bundle size issues
			const speechSdk = await import("microsoft-cognitiveservices-speech-sdk");
			this.sdk = speechSdk;

		// Create speech config with production settings
		const speechConfig = this.sdk.SpeechConfig.fromSubscription(
			config.azureSpeech.key,
			config.azureSpeech.region
		);

		// Set language for TTS
		speechConfig.speechSynthesisLanguage = "en-US";

		// PRODUCTION: Use high-quality neural voice (best quality)
		// Azure offers neural voices that sound very natural
		// en-US-JennyNeural is a high-quality female voice
		// en-US-GuyNeural is a high-quality male voice
		// You can change this to any available Azure neural voice
		speechConfig.speechSynthesisVoiceName = "en-US-ElizabethNeural";

		// CRITICAL: Set higher quality audio format for better mobile compatibility
		// Riff24Khz16BitMonoPcm provides better quality than default 16kHz
		// This prevents static/distorted audio on mobile devices
		speechConfig.speechSynthesisOutputFormat = this.sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;

			// PRODUCTION: For browser, don't use audio config - we'll get audio from result
			// fromDefaultSpeakerOutput() doesn't work in browsers
			// Pass null to get audio data in the result object instead
			this.audioConfig = null;

			// Create synthesizer without audio config (we'll get audio from result)
			this.synthesizer = new this.sdk.SpeechSynthesizer(speechConfig, null);

			if (!this.synthesizer) {
				throw new Error("Failed to create Azure Speech synthesizer");
			}

			this.isInitialized = true;
			console.log("✅ Azure TTS initialized successfully");
		} catch (error: any) {
			console.error("❌ Failed to initialize Azure TTS:", error);
			throw new Error(
				`Failed to initialize Azure TTS: ${error.message || "Unknown error"}`
			);
		}
	}

	/**
	 * Play a simple beep sound as wake word confirmation
	 * Fast, reliable alternative to TTS that doesn't require Azure Speech
	 */
	async playBeepConfirmation(): Promise<void> {
		try {
			// Ensure AudioContext is ready
			if (!this.audioContext) {
				this.audioContext = new (window.AudioContext ||
					(window as any).webkitAudioContext)();
				console.log(
					"🎵 AudioContext created, initial state:",
					this.audioContext.state
				);
			}

			// Resume if suspended (required by browser autoplay policy)
			const currentState = this.audioContext.state;
			if (currentState === "suspended" || currentState === "interrupted") {
				try {
					console.log(
						"🔄 Attempting to resume AudioContext (state:",
						currentState,
						")"
					);
					await this.audioContext.resume();
					// Verify it actually resumed
					const newState = this.audioContext.state;
					if (newState !== "running") {
						console.warn(
							"⚠️ AudioContext resume attempted but state is still:",
							newState
						);
						// If resume failed, we can't play audio - return early
						return;
					}
					console.log("✅ AudioContext resumed successfully");
				} catch (resumeError: any) {
					// Chrome autoplay policy: resume() can only be called in response to user gesture
					// If called during voice detection (not a user gesture), it will fail
					console.warn(
						"⚠️ AudioContext resume failed (autoplay policy - requires user gesture):",
						resumeError.message || resumeError
					);
					console.log("💡 Audio will work after you click/touch the page once");
					// Can't play audio without user gesture - return early
					return;
				}
			}

			// Verify AudioContext is running before creating audio nodes
			const finalState = this.audioContext.state;
			if (finalState !== "running") {
				console.warn(
					"⚠️ AudioContext not running, cannot play beep. State:",
					finalState
				);
				return;
			}

			// Create a pleasant two-tone beep (like a notification)
			const oscillator1 = this.audioContext.createOscillator();
			const oscillator2 = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();

			oscillator1.connect(gainNode);
			oscillator2.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			// First tone: 800Hz (higher pitch)
			oscillator1.frequency.value = 800;
			oscillator1.type = "sine";

			// Second tone: 600Hz (lower pitch) - creates a pleasant "ding-dong" effect
			oscillator2.frequency.value = 600;
			oscillator2.type = "sine";

			// Volume envelope - start at 0.3, fade out
			const now = this.audioContext.currentTime;
			gainNode.gain.setValueAtTime(0, now);
			gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02); // Quick attack
			gainNode.gain.setValueAtTime(0.3, now + 0.1); // Hold
			gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25); // Fade out

			// Play first tone immediately
			oscillator1.start(now);
			oscillator1.stop(now + 0.15);

			// Play second tone slightly after (creates "ding-dong" effect)
			oscillator2.start(now + 0.08);
			oscillator2.stop(now + 0.25);

			console.log("🔔 Beep confirmation played");
		} catch (error) {
			console.warn("⚠️ Beep confirmation failed (non-critical):", error);
			// Non-critical - don't block voice recognition if beep fails
		}
	}

	/**
	 * Quick confirmation sound for wake word detection
	 * Plays a beep sound to acknowledge the system is listening
	 */
	async playWakeWordConfirmation(): Promise<void> {
		try {
			// Play beep sound (fast, reliable, no TTS needed)
			await this.playBeepConfirmation();
		} catch (error) {
			console.warn("⚠️ Wake word confirmation error (non-critical):", error);
			// Non-critical - don't block voice recognition if audio fails
		}
	}

	/**
	 * Play task creation success confirmation
	 * Plays a quick beep sound like something shutting off
	 */
	async playTaskCreatedConfirmation(): Promise<void> {
		try {
			// Initialize AudioContext if not already done
			if (!this.audioContext) {
				this.audioContext = new (window.AudioContext ||
					(window as any).webkitAudioContext)();
			}

			const audioContext = this.audioContext;

			// Resume AudioContext if suspended (required by Chrome autoplay policy)
			if (audioContext.state === "suspended") {
				await audioContext.resume();
			}

			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			// Beep sound like something shutting off quickly
			// Start at medium frequency and quickly fade out
			oscillator.frequency.value = 650; // Medium frequency
			oscillator.type = "sine";

			const now = audioContext.currentTime;
			// Start at moderate volume and quickly fade out
			gainNode.gain.setValueAtTime(0.4, now);
			gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Quick fade out

			oscillator.start(now);
			oscillator.stop(now + 0.15); // Short duration - quick shut off sound

			console.log("✅ Task creation confirmation beep played");
		} catch (error) {
			console.warn(
				"⚠️ Task creation confirmation error (non-critical):",
				error
			);
			// Non-critical - don't block if audio fails
		}
	}

	/**
	 * Resume AudioContext on user interaction (call this on click, touch, keypress, etc.)
	 * This should be called when the user first interacts with the page
	 *
	 * IMPORTANT: Per Chrome autoplay policy - if AudioContext is created BEFORE a user gesture,
	 * it will be in "suspended" state and requires resume() to be called AFTER the user gesture.
	 * If created DURING a user gesture, it will start in "running" state.
	 */
	async resumeAudioContextOnUserInteraction(): Promise<void> {
		try {
			// Initialize Web Audio API context if needed
			// NOTE: If this is the first time creating it during a user gesture, it will start in "running" state
			// If it was created before a user gesture, it will be in "suspended" state and need resume()
			if (!this.audioContext) {
				this.audioContext = new (window.AudioContext ||
					(window as any).webkitAudioContext)();
				console.log(
					"🎵 AudioContext created, initial state:",
					this.audioContext.state
				);
			}

			// Resume AudioContext if suspended (this must be called in a user gesture context)
			if (
				this.audioContext.state === "suspended" ||
				this.audioContext.state === "interrupted"
			) {
				await this.audioContext.resume();
				console.log("✅ AudioContext resumed, state:", this.audioContext.state);
			} else {
				console.log(
					"✅ AudioContext already running, state:",
					this.audioContext.state
				);
			}
		} catch (error: any) {
			// This can fail if not called during a user gesture
			// Log as debug since it's expected in some cases
			console.debug(
				"⚠️ AudioContext operation failed (may need user interaction):",
				error.message || error
			);
			// Re-throw so caller knows it failed
			throw error;
		}
	}

	/**
	 * Ensure AudioContext is created and resumed (required for browser autoplay policy)
	 * This method tries to resume, but handles failures gracefully since callbacks
	 * might not be in a user gesture context
	 */
	private async ensureAudioContextReady(): Promise<void> {
		// Initialize Web Audio API context if needed
		if (!this.audioContext) {
			this.audioContext = new (window.AudioContext ||
				(window as any).webkitAudioContext)();
		}

		// CRITICAL: Resume AudioContext if suspended (required for browser autoplay policy)
		// Note: This might fail if not in a user gesture context, so we handle it gracefully
		if (
			this.audioContext.state === "suspended" ||
			this.audioContext.state === "interrupted"
		) {
			console.log(
				"🔄 Attempting to resume AudioContext, current state:",
				this.audioContext.state
			);

			try {
				await this.audioContext.resume();
				console.log("✅ AudioContext resumed, state:", this.audioContext.state);

				// ANTI-JITTER FIX #1: Wait for context to fully stabilize
				// Some browsers need a moment after resume() to become fully ready
				// This prevents audio glitches from starting playback too early
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Double-check state after resume
				if (
					this.audioContext.state === "suspended" ||
					this.audioContext.state === "interrupted"
				) {
					console.warn(
						"⚠️ AudioContext not running after resume, state:",
						this.audioContext.state
					);
					// Try one more time with longer wait
					try {
						await this.audioContext.resume();
						await new Promise((resolve) => setTimeout(resolve, 100));
						console.log(
							"✅ AudioContext resumed on retry, state:",
							this.audioContext.state
						);
					} catch (retryError) {
						console.warn(
							"⚠️ Failed to resume AudioContext on retry:",
							retryError
						);
						// Don't throw - this is non-critical for wake word confirmation
					}
				}
			} catch (error) {
				// Handle gracefully - don't throw error for wake word confirmation
				// The AudioContext might not be resumable in this context
				console.warn(
					"⚠️ Failed to resume AudioContext (may need user interaction):",
					error
				);
				console.warn(
					"💡 TIP: Audio will work after clicking, tapping, or pressing a key on the page."
				);
				// Don't throw - allow the code to continue
				// The audio might still work if the context was already resumed earlier
			}
		} else {
			console.log(
				"✅ AudioContext already running, state:",
				this.audioContext.state
			);
		}
	}

	/**
	 * Speak text with production-grade settings and automatic retry
	 */
	async speak(
		text: string,
		options?: {
			rate?: number; // Speech rate (not directly supported, but we can use SSML)
			pitch?: number; // Pitch (not directly supported, but we can use SSML)
			volume?: number; // Volume (not directly supported, but we can use SSML)
			onEnd?: () => void;
			onError?: (error: Error) => void;
		}
	): Promise<void> {
		// Try with retry logic for transient network errors
		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				await this.speakInternal(text, options);
				return; // Success, exit retry loop
			} catch (error: any) {
				const isLastAttempt = attempt === this.maxRetries;
				const isRetryableError = this.isRetryableError(error);
				
				if (isLastAttempt || !isRetryableError) {
					// Final attempt failed or non-retryable error, throw
					console.error(`❌ TTS failed after ${attempt + 1} attempt(s):`, error);
					throw error;
				}
				
				// Log retry attempt
				console.warn(
					`⚠️ TTS attempt ${attempt + 1} failed, retrying in ${this.retryDelay}ms...`,
					error.message
				);
				
				// Reinitialize synthesizer before retry (connection may be stale)
				await this.reinitializeSynthesizer();
				
				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, this.retryDelay));
			}
		}
	}

	/**
	 * Check if an error is retryable (network/connection issues)
	 */
	private isRetryableError(error: any): boolean {
		const errorMessage = error?.message?.toLowerCase() || '';
		const errorDetails = error?.toString().toLowerCase() || '';
		
		// WebSocket 1006 errors are typically transient network issues
		const isWebSocketError = errorDetails.includes('1006') || 
								errorDetails.includes('unable to contact server');
		
		// Connection timeouts and network errors
		const isNetworkError = errorMessage.includes('network') || 
							   errorMessage.includes('timeout') ||
							   errorMessage.includes('connection');
		
		return isWebSocketError || isNetworkError;
	}

	/**
	 * Reinitialize the synthesizer (useful for recovering from connection errors)
	 */
	private async reinitializeSynthesizer(): Promise<void> {
		try {
			console.log('🔄 Reinitializing TTS synthesizer...');
			
			// Close existing synthesizer
			if (this.synthesizer) {
				try {
					this.synthesizer.close();
				} catch (e) {
					// Ignore close errors
				}
				this.synthesizer = null;
			}
			
			// Recreate synthesizer with existing SDK
			if (this.sdk && config.azureSpeech?.key && config.azureSpeech?.region) {
				const speechConfig = this.sdk.SpeechConfig.fromSubscription(
					config.azureSpeech.key,
					config.azureSpeech.region
				);
				speechConfig.speechSynthesisLanguage = "en-US";
				speechConfig.speechSynthesisVoiceName = "en-US-ElizabethNeural";
				
				// Use 24kHz format for better mobile compatibility
				speechConfig.speechSynthesisOutputFormat = this.sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
				
				this.synthesizer = new this.sdk.SpeechSynthesizer(speechConfig, null);
				console.log('✅ TTS synthesizer reinitialized');
			}
		} catch (error) {
			console.error('❌ Failed to reinitialize synthesizer:', error);
			throw error;
		}
	}

	/**
	 * Internal speak method (without retry logic)
	 */
	private async speakInternal(
		text: string,
		options?: {
			rate?: number;
			pitch?: number;
			volume?: number;
			onEnd?: () => void;
			onError?: (error: Error) => void;
		}
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		if (!this.synthesizer) {
			const error = new Error("Speech synthesizer not initialized");
			if (options?.onError) {
				options.onError(error);
			}
			throw error;
		}

		// Stop any current speech
		this.stop();

		// CRITICAL: Ensure AudioContext is ready before starting synthesis
		// This must be done before we start synthesis to avoid autoplay policy issues
		// Note: This method handles failures gracefully and doesn't throw
		await this.ensureAudioContextReady();

		// Add timeout to prevent hanging on network issues
		return new Promise((resolve, reject) => {
			let timeoutId: NodeJS.Timeout | null = null;
			let isResolved = false;
			
			// Set up timeout
			timeoutId = setTimeout(() => {
			if (!isResolved) {
				isResolved = true;
				this.isSpeaking = false;
				if (this.onSpeakingStopCallback) {
					this.onSpeakingStopCallback();
				}
				const error = new Error(`TTS synthesis timeout after ${this.synthesisTimeout}ms`);
				console.error("❌ TTS Timeout:", error);
					if (options?.onError) {
						options.onError(error);
					}
					reject(error);
				}
			}, this.synthesisTimeout);
			
			// Wrapper functions that clear timeout on completion
			const wrappedResolve = () => {
				if (!isResolved && timeoutId) {
					isResolved = true;
					clearTimeout(timeoutId);
					resolve();
				}
			};
			
			const wrappedReject = (error: Error) => {
				if (!isResolved && timeoutId) {
					isResolved = true;
					clearTimeout(timeoutId);
					reject(error);
				}
			};
			
			try {
				// PRODUCTION: Use SSML for advanced control (rate, pitch, volume)
				// SSML allows fine-grained control over speech synthesis
				// For simple text, we can also use speakTextAsync which is simpler
				const useSSML =
					(options?.rate !== undefined && options.rate !== 1.0) ||
					(options?.pitch !== undefined && options.pitch !== 1.0) ||
					(options?.volume !== undefined && options.volume !== 1.0);

				if (useSSML) {
					// Use SSML for custom settings
					const ssml = this.buildSSML(text, options);

					// Speak using Azure Speech SDK with SSML
					this.synthesizer.speakSsmlAsync(
						ssml,
						(result: any) => {
							this.handleSynthesisResult(result, options, wrappedResolve, wrappedReject);
						},
						(error: any) => {
							this.handleSynthesisError(error, options, wrappedReject);
						}
					);
				} else {
					// Use simple text synthesis for default settings (more reliable)
					this.synthesizer.speakTextAsync(
						text,
						(result: any) => {
							this.handleSynthesisResult(result, options, wrappedResolve, wrappedReject);
						},
						(error: any) => {
							this.handleSynthesisError(error, options, wrappedReject);
						}
					);
				}

				this.isSpeaking = true;
				if (this.onSpeakingStartCallback) {
					this.onSpeakingStartCallback();
				}
				console.log(
					`🔊 Speaking: "${text.substring(0, 50)}${
						text.length > 50 ? "..." : ""
					}"`
				);
			} catch (error: any) {
				this.isSpeaking = false;
				if (this.onSpeakingStopCallback) {
					this.onSpeakingStopCallback();
				}
				const err = error instanceof Error ? error : new Error(String(error));
				if (options?.onError) {
					options.onError(err);
				}
				wrappedReject(err);
			}
		});
	}

	/**
	 * Handle synthesis result
	 */
	private async handleSynthesisResult(
		result: any,
		options:
			| { onEnd?: () => void; onError?: (error: Error) => void }
			| undefined,
		resolve: () => void,
		reject: (error: Error) => void
	): Promise<void> {
		if (result.reason === this.sdk.ResultReason.SynthesizingAudioCompleted) {
			// Play audio from result
		await this.playAudioFromResult(result);

		this.isSpeaking = false;
		if (this.onSpeakingStopCallback) {
			this.onSpeakingStopCallback();
		}
		console.log("✅ TTS completed successfully");
		if (options?.onEnd) {
				options.onEnd();
			}
			resolve();
	} else if (result.reason === this.sdk.ResultReason.Canceled) {
		const cancellation = this.sdk.CancellationDetails.fromResult(result);
		this.isSpeaking = false;
		if (this.onSpeakingStopCallback) {
			this.onSpeakingStopCallback();
		}
			
			// Enhanced error logging for WebSocket issues
			const errorCode = cancellation.ErrorCode || 'Unknown';
			const errorDetails = cancellation.errorDetails || 'No details';
			
			console.error("❌ TTS Canceled:", {
				reason: cancellation.reason,
				errorCode,
				errorDetails,
				resultReason: result.reason
			});
			
			// Provide helpful hints for common errors
			if (errorDetails.includes('1006') || errorDetails.includes('Unable to contact server')) {
				console.warn('💡 WebSocket connection failed (1006). This may be due to:');
				console.warn('   - Network connectivity issues');
				console.warn('   - Invalid or expired Azure credentials');
				console.warn('   - Firewall blocking WebSocket connections');
				console.warn('   - Azure service temporary unavailability');
			}
			
			const error = new Error(
				`TTS canceled: ${cancellation.reason} - ${errorDetails} (Code: ${errorCode})`
			);
			
			if (options?.onError) {
				options.onError(error);
			}
		reject(error);
	} else {
		this.isSpeaking = false;
		if (this.onSpeakingStopCallback) {
			this.onSpeakingStopCallback();
		}
		const error = new Error(`TTS failed: ${result.reason}`);
		console.error("❌ TTS Error:", error);
			if (options?.onError) {
				options.onError(error);
			}
			reject(error);
		}
	}

	/**
	 * Handle synthesis error
	 */
	private handleSynthesisError(
		error: any,
		options: { onError?: (error: Error) => void } | undefined,
	reject: (error: Error) => void
): void {
	this.isSpeaking = false;
	if (this.onSpeakingStopCallback) {
		this.onSpeakingStopCallback();
	}
	const err = error instanceof Error ? error : new Error(String(error));
	console.error("❌ TTS Error:", err);
		if (options?.onError) {
			options.onError(err);
		}
		reject(err);
	}

	/**
	 * Play audio from Azure Speech SDK result using Web Audio API
	 */
	private async playAudioFromResult(result: any): Promise<void> {
		if (!result.audioData) {
			console.warn("⚠️ No audio data in result");
			return;
		}

		// CRITICAL: Ensure AudioContext is ready before playing audio
		// This must be done before trying to decode/play audio
		try {
			await this.ensureAudioContextReady();
		} catch (error) {
			console.error("❌ Failed to ensure AudioContext is ready:", error);
			return;
		}

		// At this point, AudioContext should be ready and not null
		if (!this.audioContext) {
			console.error("❌ AudioContext is null after ensuring it is ready");
			return;
		}

		try {
			// Get audio data as ArrayBuffer from result
			// Azure TTS returns audioData as ArrayBuffer
			const audioData = result.audioData;

			let audioBuffer: AudioBuffer;
			
			try {
				// IMPORTANT: Since we're using Riff24Khz16BitMonoPcm format,
				// Azure returns RIFF/WAV format (not raw PCM), so we can decode directly
				// No need to add WAV header - it's already there!
				audioBuffer = await this.audioContext.decodeAudioData(audioData);
			} catch (decodeError) {
				// Fallback: If direct decode fails, try converting PCM to WAV
				// (This shouldn't happen with Riff format, but kept as safety net)
				console.warn("⚠️ Direct audio decode failed, trying PCM conversion fallback:", decodeError);
				const wavBuffer = this.pcmToWav(audioData, 24000); // Use 24kHz for the configured format
				audioBuffer = await this.audioContext.decodeAudioData(wavBuffer);
			}

			// ANTI-JITTER FIX #2: Ensure audio context is fully stable before scheduling
			// If context just resumed, wait a moment to prevent glitches
			if (this.audioContext.state !== "running") {
				console.warn("⚠️ AudioContext not running before playback, attempting to stabilize");
				await this.audioContext.resume();
				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// ANTI-STUTTER FIX: Create gain node for smooth fade-in/fade-out
			// This eliminates clicks and stutters at beginning and end of audio
			const gainNode = this.audioContext.createGain();
			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;
			
			// Connect source → gain → destination
			source.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			// ANTI-JITTER FIX #3: Schedule playback slightly in the future
			// This gives the audio system time to prepare buffers and prevents underruns
			// Using currentTime + small offset ensures smooth start
			const now = this.audioContext.currentTime;
			const startTime = now + 0.05; // Start 50ms in future for buffer preparation
			const duration = audioBuffer.duration;
			
			// FADE-IN: Quick ramp from 0 to 1 over 10ms (starting at scheduled time)
			// Eliminates click/pop at beginning
			gainNode.gain.setValueAtTime(0, startTime);
			gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
			
			// FADE-OUT: Quick ramp from 1 to 0 over last 20ms
			// Eliminates click/pop at end
			const fadeOutStart = startTime + duration - 0.02;
			const fadeOutEnd = startTime + duration;
			gainNode.gain.setValueAtTime(1, fadeOutStart);
			gainNode.gain.linearRampToValueAtTime(0, fadeOutEnd);

			// Start playback at scheduled time (not immediately)
			source.start(startTime);

			console.log(`🔊 Audio playback scheduled with smooth fades (${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s, starting in 50ms)`);
		} catch (error) {
			console.error("❌ Error playing audio:", error);
		}
	}

	/**
	 * Convert PCM audio data to WAV format for browser playback
	 * @param pcmData Raw PCM audio data
	 * @param sampleRate Sample rate in Hz (e.g., 16000, 24000, 48000)
	 */
	private pcmToWav(pcmData: ArrayBuffer, sampleRate: number = 24000): ArrayBuffer {
		const numChannels = 1; // Mono
		const bitsPerSample = 16;
		const blockAlign = numChannels * (bitsPerSample / 8);
		const byteRate = sampleRate * blockAlign;
		const dataSize = pcmData.byteLength;
		const fileSize = 36 + dataSize;

		// Create WAV header
		const buffer = new ArrayBuffer(44 + dataSize);
		const view = new DataView(buffer);

		// RIFF header
		this.writeString(view, 0, "RIFF");
		view.setUint32(4, fileSize, true);
		this.writeString(view, 8, "WAVE");

		// fmt chunk
		this.writeString(view, 12, "fmt ");
		view.setUint32(16, 16, true); // fmt chunk size
		view.setUint16(20, 1, true); // audio format (PCM)
		view.setUint16(22, numChannels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, bitsPerSample, true);

		// data chunk
		this.writeString(view, 36, "data");
		view.setUint32(40, dataSize, true);

		// Copy PCM data
		const pcmView = new Uint8Array(pcmData);
		const wavView = new Uint8Array(buffer);
		wavView.set(pcmView, 44);

		return buffer;
	}

	/**
	 * Helper to write string to DataView
	 */
	private writeString(view: DataView, offset: number, string: string): void {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}

	/**
	 * Build SSML (Speech Synthesis Markup Language) for advanced TTS control
	 * SSML allows fine-grained control over speech rate, pitch, volume, etc.
	 */
	private buildSSML(
		text: string,
		options?: {
			rate?: number;
			pitch?: number;
			volume?: number;
		}
	): string {
		// Normalize options
		const rate = options?.rate ?? 1.0; // 0.5 to 2.0 (1.0 = normal)
		const pitch = options?.pitch ?? 1.0; // -50% to +50% (0% = normal)
		const volume = options?.volume ?? 1.0; // 0.0 to 1.0 (1.0 = full)

		// Convert rate to SSML format (relative values: x-slow, slow, medium, fast, x-fast, or percentage)
		// For Azure, use percentage: -50% to +50% or relative values
		let rateValue = "medium";
		if (rate < 0.8) rateValue = "x-slow";
		else if (rate < 0.9) rateValue = "slow";
		else if (rate > 1.2) rateValue = "x-fast";
		else if (rate > 1.1) rateValue = "fast";
		else rateValue = "medium";

		// Convert pitch to SSML format (relative values or percentage)
		// Azure supports: x-low, low, medium, high, x-high, or percentage
		let pitchValue = "medium";
		if (pitch < 0.8) pitchValue = "x-low";
		else if (pitch < 0.9) pitchValue = "low";
		else if (pitch > 1.2) pitchValue = "x-high";
		else if (pitch > 1.1) pitchValue = "high";
		else pitchValue = "medium";

		// Convert volume to SSML format (silent, x-soft, soft, medium, loud, x-loud, or percentage)
		let volumeValue = "medium";
		if (volume < 0.2) volumeValue = "silent";
		else if (volume < 0.4) volumeValue = "x-soft";
		else if (volume < 0.6) volumeValue = "soft";
		else if (volume > 0.9) volumeValue = "x-loud";
		else if (volume > 0.7) volumeValue = "loud";
		else volumeValue = "medium";

		// Escape XML special characters in text
		const escapedText = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");

		// Build SSML with proper format for Azure
		// Use simple format without prosody if defaults are used
		if (rate === 1.0 && pitch === 1.0 && volume === 1.0) {
			// Simple SSML without prosody for default settings
			const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
	<voice name="en-US-ElizabethNeural">
		${escapedText}
	</voice>
</speak>`;
			return ssml;
		}

		// Build SSML with prosody for custom settings
		const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
	<voice name="en-US-ElizabethNeural">
		<prosody rate="${rateValue}" pitch="${pitchValue}" volume="${volumeValue}">
			${escapedText}
		</prosody>
	</voice>
</speak>`;

		return ssml;
	}

	/**
	 * Stop current speech
	 */
	stop(): void {
		if (this.synthesizer && this.isSpeaking) {
			try {
				// Check if stopSpeakingAsync method exists (Azure Speech SDK)
				if (typeof this.synthesizer.stopSpeakingAsync === "function") {
				this.synthesizer.stopSpeakingAsync(
					() => {
						this.isSpeaking = false;
						if (this.onSpeakingStopCallback) {
							this.onSpeakingStopCallback();
						}
						console.log("🛑 TTS stopped");
					},
					(error: any) => {
						console.warn("⚠️ Error stopping TTS:", error);
						this.isSpeaking = false;
						if (this.onSpeakingStopCallback) {
							this.onSpeakingStopCallback();
						}
					}
				);
			} else {
				// Fallback: just reset the flag
				this.isSpeaking = false;
				if (this.onSpeakingStopCallback) {
					this.onSpeakingStopCallback();
				}
				console.log("🛑 TTS stopped (no stopSpeakingAsync method)");
			}
		} catch (error: any) {
			console.warn("⚠️ Error stopping TTS:", error);
			this.isSpeaking = false;
			if (this.onSpeakingStopCallback) {
				this.onSpeakingStopCallback();
			}
			}
		}
	}

	/**
	 * Check if currently speaking
	 */
	isCurrentlySpeaking(): boolean {
		return this.isSpeaking;
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		this.stop();
		if (this.synthesizer) {
			try {
				this.synthesizer.close();
			} catch (error) {
				console.warn("⚠️ Error disposing synthesizer:", error);
			}
			this.synthesizer = null;
		}
		if (this.audioConfig) {
			try {
				this.audioConfig.close();
			} catch (error) {
				console.warn("⚠️ Error disposing audio config:", error);
			}
			this.audioConfig = null;
		}
		this.isInitialized = false;
	}
}
