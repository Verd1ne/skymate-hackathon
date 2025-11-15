/**
 * Video API Client
 * Communicates with backend video intelligence service
 */

export interface VideoAnalysisResponse {
  action: 'take_out' | 'put_in' | 'none';
  item: string;
  confidence: number;
  processingTime: number;
}

export interface VideoUploadOptions {
  onProgress?: (progress: number) => void; // 0-100
  timeout?: number; // milliseconds
  retries?: number;
}

/**
 * Get API base URL from environment
 */
function getApiBaseUrl(): string {
  return import.meta.env.VITE_VIDEO_API_URL || 'http://localhost:3001';
}

/**
 * Upload and analyze video
 * @param videoBlob - Video blob to upload
 * @param options - Upload options
 * @returns Analysis result
 */
export async function uploadAndAnalyzeVideo(
  videoBlob: Blob,
  options?: VideoUploadOptions
): Promise<VideoAnalysisResponse> {
  const apiUrl = `${getApiBaseUrl()}/api/video/analyze`;
  const timeout = options?.timeout ?? 60000; // 60 seconds default
  const retries = options?.retries ?? 1;

  console.log(`📤 Uploading video to ${apiUrl}`);
  console.log(`   Size: ${(videoBlob.size / 1024).toFixed(2)} KB`);
  console.log(`   Type: ${videoBlob.type}`);

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt}/${retries}`);
      }

      const result = await uploadWithTimeout(apiUrl, videoBlob, timeout, options?.onProgress);
      
      console.log(`✅ Video analysis complete`);
      console.log(`   Action: ${result.action}`);
      console.log(`   Item: ${result.item}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Processing time: ${result.processingTime}ms`);

      return result;

    } catch (error: any) {
      lastError = error;
      console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw new Error(`Video upload failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Upload video with timeout
 */
async function uploadWithTimeout(
  url: string,
  videoBlob: Blob,
  timeout: number,
  onProgress?: (progress: number) => void
): Promise<VideoAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timeoutId: number;

    // Setup timeout
    timeoutId = window.setTimeout(() => {
      xhr.abort();
      reject(new Error('Upload timeout'));
    }, timeout);

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(Math.min(progress, 99)); // Reserve 100% for completion
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.message || `Server error: ${xhr.status}`));
        } catch {
          reject(new Error(`Server error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId);
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Upload aborted'));
    });

    // Prepare form data
    const formData = new FormData();
    formData.append('video', videoBlob, `video_${Date.now()}.webm`);

    // Send request
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * Test backend connectivity
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    const apiUrl = `${getApiBaseUrl()}/health`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend health check failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Backend connection OK:', data);
    return true;

  } catch (error: any) {
    console.error('❌ Backend connection failed:', error.message);
    return false;
  }
}

/**
 * Test video upload endpoint (without analysis)
 */
export async function testVideoUpload(videoBlob: Blob): Promise<boolean> {
  try {
    const apiUrl = `${getApiBaseUrl()}/api/video/test-upload`;
    const formData = new FormData();
    formData.append('video', videoBlob, 'test_video.webm');

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Test upload failed:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('✅ Test upload successful:', data);
    return true;

  } catch (error: any) {
    console.error('❌ Test upload error:', error.message);
    return false;
  }
}

/**
 * Get backend API URL (for display/debugging)
 */
export function getBackendUrl(): string {
  return getApiBaseUrl();
}

