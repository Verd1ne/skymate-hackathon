import { useState, useRef, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle, Video } from "lucide-react";
import { VideoRecorder } from "../../lib/videoRecorder";
import { ContinuousMotionMonitor } from "../../lib/motionDetector";
import { uploadAndAnalyzeVideo } from "../../lib/videoApiClient";

interface ScanResult {
	action: "take_out" | "put_in" | "none";
	item: string;
	confidence: number;
}

interface CameraViewProps {
	onClose: () => void;
	onScanComplete?: (result: ScanResult) => void;
}

function CameraView({ onClose, onScanComplete }: CameraViewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoRecorderRef = useRef<VideoRecorder | null>(null);
	const motionMonitorRef = useRef<ContinuousMotionMonitor | null>(null);

	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string>("Monitoring for motion...");
	const [isMonitoring, setIsMonitoring] = useState(true);

	// Recording state
	const [isRecording, setIsRecording] = useState(false);
	const [recordingProgress, setRecordingProgress] = useState(0);

	// Upload/Analysis state
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [isAnalyzing, setIsAnalyzing] = useState(false);

	// Result state
	const [result, setResult] = useState<ScanResult | null>(null);
	const [showResult, setShowResult] = useState(false);

	/**
	 * Start motion recording when motion is detected
	 */
	const startMotionRecording = async () => {
		if (!stream || !videoRef.current || !canvasRef.current) {
			console.error("Cannot start recording: stream or refs not available");
			return;
		}

		try {
			console.log("🎥 Motion detected! Starting 5-second video recording...");
			setIsRecording(true);
			setRecordingProgress(0);
			setStatus("Recording video...");

			// Stop motion monitoring while recording
			if (motionMonitorRef.current) {
				motionMonitorRef.current.stop();
			}

			// Initialize video recorder
			videoRecorderRef.current = new VideoRecorder();

			// Start progress animation
			const progressInterval = setInterval(() => {
				setRecordingProgress((prev) => {
					if (prev >= 100) {
						clearInterval(progressInterval);
						return 100;
					}
					return prev + 2; // 100% in 5 seconds = 2% per 100ms
				});
			}, 100);

			// Record 5 seconds of video
			const recordingResult = await videoRecorderRef.current.startRecording(
				stream,
				{
					duration: 5, // 5 seconds
					videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
				}
			);

			clearInterval(progressInterval);
			setRecordingProgress(100);
			setIsRecording(false);

			console.log(
				`✅ Recording complete: ${(recordingResult.size / 1024).toFixed(2)} KB`
			);

			// Upload and analyze video
			await uploadAndAnalyzeVideoRecording(recordingResult.blob);
		} catch (error: any) {
			console.error("❌ Recording error:", error);
			setIsRecording(false);
			setError(`Recording failed: ${error.message}`);
			setStatus("Recording failed");

			// Restart monitoring after error
			setTimeout(() => {
				setError(null);
				startMonitoring();
			}, 3000);
		}
	};

	/**
	 * Upload and analyze the recorded video
	 */
	const uploadAndAnalyzeVideoRecording = async (videoBlob: Blob) => {
		try {
			setIsUploading(true);
			setUploadProgress(0);
			setStatus("Uploading video...");

			console.log("📤 Uploading video for analysis...");

			// Upload and analyze
			const analysisResult = await uploadAndAnalyzeVideo(videoBlob, {
				onProgress: (progress) => {
					setUploadProgress(progress);
					if (progress < 100) {
						setStatus(`Uploading... ${Math.round(progress)}%`);
					} else {
						setStatus("Analyzing video...");
						setIsAnalyzing(true);
					}
				},
				timeout: 90000, // 90 seconds timeout
				retries: 2,
			});

			setIsUploading(false);
			setIsAnalyzing(false);
			setUploadProgress(0);

			console.log("✅ Video analysis complete:", analysisResult);

			// Create result
			const scanResult: ScanResult = {
				action: analysisResult.action,
				item: analysisResult.item,
				confidence: analysisResult.confidence,
			};

			setResult(scanResult);
			setShowResult(true);

			// Generate status message
			const actionText =
				analysisResult.action === "take_out"
					? "taken out of"
					: analysisResult.action === "put_in"
					? "put into"
					: "detected near";

			setStatus(`${analysisResult.item} has been ${actionText} the cabinet`);

			// Call completion callback
			if (onScanComplete) {
				onScanComplete(scanResult);
			}

			// Auto-close after 3 seconds
			setTimeout(() => {
				onClose();
			}, 3000);
		} catch (error: any) {
			console.error("❌ Video analysis error:", error);
			setError(`Analysis failed: ${error.message}`);
			setStatus("Analysis failed");
			setIsUploading(false);
			setIsAnalyzing(false);
			setUploadProgress(0);

			// Restart monitoring after error
			setTimeout(() => {
				setError(null);
				startMonitoring();
			}, 3000);
		}
	};

	/**
	 * Start motion monitoring
	 */
	const startMonitoring = () => {
		if (!videoRef.current || !canvasRef.current || !stream) {
			console.warn("Cannot start monitoring: refs or stream not available");
			return;
		}

		console.log("👁️ Starting motion monitoring...");
		setIsMonitoring(true);
		setStatus("Monitoring for motion...");

		motionMonitorRef.current = new ContinuousMotionMonitor(
			videoRef.current,
			canvasRef.current,
			() => {
				console.log("🔍 Motion detected! Starting recording...");
				startMotionRecording();
			},
			{
				threshold: 0.06, // Sensitivity threshold (lowered from 0.15 for higher sensitivity)
				checkInterval: 200, // Check every 300ms (more frequent checks)
			}
		);

		motionMonitorRef.current.start();
	};

	/**
	 * Stop motion monitoring
	 */
	const stopMonitoring = () => {
		if (motionMonitorRef.current) {
			motionMonitorRef.current.stop();
			motionMonitorRef.current = null;
		}
		setIsMonitoring(false);
		setStatus("Monitoring paused");
	};

	/**
	 * Initialize camera
	 */
	const startCamera = async () => {
		try {
			setError(null);
			console.log("📷 Starting camera...");

			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" }, // Use back camera on mobile
			});

			setStream(mediaStream);

			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream;
			}

			console.log("✅ Camera started");
		} catch (err) {
			console.error("Error accessing camera:", err);
			setError("Unable to access camera. Please check permissions.");
		}
	};

	/**
	 * Stop camera
	 */
	const stopCamera = () => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			setStream(null);
		}
	};

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		startCamera();

		return () => {
			stopCamera();
			stopMonitoring();

			// Cleanup video recorder
			if (videoRecorderRef.current && videoRecorderRef.current.isRecording()) {
				videoRecorderRef.current.stopRecording();
			}
		};
	}, []);

	/**
	 * Start monitoring when camera is ready
	 */
	useEffect(() => {
		if (
			stream &&
			videoRef.current &&
			canvasRef.current &&
			!isRecording &&
			!isUploading
		) {
			startMonitoring();
		}

		return () => {
			stopMonitoring();
		};
	}, [stream, isRecording, isUploading]);

	return (
		<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
			<div className="w-full h-full max-w-6xl max-h-[90vh] bg-black rounded-2xl shadow-2xl flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 bg-black/50 border-b border-white/10">
					<div className="flex-1">
						<div className="flex items-center gap-3">
							<Video size={24} className="text-blue-400" />
							<h2 className="text-white text-lg font-semibold">
								Motion-Activated Scanner
							</h2>
							{isMonitoring && (
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
									<span className="text-green-400 text-sm">Monitoring</span>
								</div>
							)}
						</div>
					</div>
					<button
						onClick={() => {
							stopMonitoring();
							stopCamera();
							onClose();
						}}
						className="p-2 text-white hover:bg-white/20 rounded-lg transition"
					>
						<X size={24} />
					</button>
				</div>

				{/* Camera View */}
				<div className="flex-1 relative flex items-center justify-center min-h-0">
					{error ? (
						<div className="text-center p-6">
							<AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
							<p className="text-white text-lg mb-4">{error}</p>
							<button
								onClick={startCamera}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
							>
								Retry
							</button>
						</div>
					) : (
						<>
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover"
							/>

							{/* Status Overlay */}
							{!showResult && (
								<div className="absolute top-4 left-4 right-4">
									<div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
										<div className="flex items-center gap-2">
											{isMonitoring && !isRecording && !isUploading && (
												<>
													<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
													<span className="text-white text-sm">{status}</span>
												</>
											)}
											{(isRecording || isUploading || isAnalyzing) && (
												<>
													<Loader2
														size={14}
														className="text-white animate-spin"
													/>
													<span className="text-white text-sm">{status}</span>
												</>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Recording Progress Overlay */}
							{isRecording && (
								<div className="absolute inset-0 bg-black/60 flex items-center justify-center">
									<div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
										<div className="w-16 h-16 mx-auto mb-4 relative">
											<div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse" />
											<div className="absolute inset-0 flex items-center justify-center">
												<Video className="text-red-500" size={32} />
											</div>
										</div>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											Recording Video
										</h3>
										<p className="text-gray-600 mb-4">
											{Math.ceil((100 - recordingProgress) / 20)} seconds
											remaining
										</p>
										<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
											<div
												className="bg-red-500 h-full transition-all duration-100"
												style={{ width: `${recordingProgress}%` }}
											/>
										</div>
									</div>
								</div>
							)}

							{/* Upload Progress Overlay */}
							{(isUploading || isAnalyzing) && !isRecording && (
								<div className="absolute inset-0 bg-black/60 flex items-center justify-center">
									<div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
										<Loader2
											className="text-blue-500 animate-spin mx-auto mb-4"
											size={48}
										/>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											{isAnalyzing ? "Analyzing Video" : "Uploading Video"}
										</h3>
										<p className="text-gray-600 mb-4">
											{isAnalyzing
												? "Detecting action and identifying item..."
												: `${Math.round(uploadProgress)}% uploaded`}
										</p>
										{!isAnalyzing && (
											<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
												<div
													className="bg-blue-500 h-full transition-all duration-300"
													style={{ width: `${uploadProgress}%` }}
												/>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Result Overlay */}
							{showResult && result && (
								<div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
									<div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
										<CheckCircle
											size={48}
											className="text-green-500 mx-auto mb-4"
										/>
										<h3 className="text-xl font-bold text-gray-800 mb-2">
											Detection Complete!
										</h3>
										<div className="text-gray-600 mb-2">
											<p className="text-lg font-semibold text-gray-800">
												{result.item}
											</p>
											<p className="text-sm">
												has been{" "}
												<span className="font-semibold">
													{result.action === "take_out"
														? "taken out of"
														: result.action === "put_in"
														? "put into"
														: "detected near"}
												</span>{" "}
												the cabinet
											</p>
										</div>
										<p className="text-gray-400 text-xs">
											Confidence: {Math.round(result.confidence * 100)}%
										</p>
										<p className="text-gray-400 text-xs mt-3">Closing...</p>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Info Footer */}
				{!error && !showResult && (
					<div className="p-4 bg-black/50 border-t border-white/10">
						<div className="text-center">
							<p className="text-white text-sm font-semibold mb-1">
								{isMonitoring &&
									!isRecording &&
									!isUploading &&
									"👁️ Camera is monitoring for movement"}
								{isRecording && "🎥 Recording in progress..."}
								{isUploading && "📤 Uploading and analyzing..."}
							</p>
							<p className="text-white/60 text-xs">
								{isMonitoring &&
									!isRecording &&
									!isUploading &&
									"Move your hand near the cabinet to start recording"}
								{isRecording && "Keep the item visible in the frame"}
								{isUploading && "Please wait while we analyze the video"}
							</p>
						</div>
					</div>
				)}

				{/* Hidden canvas for motion detection */}
				<canvas ref={canvasRef} className="hidden" />
			</div>
		</div>
	);
}

export default CameraView;
