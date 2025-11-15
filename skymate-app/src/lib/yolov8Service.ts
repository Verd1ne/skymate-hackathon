/**
 * YOLOv8 Service (Backend API Version)
 *
 * Uses backend Express server with onnxruntime-node for fast inference
 * Replaces the previous browser-based ONNX Runtime Web implementation
 */

import yolov8ApiClient, { type Detection } from "./yolov8ApiClient";
import { mapCocoToInventoryCategory } from "./yolov8Utils";

export interface YoloDetectionResult {
	detections: Detection[];
	inferenceTime: number;
	preprocessTime: number;
	postprocessTime: number;
}

class YOLOv8Service {
	private backendAvailable: boolean = false;

	/**
	 * Initialize YOLOv8 service
	 * Checks if backend is available
	 */
	async initialize(): Promise<void> {
		console.log("🔍 Checking backend YOLOv8 service...");

		try {
			this.backendAvailable = await yolov8ApiClient.healthCheck();

			if (this.backendAvailable) {
				console.log("✅ Backend YOLOv8 service is available");
			} else {
				console.warn("⚠️ Backend YOLOv8 service is not available");
				console.warn("   Make sure the backend server is running:");
				console.warn("   cd server && npm run dev");
			}
		} catch (error) {
			console.error("❌ Failed to connect to backend:", error);
			this.backendAvailable = false;
		}
	}

	/**
	 * Run object detection on image
	 *
	 * @param imageData - ImageData from canvas
	 * @param confThreshold - Confidence threshold (default 0.25)
	 * @param iouThreshold - IoU threshold for NMS (default 0.45)
	 * @returns Detection results with timing information
	 */
	async detectObjects(
		imageData: ImageData,
		confThreshold: number = 0.25,
		iouThreshold: number = 0.45
	): Promise<YoloDetectionResult> {
		if (!this.backendAvailable) {
			console.warn("⚠️ Backend not available, attempting to reconnect...");
			await this.initialize();

			if (!this.backendAvailable) {
				throw new Error(
					"Backend YOLOv8 service is not available. Please start the server."
				);
			}
		}

		try {
			const startTime = Date.now();

			// Call backend API
			const detections = await yolov8ApiClient.detectObjects(
				imageData,
				confThreshold,
				iouThreshold
			);

			const totalTime = Date.now() - startTime;

			return {
				detections,
				inferenceTime: totalTime,
				preprocessTime: 0, // Handled by backend
				postprocessTime: 0, // Handled by backend
			};
		} catch (error: any) {
			console.error("❌ YOLOv8 detection error:", error);

			// Mark backend as unavailable
			this.backendAvailable = false;

			throw new Error(`Object detection failed: ${error.message}`);
		}
	}

	/**
	 * Classify item in image (compatible with existing interface)
	 * Finds the most prominent object and maps it to inventory category
	 *
	 * @param imageData - ImageData from canvas
	 * @returns Classification result
	 */
	async classifyItem(imageData: ImageData): Promise<{
		category: string;
		itemName?: string;
		confidence: number;
		description?: string;
	}> {
		const result = await this.detectObjects(imageData, 0.3, 0.45);

		if (result.detections.length === 0) {
			return {
				category: "food",
				confidence: 0.1,
				description: "No objects detected",
			};
		}

		// Find largest detection by area (most prominent object)
		const largestDetection = result.detections.reduce((prev, current) => {
			const prevArea = prev.bbox[2] * prev.bbox[3];
			const currentArea = current.bbox[2] * current.bbox[3];
			return currentArea > prevArea ? current : prev;
		});

		const category = mapCocoToInventoryCategory(
			largestDetection.className || ""
		);

		return {
			category,
			itemName: largestDetection.className,
			confidence: largestDetection.score,
			description: `Detected ${largestDetection.className} with ${(
				largestDetection.score * 100
			).toFixed(1)}% confidence`,
		};
	}

