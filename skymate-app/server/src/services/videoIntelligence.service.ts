/**
 * Google Cloud Video Intelligence API Service
 * Handles video analysis for object tracking and detection
 */

import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { google } from '@google-cloud/video-intelligence/build/protos/protos';
import { DetectedObject, VideoIntelligenceAnnotation } from '../types/video.types';

// Service account credentials (same as storage service)
const GOOGLE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "skymate-477913",
  "private_key_id": "62a198d63246141d66ea14b77ee7623b4fa862e4",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhUV2OHC1udaXL\nMwU2BE9ZFGE/gs8ONMDEvdvXF61NPxB8URZf/kT4aG7bzinMPHLsawf37CJlcUD2\nVMVk7z2DxOj8cw0PYwARhQT/7kXkhD1fIRiegOA2sTYYxRG8X1bcAZLi3+2yof3h\nYKOqFq6RyVEnrjtBsKcKs/Xm/qDb258tX2RJJAjFrZ/nTYehxEwShQnQShfxFPKy\n0mPmE6u8ue2ds9IXruipAxGDRFsEWLWXoRaqXVxOxwese5dhFDSuk7TRvniIMMQb\nCKw4KxLC8mhyUj+v7SO4Psv6mN1G6KTlrMjxE9TKzQmLMnH/DCvC/Yg9LEBSyC/Y\nPlh2L6+HAgMBAAECgf9VUj4bGb2h+FRXcNxqLqEKofhPfe35VQ+qJWgpOFWU6sUX\nISUbrQ9h8oREe68cAiJVgm5y+vgpj+aRJNP1KIT1nSKc0HvlV7X6N7AldlE9ZJnY\n1YJe+5uRktTLQSAq6ZUJup3ktQVNrqCS9AVgJvpsdoQmoKZmV8naYdK8PL7LNnwS\nnk26/Fu0/xUfnf09VqWxOcJrZurLBJGokGjoiiXhWQE8PHdOwvGQnLMgbHc0NJ1K\nI4FQji4Y0jMH+tu4WB0sXsPzUsi6BLdQOG9fSs2HZtOx4LPvnSMKD0upFOlBzR3D\nSAoPzEAG2IS5entQlyPr1pHXmqPP9H89ZBI9lwECgYEA9TYEBoK7Kho+mtJjP/pp\nXfw0+/ifx+1GFE0pVAYTKjn6hJ3HcSgpoaMktU1SEUV/9ik8mJ1PcI8flF0vhMRS\n82Pfo9kGFuAEQCDQHT6q28Z/0gslCilzzYtMeyqW0+ojM6T5daNe3VfvjZ6LUZ9U\nkFgMmdxGML3GQXJjGHs5SvkCgYEA6ztHa8Q/ULlBIQlvutQBIbvuFZ1MEG6K9hY9\nsoLGueCpgAD+4EavzF/lba1jNZpHNUTyjIsHzILpxlc2Tm8ELcAawJc+NWiKQlMW\nbUEOWrh9dCD3V+GZTK8RbnHO0XpExGxjYcauPYEO/uxZsExriAwV2SoSJaDLrWrQ\nBU2Q7n8CgYEAvnfYpJ4Dd+6u1l+5jEacdc6j8Vzr78XUe4x8H7IgTNqAR2avNqw1\nukIZD2Mh7hyICtN5KCp5PDtQElRXxs8gh8H6QzEeU8JqSs2yGiVFXjVPr/3MJZqR\nQwWCwOESC0WBVmo9Ay2FUHUvtFeEbEBQ1VYvY4wAUXf3eXq6kpeUpzECgYEA6M/3\nxQorXBquAiOTyIYRRLD6V7whz1WJBTxH/gh+5PMc70qM964eShlTOjTULvYtqeQ+\nZqkno9qhwyMH5aLssNcj4x8Ne9CmnjQbyzALI/DagXgrNXhbwFC44OWUuzDXJMzd\no6T/SHIWRGnp7poEB1dmvFNuOH2neFBx5/24BsMCgYEAuctOa4rFRUVUZ25iZrkY\nYltC5rNERvvJ9ZBu3Wr8m2pgcCUwTd+EkXGoWHcR/zdgqJI+Wp6BWuSxSKsMGn7n\ni/dCS4wViM9ZnzVEnjn5B7eq1J3wn08JtDsq5KN2UxmZ+KlRWK9sOdbQDCjPbzFg\nN+iCpf9ytE90o7Qk6xoenQA=\n-----END PRIVATE KEY-----\n",
  "client_email": "skymate-service@skymate-477913.iam.gserviceaccount.com",
  "client_id": "111574368221297915741",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/skymate-service%40skymate-477913.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Video Intelligence client
