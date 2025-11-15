/**
 * Video Intelligence API Types
 */

export interface VideoAnalysisRequest {
  videoFile: Express.Multer.File;
}

export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface VideoFrame {
  timeOffset: string; // e.g., "0.5s", "1.2s"
  boundingBox: BoundingBox;
}

export interface DetectedObject {
  entity: string; // e.g., "Hand", "Bottle", "Container"
  confidence: number; // 0-1
  segment: {
    startTime: string;
    endTime: string;
  };
  frames: VideoFrame[];
}

export interface MotionDirection {
  direction: 'in' | 'out' | 'unknown';
  confidence: number; // 0-1
  reasoning: string; // Explanation of why this direction was chosen
}

export interface VideoAnalysisResult {
  action: 'take_out' | 'put_in' | 'none';
  item: string;
  confidence: number;
  processingTime: number; // milliseconds
}

export interface VideoIntelligenceAnnotation {
  entity: {
    entityId: string;
    description: string;
    languageCode: string;
  };
  categoryEntities: Array<{
    entityId: string;
    description: string;
    languageCode: string;
  }>;
  segment: {
    startTimeOffset: {
      seconds: string | number;
      nanos: number;
    };
    endTimeOffset: {
      seconds: string | number;
      nanos: number;
    };
  };
  confidence: number;
  frames: Array<{
    normalizedBoundingBox: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    timeOffset: {
      seconds: string | number;
      nanos: number;
    };
  }>;
  version: string;
}

