import express, { Request, Response } from 'express';
import multer from 'multer';
import yolov8Service from '../services/yolov8';

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/detect
 * Detect objects in a single image
 */
router.post('/detect', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Get optional parameters from query string
    const confThreshold = parseFloat(req.query.confThreshold as string) || 0.25;
    const iouThreshold = parseFloat(req.query.iouThreshold as string) || 0.45;

    console.log(`📸 Processing image (${req.file.size} bytes, conf: ${confThreshold})`);

    // Run object detection
    const startTime = Date.now();
    const detections = await yolov8Service.detectObjects(
      req.file.buffer,
      confThreshold,
      iouThreshold
    );
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      detections,
      metadata: {
        processingTime,
        imageSize: req.file.size,
        detectionCount: detections.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Detection endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Object detection failed',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;

