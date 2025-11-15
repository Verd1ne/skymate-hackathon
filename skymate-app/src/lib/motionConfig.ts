/**
 * Motion Detection Configuration
 *
 * Tunable parameters for the motion-triggered post-event classification system
 */

export const MOTION_CONFIG = {
	// Motion Detection
	motionThreshold: 0.03, // Pixel difference threshold to START recording (0-1), lower = more sensitive
	recordingMotionThreshold: 0.08, // Pixel difference threshold DURING recording (LOWER = easier to detect motion = harder to stop recording)
	motionIntensityMin: 0.03, // Minimum sustained intensity to trigger
	checkInterval: 250, // Milliseconds between frame checks

	// Recording
	recordingDuration: 10, // Maximum seconds to record (fallback if motion never stops)
	minRecordingDuration: 5, // Minimum seconds to record before allowing stop (ensures enough frames)
	frameRate: 5, // Frames per second to capture (5 = 25 frames total)
	noMotionStopDelay: 0.5, // Seconds of no motion before stopping recording (0.5s)

	// Cooldown
	cooldownPeriod: 2000, // Milliseconds to wait before re-enabling detection (3 seconds)

	// YOLO Detection
	confidenceThreshold: 0.3, // YOLO confidence threshold
	iouThreshold: 0.45, // IoU threshold for NMS

	// Frame Comparison
	startFrames: 3, // Number of frames to average at start
	endFrames: 3, // Number of frames to average at end
	positionTolerancePx: 50, // Pixels tolerance for matching object positions

	// Performance
	maxFrameBufferSize: 30, // Maximum frames to keep in buffer
	clearBufferAfterAnalysis: true, // Clear buffer after processing to free memory
};

/**
 * Get effective frame count for a recording
 */
export function getFrameCount(): number {
	return MOTION_CONFIG.recordingDuration * MOTION_CONFIG.frameRate;
}

/**
 * Get interval between frames in milliseconds
 */
export function getFrameInterval(): number {
	return 1000 / MOTION_CONFIG.frameRate;
}

/**
 * Calculate expected total processing time
 */
export function getEstimatedProcessingTime(): number {
	const recordingTime = MOTION_CONFIG.recordingDuration * 1000;
	const frameCount = getFrameCount();
	const inferenceTimePerFrame = 150; // Average 150ms per frame
	const analysisTime = frameCount * inferenceTimePerFrame;
	const classificationTime = 100; // ~100ms for classification

	return recordingTime + analysisTime + classificationTime;
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (MOTION_CONFIG.motionThreshold < 0 || MOTION_CONFIG.motionThreshold > 1) {
		errors.push("motionThreshold must be between 0 and 1");
	}

	if (MOTION_CONFIG.recordingDuration < 1) {
		errors.push("recordingDuration must be at least 1 second");
	}

	if (MOTION_CONFIG.frameRate < 1 || MOTION_CONFIG.frameRate > 30) {
		errors.push("frameRate must be between 1 and 30 FPS");
	}

	if (MOTION_CONFIG.startFrames < 1 || MOTION_CONFIG.endFrames < 1) {
		errors.push("startFrames and endFrames must be at least 1");
	}

	const totalFrames = getFrameCount();
	if (MOTION_CONFIG.startFrames + MOTION_CONFIG.endFrames > totalFrames) {
		errors.push("startFrames + endFrames cannot exceed total frame count");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export default MOTION_CONFIG;
