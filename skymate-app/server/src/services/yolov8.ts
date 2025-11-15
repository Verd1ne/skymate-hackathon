import * as ort from 'onnxruntime-node';
import { preprocessImage, PreprocessedImage } from '../utils/imageProcessing';
import path from 'path';

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
  class: number;
  className?: string;
}

// COCO dataset class names (YOLOv8 default)
const CLASS_NAMES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

class YOLOv8Service {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;
  private isInitialized = false;
  private modelSize = 640;

  constructor() {
    // Path relative to the compiled dist folder
    this.modelPath = path.join(__dirname, '../../models/yolov8s.onnx');
  }

  /**
   * Initialize the ONNX model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ YOLOv8 already initialized');
      return;
    }

    try {
      console.log(`🔄 Loading YOLOv8 model from: ${this.modelPath}`);

      // Create inference session with optimal settings
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cuda', 'cpu'], // Try GPU first, fallback to CPU
        graphOptimizationLevel: 'all',
        executionMode: 'sequential',
        logSeverityLevel: 3, // Only errors
      });

      this.isInitialized = true;
      console.log('✅ YOLOv8 model loaded successfully');
      console.log(`   Model input shape: [1, 3, ${this.modelSize}, ${this.modelSize}]`);
    } catch (error: any) {
      console.error('❌ Failed to initialize YOLOv8:', error.message);
      throw new Error(`Failed to load YOLOv8 model: ${error.message}`);
    }
  }

  /**
   * Detect objects in an image
   */
  async detectObjects(
    imageBuffer: Buffer,
    confThreshold: number = 0.25,
    iouThreshold: number = 0.45
  ): Promise<Detection[]> {
    if (!this.session || !this.isInitialized) {
      throw new Error('YOLOv8 model not initialized. Call initialize() first.');
    }

    try {
      // Preprocess image
      const preprocessed = await preprocessImage(imageBuffer, this.modelSize);

      // Create input tensor
      const tensor = new ort.Tensor('float32', preprocessed.data, [1, 3, this.modelSize, this.modelSize]);

      // Run inference
      const startTime = Date.now();
      const results = await this.session.run({ images: tensor });
      const inferenceTime = Date.now() - startTime;

      console.log(`⚡ Inference completed in ${inferenceTime}ms`);

      // Parse detections from model output
      const detections = this.parseDetections(
        results.output0.data as Float32Array,
        preprocessed,
        confThreshold,
        iouThreshold
      );

      console.log(`🎯 Found ${detections.length} detections`);
      return detections;
    } catch (error: any) {
      console.error('❌ Detection failed:', error.message);
      throw new Error(`Object detection failed: ${error.message}`);
    }
  }

  /**
   * Parse YOLOv8 output tensor into detections
   */
  private parseDetections(
    output: Float32Array,
    preprocessed: PreprocessedImage,
    confThreshold: number,
    iouThreshold: number
  ): Detection[] {
    // YOLOv8 output shape: [1, 84, 8400]
    // 84 = 4 bbox coords + 80 class scores
    // 8400 = predictions across different scales

    const numClasses = 80;
    const numPredictions = 8400;
    const detections: Detection[] = [];

    // Extract detections above confidence threshold
    for (let i = 0; i < numPredictions; i++) {
      // Get bbox coordinates (center_x, center_y, width, height)
      const cx = output[i];
      const cy = output[numPredictions + i];
      const w = output[2 * numPredictions + i];
      const h = output[3 * numPredictions + i];

      // Find best class and score
      let maxScore = 0;
      let maxClass = 0;
      for (let c = 0; c < numClasses; c++) {
        const score = output[(4 + c) * numPredictions + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      // Filter by confidence threshold
      if (maxScore < confThreshold) continue;

      // Convert from center coordinates to corner coordinates
      const x = cx - w / 2;
      const y = cy - h / 2;

      // Scale coordinates back to original image size
      const scaleX = preprocessed.originalWidth / preprocessed.modelWidth;
      const scaleY = preprocessed.originalHeight / preprocessed.modelHeight;

      detections.push({
        bbox: [x * scaleX, y * scaleY, w * scaleX, h * scaleY],
        score: maxScore,
        class: maxClass,
        className: CLASS_NAMES[maxClass] || `class_${maxClass}`,
      });
    }

    // Apply Non-Maximum Suppression (NMS)
    const nmsDetections = this.applyNMS(detections, iouThreshold);
    return nmsDetections;
  }

  /**
   * Apply Non-Maximum Suppression to remove overlapping detections
   */
  private applyNMS(detections: Detection[], iouThreshold: number): Detection[] {
    // Sort by confidence score (descending)
    const sorted = detections.sort((a, b) => b.score - a.score);
    const keep: Detection[] = [];

    while (sorted.length > 0) {
      const current = sorted.shift()!;
      keep.push(current);

      // Remove detections with high IoU overlap
      const remaining: Detection[] = [];
      for (const detection of sorted) {
        const iou = this.calculateIoU(current.bbox, detection.bbox);
        if (iou < iouThreshold || current.class !== detection.class) {
          remaining.push(detection);
        }
      }

      sorted.length = 0;
      sorted.push(...remaining);
    }

    return keep;
  }

  /**
   * Calculate Intersection over Union (IoU) between two bounding boxes
   */
  private calculateIoU(box1: number[], box2: number[]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    const x1_max = x1 + w1;
    const y1_max = y1 + h1;
    const x2_max = x2 + w2;
    const y2_max = y2 + h2;

    const intersect_x1 = Math.max(x1, x2);
    const intersect_y1 = Math.max(y1, y2);
    const intersect_x2 = Math.min(x1_max, x2_max);
    const intersect_y2 = Math.min(y1_max, y2_max);

    const intersect_w = Math.max(0, intersect_x2 - intersect_x1);
    const intersect_h = Math.max(0, intersect_y2 - intersect_y1);

    const intersect_area = intersect_w * intersect_h;
    const box1_area = w1 * h1;
    const box2_area = w2 * h2;
    const union_area = box1_area + box2_area - intersect_area;

    return intersect_area / union_area;
  }
}

// Export singleton instance
export default new YOLOv8Service();

