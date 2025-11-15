export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
  class: number;
  className?: string;
}

export interface DetectionResponse {
  success: boolean;
  detections: Detection[];
  metadata?: {
    processingTime: number;
    imageSize: number;
    detectionCount: number;
  };
  error?: string;
}

class YOLOv8ApiClient {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Check if the backend server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Detect objects in an image
   */
  async detectObjects(
    imageData: ImageData,
    confThreshold: number = 0.25,
    iouThreshold: number = 0.45
  ): Promise<Detection[]> {
    try {
      // Convert ImageData to Blob
      const blob = await this.imageDataToBlob(imageData);

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      // Make request to backend
      const url = `${this.baseUrl}/detect?confThreshold=${confThreshold}&iouThreshold=${iouThreshold}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Detection failed: ${response.statusText}`);
      }

      const data: DetectionResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Detection failed');
      }

      console.log(`✅ Backend detection: ${data.detections.length} objects (${data.metadata?.processingTime}ms)`);
      return data.detections;
    } catch (error: any) {
      console.error('❌ API client error:', error);
      throw new Error(`Failed to detect objects: ${error.message}`);
    }
  }

  /**
   * Convert ImageData to Blob (JPEG format)
   */
  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Create a temporary canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Put image data on canvas
      ctx.putImageData(imageData, 0, 0);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/jpeg',
        0.95 // Quality
      );
    });
  }
}

// Export singleton instance
export default new YOLOv8ApiClient();