	/**
	 * Detect hand and held objects
	 * Used for gesture recognition (putting in / taking out)
	 *
	 * @param imageData - ImageData from canvas
	 * @returns Hand gesture result
	 */
	async detectHandGesture(imageData: ImageData): Promise<{
		hasItem: boolean;
		direction: "in" | "out" | "unknown";
		confidence: number;
		description: string;
	}> {
		const result = await this.detectObjects(imageData, 0.25, 0.45);

		const hands = result.detections.filter((d) => d.className === "person");
		const items = result.detections.filter(
			(d) => d.className !== "person" && d.score > 0.3
		);

		const hasHand = hands.length > 0;
		const hasObject = items.length > 0;
		const hasItem = hasHand && hasObject;

		// Simple heuristic: if object is in upper half, likely going in
		let direction: "in" | "out" | "unknown" = "unknown";
		if (hasObject && items.length > 0) {
			const imageHeight = 640; // Assume 640x640 for now
			const avgY =
				items.reduce((sum, item) => sum + item.bbox[1], 0) / items.length;
			direction = avgY < imageHeight / 2 ? "in" : "out";
		}

		const confidence = hasHand ? hands[0].score : 0.3;

		const description = hasItem
			? `Hand holding ${items[0].className}, moving ${direction}`
			: hasHand
			? "Hand detected, no item"
			: "No hand detected";

		return {
			hasItem,
			direction,
			confidence,
			description,
		};
	}

	/**
	 * Check if model is initialized (backend is available)
	 */
	isInitialized(): boolean {
		return this.backendAvailable;
	}

	/**
	 * Batch process multiple frames for efficiency
	 * Processes frames sequentially but with optimized logging
	 *
	 * @param imageDataArray - Array of ImageData to process
	 * @param confThreshold - Confidence threshold
	 * @param iouThreshold - IoU threshold for NMS
	 * @returns Array of detection results
	 */
	async batchDetectObjects(
		imageDataArray: ImageData[],
		confThreshold: number = 0.25,
		iouThreshold: number = 0.45
	): Promise<YoloDetectionResult[]> {
		console.log(`🔄 Batch processing ${imageDataArray.length} frames...`);
		const startTime = Date.now();

		const results: YoloDetectionResult[] = [];

		for (let i = 0; i < imageDataArray.length; i++) {
			try {
				const result = await this.detectObjects(
					imageDataArray[i],
					confThreshold,
					iouThreshold
				);
				results.push(result);

				// Log progress every 5 frames
				if ((i + 1) % 5 === 0 || i === imageDataArray.length - 1) {
					const progress = (((i + 1) / imageDataArray.length) * 100).toFixed(0);
					const elapsed = Date.now() - startTime;
					const avgTime = elapsed / (i + 1);
					const remaining = avgTime * (imageDataArray.length - i - 1);
					console.log(
						`  Batch progress: ${i + 1}/${
							imageDataArray.length
						} (${progress}%) - ETA: ${(remaining / 1000).toFixed(1)}s`
					);
				}
			} catch (error) {
				console.error(`Failed to process frame ${i}:`, error);
				// Add empty result for failed frame
				results.push({
					detections: [],
					inferenceTime: 0,
					preprocessTime: 0,
					postprocessTime: 0,
				});
			}
		}

		const totalTime = Date.now() - startTime;
		const avgTime = totalTime / imageDataArray.length;
		console.log(
			`✅ Batch processing complete: ${imageDataArray.length} frames in ${(
				totalTime / 1000
			).toFixed(1)}s (avg ${avgTime.toFixed(0)}ms/frame)`
		);

		return results;
	}

	/**
	 * Dispose model and free resources (no-op for backend version)
	 */
	async dispose(): Promise<void> {
		console.log("✅ YOLOv8 service disposed (backend version)");
		this.backendAvailable = false;
	}
}

// Singleton instance
const yolov8Service = new YOLOv8Service();

export default yolov8Service;
export { YOLOv8Service };
