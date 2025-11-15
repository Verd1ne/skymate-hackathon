/**
 * Frame Buffer Service
 *
 * Manages continuous frame capture from video stream
 * Maintains a rolling buffer of frames with timestamps
 */

import { captureVideoFrame } from "./motionDetector";
import { MOTION_CONFIG, getFrameInterval } from "./motionConfig";

export interface CapturedFrame {
	imageData: ImageData;
	timestamp: number;
	index: number;
}

export class FrameBuffer {
	private video: HTMLVideoElement;
	private canvas: HTMLCanvasElement;
	private buffer: CapturedFrame[] = [];
	private captureIntervalId: number | null = null;
	private isCapturing: boolean = false;
	private frameIndex: number = 0;
	private maxBufferSize: number;

	constructor(
		video: HTMLVideoElement,
		canvas: HTMLCanvasElement,
		maxBufferSize?: number
	) {
		this.video = video;
		this.canvas = canvas;
		this.maxBufferSize = maxBufferSize ?? MOTION_CONFIG.maxFrameBufferSize;
	}

	/**
	 * Start continuous frame capture
	 */
	startBuffering(): void {
		if (this.isCapturing) {
			console.warn("Frame buffer already capturing");
			return;
		}

		console.log(`📹 Starting frame buffer (${MOTION_CONFIG.frameRate} FPS)`);
		this.isCapturing = true;
		this.frameIndex = 0;

		const interval = getFrameInterval();

		this.captureIntervalId = window.setInterval(() => {
			this.captureFrame();
		}, interval);
	}

	/**
	 * Capture a single frame and add to buffer
	 */
	private captureFrame(): void {
		const imageData = captureVideoFrame(this.video, this.canvas);
		if (!imageData) {
			console.warn("Failed to capture frame");
			return;
		}

		const frame: CapturedFrame = {
			imageData,
			timestamp: Date.now(),
			index: this.frameIndex++,
		};

		this.buffer.push(frame);

		// Maintain max buffer size (rolling buffer)
		if (this.buffer.length > this.maxBufferSize) {
			this.buffer.shift(); // Remove oldest frame
		}
	}

	/**
	 * Stop frame capture
	 */
	stopBuffering(): void {
		if (this.captureIntervalId !== null) {
			clearInterval(this.captureIntervalId);
			this.captureIntervalId = null;
		}
		this.isCapturing = false;
		console.log("⏹️ Frame buffer stopped");
	}

	/**
	 * Get frames from a specific duration (e.g., last 5 seconds)
	 * @param durationSeconds - Duration in seconds
	 * @returns Array of frames from the last N seconds
	 */
	getFrameSequence(durationSeconds: number): CapturedFrame[] {
		const now = Date.now();
		const cutoffTime = now - durationSeconds * 1000;

		return this.buffer.filter((frame) => frame.timestamp >= cutoffTime);
	}

	/**
	 * Get all frames currently in buffer
	 */
	getAllFrames(): CapturedFrame[] {
		return [...this.buffer];
	}

	/**
	 * Get the last N frames
	 */
	getLastNFrames(count: number): CapturedFrame[] {
		return this.buffer.slice(-count);
	}

	/**
	 * Get buffer size (number of frames currently stored)
	 */
	getBufferSize(): number {
		return this.buffer.length;
	}

	/**
	 * Clear all frames from buffer
	 */
	clearBuffer(): void {
		this.buffer = [];
		this.frameIndex = 0;
		console.log("🗑️ Frame buffer cleared");
	}

	/**
	 * Check if currently capturing
	 */
	isActive(): boolean {
		return this.isCapturing;
	}

	/**
	 * Get buffer statistics
	 */
	getStats(): {
		frameCount: number;
		oldestTimestamp: number | null;
		newestTimestamp: number | null;
		durationSeconds: number;
	} {
		const frameCount = this.buffer.length;
		const oldestTimestamp = frameCount > 0 ? this.buffer[0].timestamp : null;
		const newestTimestamp =
			frameCount > 0 ? this.buffer[frameCount - 1].timestamp : null;
		const durationSeconds =
			oldestTimestamp && newestTimestamp
				? (newestTimestamp - oldestTimestamp) / 1000
				: 0;

		return {
			frameCount,
			oldestTimestamp,
			newestTimestamp,
			durationSeconds,
		};
	}
}

/**
 * Recording Session Manager
 * Manages a recording session that stops after motion ceases
 */
export class RecordingSession {
	private frameBuffer: FrameBuffer;
	private recordingFrames: CapturedFrame[] = [];
	private startTime: number = 0;
	private isRecording: boolean = false;
	private recordingTimer: number | null = null;
	private maxDurationTimer: number | null = null;
	private onMotionCallback: ((hasMotion: boolean) => void) | null = null;
	private lastMotionTime: number = 0;
	private noMotionStopDelay: number = 500; // milliseconds
	private resolveRecording: ((frames: CapturedFrame[]) => void) | null = null; // Store resolve callback

	constructor(frameBuffer: FrameBuffer) {
		this.frameBuffer = frameBuffer;
	}

