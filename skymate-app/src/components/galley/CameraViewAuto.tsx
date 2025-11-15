/**
 * Automatic Motion-Triggered Camera View
 *
 * Replaces manual scan button with automatic motion detection system
 * Records 5-second clips when motion detected, then analyzes for action classification
 */

import { useState, useRef, useEffect } from "react";
import {
	X,
	Loader2,
	CheckCircle,
	AlertCircle,
	Circle,
	Video,
} from "lucide-react";
import {
	ContinuousMotionMonitor,
	MotionDetector,
	captureVideoFrame,
} from "../../lib/motionDetector";
import FrameBuffer, { RecordingSession } from "../../lib/frameBuffer";
import { analyzeFrameSequence } from "../../lib/postEventAnalyzer";
import type { ActionResult } from "../../lib/postEventAnalyzer";
import { MOTION_CONFIG } from "../../lib/motionConfig";
import yolov8Service from "../../lib/yolov8Service";
import type { Detection } from "../../lib/yolov8Utils";

interface ScanResult {
	action: "take_out" | "put_in" | "none";
	item: string;
	confidence: number;
	doorNumber?: number;
}

interface CameraViewAutoProps {
	onClose: () => void;
	onScanComplete?: (result: ScanResult) => void;
}

type SystemState =
	| "initializing"
	| "monitoring"
	| "recording"
	| "analyzing"
	| "result"
	| "cooldown"
	| "error";

