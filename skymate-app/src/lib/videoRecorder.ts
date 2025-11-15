/**
 * Video Recorder Class
 * Records video from MediaStream for specified duration
 */

export interface RecordingOptions {
  duration: number; // Duration in seconds
  mimeType?: string; // Video MIME type (default: auto-detect)
  videoBitsPerSecond?: number; // Video bitrate
}

export interface RecordingResult {
  blob: Blob;
  duration: number; // Actual duration in seconds
  size: number; // Size in bytes
  mimeType: string;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: number | null = null;
  private startTime: number = 0;

  /**
   * Start recording video from stream
   * @param stream - MediaStream from camera
   * @param options - Recording options
   * @returns Promise that resolves with recorded video blob
   */
  async startRecording(
    stream: MediaStream,
    options: RecordingOptions
  ): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      try {
        this.recordedChunks = [];
        this.startTime = Date.now();

        // Determine best MIME type
        const mimeType = options.mimeType || this.getBestMimeType();
        
        console.log(`🎥 Starting video recording (${options.duration}s, ${mimeType})`);

        // Create MediaRecorder
        const recorderOptions: MediaRecorderOptions = {
          mimeType,
        };

        if (options.videoBitsPerSecond) {
          recorderOptions.videoBitsPerSecond = options.videoBitsPerSecond;
        }

        this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

        // Handle data available event
        this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
            console.log(`📦 Chunk received: ${(event.data.size / 1024).toFixed(2)} KB`);
          }
        };

        // Handle recording stop
        this.mediaRecorder.onstop = () => {
          const duration = (Date.now() - this.startTime) / 1000;
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const size = blob.size;

          console.log(`✅ Recording stopped: ${duration.toFixed(2)}s, ${(size / 1024).toFixed(2)} KB`);

          resolve({
            blob,
            duration,
            size,
            mimeType,
          });

          this.cleanup();
        };

        // Handle errors
        this.mediaRecorder.onerror = (event: Event) => {
          console.error('❌ MediaRecorder error:', event);
          reject(new Error('Recording failed'));
          this.cleanup();
        };

        // Start recording
        this.mediaRecorder.start(100); // Collect data every 100ms
        console.log('🔴 Recording started');

        // Auto-stop after duration
        this.recordingTimer = window.setTimeout(() => {
          this.stopRecording();
        }, options.duration * 1000);

      } catch (error) {
        console.error('❌ Error starting recording:', error);
        reject(error);
        this.cleanup();
      }
    });
  }

  /**
   * Stop recording manually (before duration expires)
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('⏹️ Stopping recording...');
      this.mediaRecorder.stop();
    }

    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Get best supported MIME type for video recording
   */
  private getBestMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`✅ Using MIME type: ${type}`);
        return type;
      }
    }

    console.warn('⚠️ No preferred MIME type supported, using default');
    return 'video/webm';
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  /**
   * Check if recording is in progress
   */
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Get current recording duration in seconds
   */
  getCurrentDuration(): number {
    if (!this.isRecording()) return 0;
    return (Date.now() - this.startTime) / 1000;
  }
}

/**
 * Helper function to create video file from blob
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

/**
 * Helper function to create object URL for preview
 */
export function createVideoPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Helper function to revoke object URL
 */
export function revokeVideoPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