	/**
	 * Start recording session with motion-based stopping
	 * @param maxDurationSeconds - Maximum duration before force-stopping
	 * @param noMotionDelaySeconds - Seconds of no motion before stopping
	 * @param onMotionUpdate - Callback for motion updates during recording
	 * @returns Promise that resolves when recording is complete
	 */
	startRecording(
		maxDurationSeconds: number,
		noMotionDelaySeconds: number = 0.5,
		onMotionUpdate?: (hasMotion: boolean) => void
	): Promise<CapturedFrame[]> {
		return new Promise((resolve) => {
			if (this.isRecording) {
				console.warn("Recording already in progress");
				resolve(this.recordingFrames);
				return;
			}

			console.log(
				`🔴 Starting motion-based recording (max: ${maxDurationSeconds}s, stop after ${noMotionDelaySeconds}s no motion)`
			);
			this.isRecording = true;
			this.startTime = Date.now();
			this.lastMotionTime = Date.now();
			this.recordingFrames = [];
			this.noMotionStopDelay = noMotionDelaySeconds * 1000;
			this.onMotionCallback = onMotionUpdate || null;
			this.resolveRecording = resolve; // Store resolve callback

			// Ensure frame buffer is running
			if (!this.frameBuffer.isActive()) {
				this.frameBuffer.startBuffering();
			}

			// Set maximum duration timer (safety fallback)
			this.maxDurationTimer = window.setTimeout(() => {
				console.log("⏱️ Maximum recording duration reached, stopping...");
				this.finishRecording();
			}, maxDurationSeconds * 1000);
		});
	}

	/**
	 * Update motion status during recording
	 * Call this method whenever motion is detected or not detected
	 */
	updateMotion(hasMotion: boolean): void {
		if (!this.isRecording) return;

		if (hasMotion) {
			// Reset the last motion time
			this.lastMotionTime = Date.now();

			// Clear any pending stop timer
			if (this.recordingTimer !== null) {
				clearTimeout(this.recordingTimer);
				this.recordingTimer = null;
			}

			// Notify callback
			if (this.onMotionCallback) {
				this.onMotionCallback(true);
			}
		} else {
			// No motion detected
			const timeSinceLastMotion = Date.now() - this.lastMotionTime;
			const recordingElapsed = (Date.now() - this.startTime) / 1000;

			// Only allow stopping if we've recorded for minimum duration
			const canStop = recordingElapsed >= MOTION_CONFIG.minRecordingDuration;

			// Only start stop timer if we've exceeded the delay, can stop, and timer isn't already set
			if (
				timeSinceLastMotion >= this.noMotionStopDelay &&
				canStop &&
				this.recordingTimer === null
			) {
				console.log(
					`⏸️ No motion for ${
						this.noMotionStopDelay
					}ms after ${recordingElapsed.toFixed(1)}s, stopping recording...`
				);
				this.recordingTimer = window.setTimeout(() => {
					this.finishRecording();
				}, 100); // Small delay to collect final frames
			} else if (!canStop && timeSinceLastMotion >= this.noMotionStopDelay) {
				// Still in minimum recording period
				console.log(
					`⏸️ No motion detected, but still in minimum recording period (${recordingElapsed.toFixed(
						1
					)}s/${MOTION_CONFIG.minRecordingDuration}s)`
				);
			}

			// Notify callback
			if (this.onMotionCallback) {
				this.onMotionCallback(false);
			}
		}
	}

	/**
	 * Finish recording and resolve the promise
	 * Internal method that properly resolves the startRecording promise
	 */
	private finishRecording(): void {
		if (!this.isRecording) return;

		this.isRecording = false;

		// Collect frames from the recording period
		const recordingDuration = (Date.now() - this.startTime) / 1000;
		this.recordingFrames = this.frameBuffer.getFrameSequence(recordingDuration);

		console.log(
			`⏹️ Recording stopped. Captured ${
				this.recordingFrames.length
			} frames (${recordingDuration.toFixed(1)}s)`
		);

		// Clear timers
		if (this.recordingTimer !== null) {
			clearTimeout(this.recordingTimer);
			this.recordingTimer = null;
		}
		if (this.maxDurationTimer !== null) {
			clearTimeout(this.maxDurationTimer);
			this.maxDurationTimer = null;
		}

		this.onMotionCallback = null;

		// Resolve the promise from startRecording
		if (this.resolveRecording) {
			this.resolveRecording(this.recordingFrames);
			this.resolveRecording = null;
		}
	}

	/**
	 * Stop recording (public method for external calls)
	 */
	stopRecording(): Promise<CapturedFrame[]> {
		return new Promise((resolve) => {
			if (!this.isRecording) {
				resolve(this.recordingFrames);
				return;
			}

			// Store the resolve callback and finish
			this.resolveRecording = resolve;
			this.finishRecording();
		});
	}

	/**
	 * Cancel ongoing recording
	 */
	cancelRecording(): void {
		if (this.recordingTimer !== null) {
			clearTimeout(this.recordingTimer);
			this.recordingTimer = null;
		}
		this.isRecording = false;
		this.recordingFrames = [];
		console.log("❌ Recording cancelled");
	}

	/**
	 * Check if currently recording
	 */
	isActive(): boolean {
		return this.isRecording;
	}

	/**
	 * Get current recording progress (0-1)
	 */
	getProgress(): number {
		if (!this.isRecording || !this.startTime) return 0;

		const elapsed = Date.now() - this.startTime;
		const total = MOTION_CONFIG.recordingDuration * 1000;
		return Math.min(1, elapsed / total);
	}

	/**
	 * Get elapsed recording time in seconds
	 */
	getElapsedTime(): number {
		if (!this.isRecording || !this.startTime) return 0;
		return (Date.now() - this.startTime) / 1000;
	}
}

export default FrameBuffer;
