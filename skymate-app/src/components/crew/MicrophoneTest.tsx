import { useState, useEffect, useRef } from "react";
import { Mic, CheckCircle, XCircle, Volume2, AlertCircle } from "lucide-react";

interface MicrophoneTestProps {
  onTestComplete?: (passed: boolean) => void;
}

export function MicrophoneTest({ onTestComplete }: MicrophoneTestProps) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const requestMicrophoneAccess = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermissionGranted(true);

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start monitoring audio levels
      monitorAudioLevel();

      return true;
    } catch (error: any) {
      setPermissionGranted(false);
      if (error.name === "NotAllowedError") {
        setErrorMessage(
          "Microphone permission denied. Please allow access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        setErrorMessage(
          "No microphone found. Please connect a microphone and try again."
        );
      } else {
        setErrorMessage(`Error accessing microphone: ${error.message}`);
      }
      return false;
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average level
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalized = average / 255; // Normalize to 0-1

      setAudioLevel(normalized);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const startRecording = async () => {
    if (!mediaStreamRef.current) {
      const success = await requestMicrophoneAccess();
      if (!success) return;
    }

    try {
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current!);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setRecordedAudio(audioBlob);
        setTestPassed(true);
        if (onTestComplete) {
          onTestComplete(true);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Stop after 3 seconds
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 3000);
    } catch (error: any) {
      setErrorMessage(`Failed to start recording: ${error.message}`);
    }
  };

  const playRecording = () => {
    if (!recordedAudio) return;

    const audioUrl = URL.createObjectURL(recordedAudio);
    const audio = new Audio(audioUrl);
    audio.play();

    // Clean up URL after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  };

  const getLevelColor = () => {
    if (audioLevel < 0.05) return "bg-gray-400";
    if (audioLevel < 0.15) return "bg-yellow-400";
    if (audioLevel < 0.4) return "bg-green-400";
    return "bg-green-500";
  };

  const getLevelBars = () => {
    const bars = 10;
    const activeBars = Math.ceil(audioLevel * bars);
    return Array.from({ length: bars }, (_, i) => i < activeBars);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <Mic className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-800">Microphone Test</h3>
        {testPassed && (
          <CheckCircle className="w-6 h-6 text-green-600 ml-auto" />
        )}
      </div>

      {/* Permission Status */}
      <div className="mb-4">
        {permissionGranted === null && (
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            <span>Click "Request Microphone Access" to begin</span>
          </div>
        )}
        {permissionGranted === true && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span>Microphone access granted</span>
          </div>
        )}
        {permissionGranted === false && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span>Microphone access denied</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Audio Level Visualization */}
      {permissionGranted && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Audio Level:</span>
          </div>
          <div className="flex gap-1 h-8 items-end">
            {getLevelBars().map((active, index) => (
              <div
                key={index}
                className={`flex-1 transition-all duration-100 rounded-t ${
                  active ? getLevelColor() : "bg-gray-200"
                }`}
                style={{
                  height: active ? `${((index + 1) / 10) * 100}%` : "10%",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {audioLevel < 0.05 && "No sound detected - try speaking"}
            {audioLevel >= 0.05 &&
              audioLevel < 0.15 &&
              "Very quiet - speak louder"}
            {audioLevel >= 0.15 &&
              audioLevel < 0.4 &&
              "Good level - keep talking"}
            {audioLevel >= 0.4 && "Excellent level!"}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {!permissionGranted && (
          <button
            onClick={requestMicrophoneAccess}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Request Microphone Access
          </button>
        )}

        {permissionGranted && !isRecording && !recordedAudio && (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Record Test (3 seconds)
          </button>
        )}

        {isRecording && (
          <button
            disabled
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 animate-pulse"
          >
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            Recording...
          </button>
        )}

        {recordedAudio && (
          <>
            <button
              onClick={playRecording}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              Play Recording
            </button>
            <button
              onClick={() => {
                setRecordedAudio(null);
                setTestPassed(false);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Test Again
            </button>
          </>
        )}
      </div>

      {/* Test Instructions */}
      <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 font-medium mb-1">
          Test Instructions:
        </p>
        <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
          <li>Click "Request Microphone Access" and allow permissions</li>
          <li>Speak normally and watch the audio level bars</li>
          <li>Click "Record Test" and say "Testing one two three"</li>
          <li>Play back the recording to verify audio quality</li>
          <li>Once satisfied, proceed to Skymate testing below</li>
        </ol>
      </div>

      {/* Success Message */}
      {testPassed && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            Microphone test passed! You're ready for the demo.
          </span>
        </div>
      )}
    </div>
  );
}
