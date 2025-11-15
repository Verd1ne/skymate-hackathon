/**
 * Video Analysis Routes
 * Handles video upload and motion analysis endpoints
 */

import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload.middleware';
import { uploadVideoToGCS, deleteVideoFromGCS, deleteLocalVideo } from '../services/storage.service';
import { analyzeVideoForMotion } from '../services/videoIntelligence.service';
import { classifySimpleMotion, classifyMotionByItemPresence } from '../services/simpleMotionAnalysis.service';
import { extractFrameFromVideo, identifyItemInImage, deleteFrame } from '../services/itemIdentification.service';
import { VideoAnalysisResult } from '../types/video.types';
import path from 'path';

const router = Router();

/**
 * POST /api/video/analyze
 * Simplified workflow: Upload video, detect action (take_out/put_in/none), identify item
 */
router.post('/analyze', upload.single('video'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  let gcsFilename: string | null = null;
  let localFilePath: string | null = null;
  let framePath: string | null = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No video file uploaded',
        message: 'Please provide a video file in the "video" field',
      });
    }

    console.log(`\n📹 New video analysis request: ${req.file.filename}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`   Type: ${req.file.mimetype}`);

    localFilePath = req.file.path;
    gcsFilename = req.file.filename;

    // Step 1: Upload to Google Cloud Storage
    console.log('\n🔄 Step 1: Uploading to GCS...');
    const gcsUri = await uploadVideoToGCS(localFilePath, gcsFilename);
    console.log(`✅ Uploaded: ${gcsUri}`);

    // Step 2: Analyze video with Video Intelligence API (for motion)
    console.log('\n🔄 Step 2: Analyzing motion with Video Intelligence API...');
    const detectedObjects = await analyzeVideoForMotion(gcsUri);
    console.log(`✅ Detected ${detectedObjects.length} objects`);

    // Step 3: Classify motion as take_out, put_in, or none
    console.log('\n🔄 Step 3: Classifying action...');
    const motionResult = classifySimpleMotion(detectedObjects);
    console.log(`✅ Action: ${motionResult.action} (${(motionResult.confidence * 100).toFixed(1)}%)`);
    console.log(`   Reasoning: ${motionResult.reasoning}`);

    // Step 4: Extract frame from video
    console.log('\n🔄 Step 4: Extracting frame from video...');
    framePath = await extractFrameFromVideo(localFilePath, 2.5); // Middle of 5s video
    console.log(`✅ Frame extracted: ${framePath}`);

    // Step 5: Identify item using Google Cloud Vision
    console.log('\n🔄 Step 5: Identifying item with Vision API...');
    const itemResult = await identifyItemInImage(framePath);
    console.log(`✅ Item: ${itemResult.item} (${(itemResult.confidence * 100).toFixed(1)}%)`);

    const processingTime = Date.now() - startTime;

    // Build response
    const result: VideoAnalysisResult = {
      action: motionResult.action,
      item: itemResult.item,
      confidence: Math.min(motionResult.confidence, itemResult.confidence), // Use lower confidence
      processingTime,
    };

    console.log(`\n✅ Analysis complete in ${processingTime}ms`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Item: ${result.item}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);

    // Cleanup: Delete from GCS, local storage, and frame
    console.log('🧹 Cleaning up...');
    await Promise.all([
      deleteVideoFromGCS(gcsFilename),
      deleteLocalVideo(localFilePath),
      framePath ? deleteFrame(framePath) : Promise.resolve(),
    ]);
    console.log('✅ Cleanup complete\n');

    // Send response
    res.json(result);

  } catch (error: any) {
    console.error('\n❌ Error during video analysis:', error);

    // Cleanup on error
    if (gcsFilename) {
      try {
        await deleteVideoFromGCS(gcsFilename);
      } catch (cleanupError) {
        console.error('Error during GCS cleanup:', cleanupError);
      }
    }
    
    if (localFilePath) {
      try {
        await deleteLocalVideo(localFilePath);
      } catch (cleanupError) {
        console.error('Error during local cleanup:', cleanupError);
      }
    }

    if (framePath) {
      try {
        await deleteFrame(framePath);
      } catch (cleanupError) {
        console.error('Error during frame cleanup:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Video analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/video/test-upload
 * Test endpoint to verify video upload without analysis
 */
router.post('/test-upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No video file uploaded',
      });
    }

    console.log('📹 Test upload received:', req.file.filename);

    // Upload to GCS
    const gcsUri = await uploadVideoToGCS(req.file.path, req.file.filename);

    // Cleanup local file
    await deleteLocalVideo(req.file.path);

    res.json({
      message: 'Video uploaded successfully',
      filename: req.file.filename,
      gcsUri,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

  } catch (error: any) {
    console.error('❌ Test upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/video/health
 * Check if video services are accessible
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Could add checks for GCS and Video Intelligence API here
    res.json({
      status: 'ok',
      services: {
        storage: 'available',
        videoIntelligence: 'available',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

export default router;

