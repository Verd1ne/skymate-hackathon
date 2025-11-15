/**
 * Motion Detector
 * Detects motion by comparing consecutive video frames
 * Extracted and enhanced from CameraView component
 */

export interface MotionDetectionResult {
	hasMotion: boolean;
	difference: number; // 0-1, average pixel difference
	centerX: number; // 0-1, normalized X position of motion center
	centerY: number; // 0-1, normalized Y position of motion center
}

export interface MotionDetectorOptions {
	threshold: number; // 0-1, sensitivity threshold (default: 0.15)
	sampleRate: number; // Pixel sampling rate for performance (default: 10)
}

export class MotionDetector {
	private previousFrame: ImageData | null = null;
	private options: Required<MotionDetectorOptions>;

	constructor(options?: Partial<MotionDetectorOptions>) {
		this.options = {
			threshold: options?.threshold ?? 0.15,
			sampleRate: options?.sampleRate ?? 10,
		};
	}

	/**
	 * Detect motion by comparing current frame with previous frame
	 * @param currentFrame - Current video frame as ImageData
	 * @returns Motion detection result
	 */
	detectMotion(currentFrame: ImageData): MotionDetectionResult {
		// If no previous frame, no motion can be detected yet
		if (!this.previousFrame) {
			this.previousFrame = this.cloneImageData(currentFrame);
			return {
				hasMotion: false,
				difference: 0,
				centerX: 0.5,
				centerY: 0.5,
			};
		}

		// Calculate frame difference
		const result = this.calculateFrameDifference(
			currentFrame,
			this.previousFrame
		);

		// Update previous frame
		this.previousFrame = this.cloneImageData(currentFrame);

		// Determine if motion exceeds threshold
		const hasMotion = result.difference > this.options.threshold;

		return {
			hasMotion,
			...result,
		};
	}

	/**
	 * Calculate difference between two frames
	 * Returns average pixel difference and center of motion
	 */
	private calculateFrameDifference(
		currentFrame: ImageData,
		previousFrame: ImageData
	): Omit<MotionDetectionResult, "hasMotion"> {
		const currentData = currentFrame.data;
		const previousData = previousFrame.data;
		const width = currentFrame.width;
		const height = currentFrame.height;

		let totalDiff = 0;
		let pixelCount = 0;
		let weightedX = 0;
		let weightedY = 0;
		let totalWeight = 0;

		const sampleRate = this.options.sampleRate;

		// Sample pixels for performance (check every Nth pixel)
		for (let y = 0; y < height; y += sampleRate) {
			for (let x = 0; x < width; x += sampleRate) {
				const index = (y * width + x) * 4;

				if (index >= currentData.length) continue;

				// Calculate RGB difference
				const diffR = Math.abs(currentData[index] - previousData[index]);
				const diffG = Math.abs(
					currentData[index + 1] - previousData[index + 1]
				);
				const diffB = Math.abs(
					currentData[index + 2] - previousData[index + 2]
				);

				// Normalize to 0-1
				const normalizedDiff = (diffR + diffG + diffB) / (3 * 255);

				totalDiff += normalizedDiff;
				pixelCount++;

				// Weight by difference amount to find center of motion
				if (normalizedDiff > 0.1) {
					const weight = normalizedDiff;
					weightedX += x * weight;
					weightedY += y * weight;
					totalWeight += weight;
				}
			}
		}

		const avgDifference = pixelCount > 0 ? totalDiff / pixelCount : 0;

		// Calculate center of motion (normalized to 0-1)
		let centerX = 0.5;
		let centerY = 0.5;

		if (totalWeight > 0) {
			centerX = weightedX / totalWeight / width;
			centerY = weightedY / totalWeight / height;
		}

		return {
			difference: avgDifference,
			centerX: Math.max(0, Math.min(1, centerX)),
			centerY: Math.max(0, Math.min(1, centerY)),
		};
	}

	/**
	 * Clone ImageData object
	 */
	private cloneImageData(imageData: ImageData): ImageData {
		const cloned = new ImageData(
			new Uint8ClampedArray(imageData.data),
			imageData.width,
			imageData.height
		);
		return cloned;
	}

	/**
	 * Reset detector (clear previous frame)
	 */
	reset(): void {
		this.previousFrame = null;
	}

	/**
	 * Update detection threshold
	 */
	setThreshold(threshold: number): void {
		this.options.threshold = Math.max(0, Math.min(1, threshold));
	}

	/**
	 * Get current threshold
	 */
	getThreshold(): number {
		return this.options.threshold;
	}
}

/**
 * Helper function to capture frame from video element
 */
