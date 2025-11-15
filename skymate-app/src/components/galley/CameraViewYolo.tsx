/**
 * CameraView with Local YOLOv8
 * 
 * Simplified camera component that uses local YOLOv8 inference
 * instead of uploading videos to backend server
 */

import { useState, useRef, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle, Camera } from "lucide-react";
import yolov8Service from "../../lib/yolov8Service";
import { detectDoorNumber } from "../../lib/yolov8OCR";
// import { classifyItem } from "../../lib/vision-huggingface"; // TODO: Add item classification

interface ScanResult {
  action: "take_out" | "put_in" | "none";
  item: string;
  confidence: number;
  doorNumber?: number;
}

interface CameraViewProps {
  onClose: () => void;
  onScanComplete?: (result: ScanResult) => void;
}

function CameraViewYolo({ onClose, onScanComplete }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Initializing camera...");
  const [isProcessing, setIsProcessing] = useState(false);

  // Result state
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  /**
   * Initialize camera
   */
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        console.log('📷 Initializing camera...');
        
        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setStatus('Camera ready - Click "Scan" to capture');
        console.log('✅ Camera initialized');

        // Initialize YOLOv8 model in background
        yolov8Service.initialize().catch(err => {
          console.error('⚠️ YOLOv8 initialization warning:', err);
        });

      } catch (err: any) {
        console.error('❌ Camera initialization error:', err);
        if (mounted) {
          setError(`Failed to access camera: ${err.message}`);
          setStatus('Camera error');
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Capture current frame and run detection
   */
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas not available');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Capturing image...');

      // Capture frame
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      // Get ImageData
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Step 1: Detect door number
      setStatus('Detecting door number...');
      console.log('🚪 Detecting door number...');
      const doorResult = await detectDoorNumber(imageData);
      console.log(`✅ Door number: ${doorResult.doorNumber || 'not found'}`);

      // Step 2: Detect objects and classify
      setStatus('Detecting objects...');
      console.log('🔍 Running YOLOv8 detection...');
      const yoloResult = await yolov8Service.detectObjects(imageData, 0.3, 0.45);
      console.log(`✅ Found ${yoloResult.detections.length} objects`);

      // Step 3: Classify item (for now, use the largest detected object)
      let itemName = 'Unknown item';
      let confidence = 0.5;

      if (yoloResult.detections.length > 0) {
        // Find largest detection
        const largestDetection = yoloResult.detections.reduce((prev, current) => {
          const prevArea = prev.bbox[2] * prev.bbox[3];
          const currentArea = current.bbox[2] * current.bbox[3];
          return currentArea > prevArea ? current : prev;
        });

        itemName = largestDetection.className || 'Unknown item';
        confidence = largestDetection.score;
        console.log(`📦 Identified: ${itemName} (${(confidence * 100).toFixed(1)}%)`);
      }

      // For now, default to "take_out" action
      // In future, could use additional logic to determine action
      const action: "take_out" | "put_in" | "none" = "take_out";

      const scanResult: ScanResult = {
        action,
        item: itemName,
        confidence,
        doorNumber: doorResult.doorNumber || undefined,
      };

      setResult(scanResult);
      setShowResult(true);
      setStatus(`Detected: ${itemName}`);

      // Call completion callback
      if (onScanComplete) {
        onScanComplete(scanResult);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
      setStatus('Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <h2 className="text-xl font-bold">Scan Item</h2>
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
          
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay UI */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 border-4 border-green-500 border-dashed rounded-lg opacity-50"></div>
            </div>

            {/* Status */}
            <div className="absolute bottom-20 left-0 right-0 text-center">
              <div className="inline-block bg-black bg-opacity-75 px-6 py-3 rounded-lg">
                <p className="text-white text-lg">{status}</p>
                {isProcessing && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-sm text-gray-300">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Result Display */}
            {showResult && result && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-8 py-6 rounded-lg shadow-lg flex items-center gap-4">
                <CheckCircle size={48} />
                <div>
                  <p className="text-2xl font-bold">{result.item}</p>
                  <p className="text-sm opacity-90">
                    {(result.confidence * 100).toFixed(1)}% confidence
                  </p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-lg shadow-lg flex items-center gap-4">
                <AlertCircle size={48} />
                <div>
                  <p className="text-xl font-bold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 p-6 flex items-center justify-center gap-4">
          <button
            onClick={captureAndAnalyze}
            disabled={isProcessing || !stream}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-bold transition-colors flex items-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Processing...
              </>
            ) : (
              <>
                <Camera size={24} />
                Scan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraViewYolo;