const videoClient = new VideoIntelligenceServiceClient({
  projectId: GOOGLE_CREDENTIALS.project_id,
  credentials: {
    client_email: GOOGLE_CREDENTIALS.client_email,
    private_key: GOOGLE_CREDENTIALS.private_key,
  },
});

/**
 * Convert time offset to seconds
 */
function timeOffsetToSeconds(timeOffset: any): number {
  if (!timeOffset) return 0;
  
  const seconds = typeof timeOffset.seconds === 'string' 
    ? parseInt(timeOffset.seconds, 10) 
    : timeOffset.seconds || 0;
  const nanos = timeOffset.nanos || 0;
  
  return seconds + (nanos / 1e9);
}

/**
 * Analyze video for object tracking using Video Intelligence API
 * @param gcsUri - GCS URI of video (gs://bucket-name/filename)
 * @returns Array of detected objects with tracking information
 */
export async function analyzeVideoForMotion(gcsUri: string): Promise<DetectedObject[]> {
  try {
    console.log(`🎥 Starting video analysis for: ${gcsUri}`);
    const startTime = Date.now();

    // Configure video analysis request
    const request = {
      inputUri: gcsUri,
      features: ['OBJECT_TRACKING' as const],
      // Optional: Configure object tracking
      videoContext: {
        objectTrackingConfig: {
          // Track specific objects relevant to our use case
          model: 'builtin/latest', // Use latest model
        },
      },
    };

    console.log('📤 Sending request to Video Intelligence API...');
    
    // Start async annotation operation
    const [operation] = await videoClient.annotateVideo(request);
    
    console.log('⏳ Waiting for video analysis to complete...');
    
    // Wait for operation to complete (can take 10-30 seconds for 5-second video)
    const [operationResult] = await operation.promise();
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Video analysis completed in ${processingTime}ms`);

    // Extract object annotations
    const annotations = operationResult.annotationResults?.[0];
    
    if (!annotations) {
      console.warn('⚠️ No annotation results found');
      return [];
    }

    const objectAnnotations = annotations.objectAnnotations || [];
    console.log(`📊 Found ${objectAnnotations.length} object annotations`);

    // Convert to our DetectedObject format
    const detectedObjects: DetectedObject[] = objectAnnotations.map((annotation: any) => {
      const entity = annotation.entity?.description || 'Unknown';
      const confidence = annotation.confidence || 0;
      
      // Extract segment timing
      const segment = {
        startTime: timeOffsetToSeconds(annotation.segment?.startTimeOffset) + 's',
        endTime: timeOffsetToSeconds(annotation.segment?.endTimeOffset) + 's',
      };

      // Extract frame-by-frame tracking
      const frames = (annotation.frames || []).map((frame: any) => {
        const box = frame.normalizedBoundingBox || {};
        return {
          timeOffset: timeOffsetToSeconds(frame.timeOffset) + 's',
          boundingBox: {
            left: box.left || 0,
            top: box.top || 0,
            right: box.right || 0,
            bottom: box.bottom || 0,
          },
        };
      });

      console.log(`  - ${entity} (confidence: ${(confidence * 100).toFixed(1)}%, frames: ${frames.length})`);

      return {
        entity,
        confidence,
        segment,
        frames,
      };
    });

    return detectedObjects;
  } catch (error: any) {
    console.error('❌ Error analyzing video:', error);
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

/**
 * Check if Video Intelligence API is accessible
 */
export async function checkVideoIntelligenceAccess(): Promise<boolean> {
  try {
    // Simple check - try to create a client
    const testClient = new VideoIntelligenceServiceClient({
      projectId: GOOGLE_CREDENTIALS.project_id,
      credentials: {
        client_email: GOOGLE_CREDENTIALS.client_email,
        private_key: GOOGLE_CREDENTIALS.private_key,
      },
    });
    
    console.log('✅ Video Intelligence API client initialized successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Error accessing Video Intelligence API:', error);
    return false;
  }
}