export function captureVideoFrame(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement
): ImageData | null {
	if (!video || !canvas) return null;

	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;

	// Set canvas size to match video
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	// Draw video frame to canvas
	context.drawImage(video, 0, 0);

	// Get image data
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Continuous motion monitoring class with cooldown support
 * Monitors video stream and triggers callback when motion detected
 */
export class ContinuousMotionMonitor {
	private detector: MotionDetector;
	private video: HTMLVideoElement;
	private canvas: HTMLCanvasElement;
	private intervalId: number | null = null;
	private onMotionDetected: (result: MotionDetectionResult) => void;
	private checkInterval: number; // milliseconds
	private cooldownPeriod: number; // milliseconds
	// private lastDetectionTime: number = 0; // TODO: Track detection timing if needed
	private isInCooldown: boolean = false;
	private motionIntensityBuffer: number[] = [];
	private intensityBufferSize: number = 5;

	constructor(
		video: HTMLVideoElement,
		canvas: HTMLCanvasElement,
		onMotionDetected: (result: MotionDetectionResult) => void,
		options?: {
			threshold?: number;
			checkInterval?: number; // milliseconds between checks
			cooldownPeriod?: number; // milliseconds to wait after detection before re-enabling
			intensityThreshold?: number; // minimum motion intensity to trigger (0-1)
		}
	) {
		this.video = video;
		this.canvas = canvas;
		this.onMotionDetected = onMotionDetected;
		this.checkInterval = options?.checkInterval ?? 200; // Default: check every 200ms for smoother detection
		this.cooldownPeriod = options?.cooldownPeriod ?? 0; // Default: no cooldown
		this.detector = new MotionDetector({
			threshold: options?.threshold ?? 0.15,
		});
	}

	/**
	 * Start monitoring for motion
	 */
	start(): void {
		if (this.intervalId !== null) {
			console.warn("Motion monitor already running");
			return;
		}

		console.log(
			`👁️ Starting motion monitor (interval: ${this.checkInterval}ms, cooldown: ${this.cooldownPeriod}ms)`
		);

		this.intervalId = window.setInterval(() => {
			// Skip detection if in cooldown period
			if (this.isInCooldown) {
				return;
			}

			const frame = captureVideoFrame(this.video, this.canvas);
			if (!frame) return;

			const result = this.detector.detectMotion(frame);

			// Track motion intensity over time
			this.motionIntensityBuffer.push(result.difference);
			if (this.motionIntensityBuffer.length > this.intensityBufferSize) {
				this.motionIntensityBuffer.shift();
			}

			// Calculate average intensity to filter out noise
			const avgIntensity =
				this.motionIntensityBuffer.reduce((a, b) => a + b, 0) /
				this.motionIntensityBuffer.length;

			if (result.hasMotion && avgIntensity > 0.02) {
				// Require sustained motion (lowered for better sensitivity)
				console.log(
					`🔍 Motion detected! Difference: ${(result.difference * 100).toFixed(
						1
					)}%, Avg: ${(avgIntensity * 100).toFixed(1)}%`
				);
				// this.lastDetectionTime = Date.now(); // TODO: Track detection timing if needed
				this.onMotionDetected(result);

				// Enter cooldown if configured
				if (this.cooldownPeriod > 0) {
					this.enterCooldown();
				}
			}
		}, this.checkInterval);
	}

	/**
	 * Enter cooldown period (prevents re-triggering)
	 */
	private enterCooldown(): void {
		this.isInCooldown = true;
		console.log(`⏸️ Entering cooldown period (${this.cooldownPeriod}ms)...`);

		setTimeout(() => {
			this.isInCooldown = false;
			this.motionIntensityBuffer = []; // Clear buffer
			this.detector.reset(); // Reset detector state
			console.log("✅ Cooldown period ended, monitoring resumed");
		}, this.cooldownPeriod);
	}

	/**
	 * Manually trigger cooldown (useful when starting recording)
	 */
	triggerCooldown(): void {
		if (this.cooldownPeriod > 0) {
			this.enterCooldown();
		}
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			this.isInCooldown = false;
			console.log("⏹️ Motion monitor stopped");
		}
	}

	/**
	 * Check if monitoring is active
	 */
	isMonitoring(): boolean {
		return this.intervalId !== null && !this.isInCooldown;
	}

	/**
	 * Check if in cooldown period
	 */
	inCooldown(): boolean {
		return this.isInCooldown;
	}

	/**
	 * Reset detector state
	 */
	reset(): void {
		this.detector.reset();
		this.motionIntensityBuffer = [];
		this.isInCooldown = false;
	}

	/**
	 * Update cooldown period
	 */
	setCooldownPeriod(milliseconds: number): void {
		this.cooldownPeriod = Math.max(0, milliseconds);
	}

	/**
	 * Update motion threshold
	 */
	setThreshold(threshold: number): void {
		this.detector.setThreshold(threshold);
	}
}