function CameraViewAuto({ onClose, onScanComplete }: CameraViewAutoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
	const frameBufferRef = useRef<FrameBuffer | null>(null);
	const motionMonitorRef = useRef<ContinuousMotionMonitor | null>(null);
	const recordingSessionRef = useRef<RecordingSession | null>(null);
	const detectionIntervalRef = useRef<number | null>(null);
	const systemStateRef = useRef<SystemState>("initializing");

	const [stream, setStream] = useState<MediaStream | null>(null);
	const [systemState, setSystemState] = useState<SystemState>("initializing");
	const [status, setStatus] = useState<string>("Initializing camera...");
	const [error, setError] = useState<string | null>(null);

	// Recording state
	const [recordingTimeLeft, setRecordingTimeLeft] = useState<number>(0);

	// Result state
	const [result, setResult] = useState<ActionResult | null>(null);

	// Object detection state
	const [detections, setDetections] = useState<Detection[]>([]);

	/**
	 * Initialize camera and start monitoring
	 */
	useEffect(() => {
		let mounted = true;

		const initCamera = async () => {
			try {
				console.log("📷 Initializing camera for automatic detection...");

				// Request camera access
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: "environment",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
					audio: false,
				});

				if (!mounted) {
					mediaStream.getTracks().forEach((track) => track.stop());
					return;
				}

				setStream(mediaStream);

				// Attach to video element
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;

					// Wait for video to be ready
					videoRef.current.onloadedmetadata = () => {
						if (mounted && videoRef.current && canvasRef.current) {
							startMotionMonitoring();
						}
					};
				}

				console.log("✅ Camera initialized");
			} catch (err: any) {
				console.error("❌ Camera initialization error:", err);
				if (mounted) {
					setError(`Failed to access camera: ${err.message}`);
					setSystemState("error");
				}
			}
		};

		initCamera();

		return () => {
			mounted = false;
			cleanup();
		};
	}, []);

	/**
	 * Sync systemState with ref for interval callback access
	 */
	useEffect(() => {
		systemStateRef.current = systemState;
	}, [systemState]);

	/**
	 * Draw detections on overlay canvas whenever detections change
	 */
	useEffect(() => {
		if (!overlayCanvasRef.current || !videoRef.current) {
			return;
		}

		const canvas = overlayCanvasRef.current;
		const video = videoRef.current;
		const ctx = canvas.getContext("2d");

		if (!ctx) return;

		// Update canvas size to match video display size
		const rect = video.getBoundingClientRect();
		canvas.width = video.videoWidth || rect.width;
		canvas.height = video.videoHeight || rect.height;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw each detection
		detections.forEach((detection) => {
			const [x, y, w, h] = detection.bbox;

			// Determine color based on confidence
			let color: string;
			if (detection.score >= 0.7) {
				color = "#00ff00"; // Green for high confidence
			} else if (detection.score >= 0.4) {
				color = "#ffff00"; // Yellow for medium confidence
			} else {
				color = "#ff6600"; // Orange for low confidence
			}

			// Draw bounding box
			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.strokeRect(x, y, w, h);

			// Draw label background
			const label = `${detection.className} ${(detection.score * 100).toFixed(
				1
			)}%`;
			ctx.font = "16px Arial";
			const textMetrics = ctx.measureText(label);
			const textHeight = 22;
			const padding = 6;

			// Semi-transparent background
			ctx.fillStyle = color + "DD"; // Add alpha for transparency
			ctx.fillRect(
				x,
				y - textHeight - padding,
				textMetrics.width + padding * 2,
				textHeight + padding
			);

			// Draw label text
			ctx.fillStyle = "#000000";
			ctx.fillText(label, x + padding, y - padding - 4);
		});
	}, [detections]);

	/**
	 * Start continuous motion monitoring
	 */
	const startMotionMonitoring = () => {
		if (!videoRef.current || !canvasRef.current) {
			console.error("Video or canvas ref not available");
			return;
		}

		console.log("👁️ Starting automatic motion detection...");

		// Initialize frame buffer
		frameBufferRef.current = new FrameBuffer(
			videoRef.current,
			canvasRef.current,
			MOTION_CONFIG.maxFrameBufferSize
		);
		frameBufferRef.current.startBuffering();

		// Initialize recording session
		recordingSessionRef.current = new RecordingSession(frameBufferRef.current);

		// Initialize motion monitor
		motionMonitorRef.current = new ContinuousMotionMonitor(
			videoRef.current,
			canvasRef.current,
			handleMotionDetected,
			{
				threshold: MOTION_CONFIG.motionThreshold,
				checkInterval: MOTION_CONFIG.checkInterval,
				cooldownPeriod: MOTION_CONFIG.cooldownPeriod,
			}
		);

		motionMonitorRef.current.start();

		// Start object detection
		startObjectDetection();

		setSystemState("monitoring");
		setStatus("Monitoring for motion...");
		setError(null);
	};

	/**
	 * Start continuous object detection for bounding boxes
	 */
	const startObjectDetection = async () => {
		console.log("🔍 Initializing YOLOv8 for object detection...");

		try {
			// Initialize YOLOv8 model
			await yolov8Service.initialize();
			console.log("✅ YOLOv8 ready for detection");

			// Start detection loop
			if (detectionIntervalRef.current !== null) {
				clearInterval(detectionIntervalRef.current);
			}

			detectionIntervalRef.current = window.setInterval(async () => {
				// Skip detection during analysis phase (analysis runs its own detection)
				if (systemStateRef.current === "analyzing") {
					return;
				}

				if (!videoRef.current || !canvasRef.current) {
					return;
				}

				try {
					const frame = captureVideoFrame(videoRef.current, canvasRef.current);
					if (!frame) return;

					// Run YOLOv8 detection
					const result = await yolov8Service.detectObjects(
						frame,
						0.25, // confidence threshold
						0.45 // IoU threshold
					);

					setDetections(result.detections);
				} catch (err) {
					console.error("Detection error:", err);
					// Don't update detections on error, keep previous ones
				}
			}, 400); // 400ms interval for balanced performance

			console.log("✅ Object detection loop started");
		} catch (err: any) {
			console.error("❌ Failed to initialize object detection:", err);
		}
	};

	/**
	 * Stop object detection loop
	 */
	const stopObjectDetection = () => {
		if (detectionIntervalRef.current !== null) {
			clearInterval(detectionIntervalRef.current);
			detectionIntervalRef.current = null;
			console.log("⏹️ Object detection loop stopped");
		}
		setDetections([]);
	};

	/**
	 * Handle motion detection event
	 */
	const handleMotionDetected = async () => {
		console.log("🎬 Motion detected! Starting recording...");

		// IMPORTANT: Pause motion monitor during recording to avoid state conflicts
		if (motionMonitorRef.current) {
			motionMonitorRef.current.stop();
		}

		setSystemState("recording");
		setRecordingTimeLeft(MOTION_CONFIG.recordingDuration);

		// Update recording time as it progresses
		const updateInterval = setInterval(() => {
			if (recordingSessionRef.current?.isActive()) {
				const elapsed = recordingSessionRef.current.getElapsedTime();
				setRecordingTimeLeft(elapsed);
			}
		}, 100);

		try {
			// Start recording session
			if (!recordingSessionRef.current) {
				throw new Error("Recording session not initialized");
			}

			// Start recording with motion-based stopping
			const recordingPromise = recordingSessionRef.current.startRecording(
				MOTION_CONFIG.recordingDuration,
				MOTION_CONFIG.noMotionStopDelay,
				(hasMotion) => {
					// Update status based on motion during recording
					const elapsed = recordingSessionRef.current?.getElapsedTime() || 0;
					const minDuration = MOTION_CONFIG.minRecordingDuration;

					if (elapsed < minDuration) {
						setStatus(
							`Recording... (min ${minDuration}s required, ${elapsed.toFixed(
								1
							)}s elapsed)`
						);
					} else if (hasMotion) {
						setStatus("Recording... (motion active)");
					} else {
						setStatus("Recording... (waiting for motion to stop)");
					}
				}
			);

			// Monitor for motion during recording
			// Use higher threshold (less sensitive) to avoid stopping too easily
			const recordingMotionDetector = new MotionDetector({
				threshold: MOTION_CONFIG.recordingMotionThreshold,
			});

			// Initialize detector with first frame to avoid false "no motion" on first check
			let detectorInitialized = false;

			const motionCheckInterval = setInterval(() => {
				if (
					videoRef.current &&
					canvasRef.current &&
					recordingSessionRef.current?.isActive()
				) {
					const frame = captureVideoFrame(videoRef.current, canvasRef.current);

					if (frame) {
						// Initialize detector on first frame (this sets the previous frame)
						if (!detectorInitialized) {
							recordingMotionDetector.detectMotion(frame); // First call just initializes
							detectorInitialized = true;
							console.log(
								`🎬 Recording motion detector initialized with threshold: ${MOTION_CONFIG.recordingMotionThreshold}`
							);
							return; // Skip this frame, start detecting on next
						}

						const result = recordingMotionDetector.detectMotion(frame);

						// Debug logging
						if (result.hasMotion) {
							console.log(
								`📹 Recording: Motion detected (diff: ${(
									result.difference * 100
								).toFixed(1)}%, threshold: ${(
									MOTION_CONFIG.recordingMotionThreshold * 100
								).toFixed(1)}%)`
							);
						}

						recordingSessionRef.current.updateMotion(result.hasMotion);
					}
				} else {
					clearInterval(motionCheckInterval);
				}
			}, MOTION_CONFIG.checkInterval);

			// Wait for recording to complete
			const frames = await recordingPromise;

			clearInterval(updateInterval);
			clearInterval(motionCheckInterval);

			console.log(`✅ Recording complete. Captured ${frames.length} frames`);

			// Analyze the recorded frames
			await analyzeRecording(frames);
		} catch (err: any) {
			clearInterval(updateInterval);
			console.error("❌ Recording error:", err);
			setError(`Recording failed: ${err.message}`);
			setSystemState("error");

			// Restart motion monitor after error
			if (motionMonitorRef.current) {
				motionMonitorRef.current.reset();
				motionMonitorRef.current.start();
			}

			// Return to monitoring after error
			setTimeout(() => {
				setSystemState("monitoring");
				setStatus("Monitoring for motion...");
				setError(null);
			}, 3000);
		}
	};

	/**
	 * Analyze recorded frames
	 */
	const analyzeRecording = async (frames: any[]) => {
		setSystemState("analyzing");
		setStatus("Analyzing video...");

		try {
			// Run post-event analysis
			const analysisResult = await analyzeFrameSequence(frames);

			setResult(analysisResult);
			setSystemState("result");
			setStatus(`${analysisResult.description}`);

			// Call completion callback
			if (onScanComplete && analysisResult.action !== "idle") {
				onScanComplete({
					action: analysisResult.action,
					item: analysisResult.item || "unknown",
					confidence: analysisResult.confidence,
				});
			}

			// Show result for 3 seconds, then enter cooldown
			setTimeout(() => {
				setSystemState("cooldown");
				const cooldownSeconds = MOTION_CONFIG.cooldownPeriod / 1000;
				setStatus(`Cooldown... Ready in ${cooldownSeconds}s`);

				// After cooldown, restart motion monitor and return to monitoring
				setTimeout(() => {
					setResult(null);
					setSystemState("monitoring");
					setStatus("Monitoring for motion...");

					// Restart motion monitor
					if (motionMonitorRef.current) {
						motionMonitorRef.current.reset();
						motionMonitorRef.current.start();
					}
				}, MOTION_CONFIG.cooldownPeriod);
			}, 3000);
		} catch (err: any) {
			console.error("❌ Analysis error:", err);
			setError(`Analysis failed: ${err.message}`);
			setSystemState("error");

			// Restart motion monitor after error
			if (motionMonitorRef.current) {
				motionMonitorRef.current.reset();
				motionMonitorRef.current.start();
			}

			setTimeout(() => {
				setSystemState("monitoring");
				setStatus("Monitoring for motion...");
				setError(null);
			}, 3000);
		}
	};

	/**
	 * Cleanup resources
	 */
	const cleanup = () => {
		if (motionMonitorRef.current) {
			motionMonitorRef.current.stop();
		}
		if (frameBufferRef.current) {
			frameBufferRef.current.stopBuffering();
			frameBufferRef.current.clearBuffer();
		}
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
		// Stop object detection
		stopObjectDetection();
	};

	/**
	 * Get status indicator color
	 */
	const getStatusColor = (): string => {
		switch (systemState) {
			case "monitoring":
				return "text-blue-500";
			case "recording":
				return "text-red-500";
			case "analyzing":
				return "text-yellow-500";
			case "result":
				return "text-green-500";
			case "cooldown":
				return "text-gray-500";
			case "error":
				return "text-red-500";
			default:
				return "text-gray-500";
		}
	};

	/**
	 * Get status icon
	 */
	const getStatusIcon = () => {
		switch (systemState) {
			case "monitoring":
				return <Circle className="animate-pulse" size={24} />;
			case "recording":
				return <Video className="animate-pulse" size={24} />;
			case "analyzing":
				return <Loader2 className="animate-spin" size={24} />;
			case "result":
				return result?.action !== "idle" ? (
					<CheckCircle size={24} />
				) : (
					<Circle size={24} />
				);
			case "error":
				return <AlertCircle size={24} />;
			default:
				return <Loader2 className="animate-spin" size={24} />;
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
			<div className="relative w-full h-full max-w-4xl max-h-screen flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 bg-gray-900 text-white">
					<div className="flex items-center gap-3">
						<h2 className="text-xl font-bold">Automatic Detection</h2>
						<div className={`flex items-center gap-2 ${getStatusColor()}`}>
							{getStatusIcon()}
							<span className="text-sm font-medium">
								{systemState === "monitoring" && "Monitoring"}
								{systemState === "recording" &&
									`Recording ${recordingTimeLeft.toFixed(1)}s`}
								{systemState === "analyzing" && "Analyzing"}
								{systemState === "result" && "Complete"}
								{systemState === "cooldown" && "Cooldown"}
								{systemState === "error" && "Error"}
							</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Close camera"
					>
						<X size={24} />
					</button>
				</div>

				{/* Camera View */}
				<div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="max-w-full max-h-full object-contain"
					/>

					{/* Overlay canvas for bounding boxes */}
					<canvas
						ref={overlayCanvasRef}
						className="absolute top-0 left-0 w-full h-full pointer-events-none"
						style={{ objectFit: "contain" }}
					/>

					{/* Hidden canvas for frame capture */}
					<canvas ref={canvasRef} className="hidden" />

					{/* Overlay UI */}
					<div className="absolute inset-0 pointer-events-none">
						{/* Recording indicator */}
						{systemState === "recording" && (
							<div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
								<div className="w-3 h-3 bg-white rounded-full"></div>
								<span className="font-bold">
									REC {recordingTimeLeft.toFixed(1)}s
								</span>
							</div>
						)}

						{/* Status message */}
						<div className="absolute bottom-20 left-0 right-0 text-center">
							<div className="inline-block bg-black bg-opacity-75 px-6 py-3 rounded-lg">
								<p className="text-white text-lg">{status}</p>
							</div>
						</div>

						{/* Result display */}
						{systemState === "result" && result && result.action !== "idle" && (
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-8 py-6 rounded-lg shadow-lg">
								<div className="flex items-center gap-4">
									<CheckCircle size={48} />
									<div>
										<p className="text-2xl font-bold capitalize">
											{result.action.replace("_", " ")}
										</p>
										<p className="text-xl">{result.item}</p>
										<p className="text-sm opacity-90">
											{(result.confidence * 100).toFixed(1)}% confidence
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Error display */}
						{error && (
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-lg shadow-lg">
								<div className="flex items-center gap-4">
									<AlertCircle size={48} />
									<div>
										<p className="text-xl font-bold">Error</p>
										<p className="text-sm">{error}</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Info Footer */}
				<div className="bg-gray-900 p-4 text-white text-center text-sm">
					<p>
						{systemState === "monitoring" &&
							"🔵 System is monitoring for motion. Move an item to trigger recording."}
						{systemState === "recording" &&
							"🔴 Recording for minimum 5s, then stops 0.5s after motion ends. System auto-stops when action complete."}
						{systemState === "analyzing" && "⏳ Analyzing recorded footage..."}
						{systemState === "result" &&
							"✅ Action detected! Returning to monitoring soon..."}
						{systemState === "cooldown" && "⏸️ Cooldown period. Please wait..."}
						{systemState === "error" && "❌ An error occurred. Retrying..."}
					</p>
				</div>
			</div>
		</div>
	);
}

export default CameraViewAuto;
