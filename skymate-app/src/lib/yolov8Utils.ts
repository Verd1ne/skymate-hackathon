/**
 * YOLOv8 Utility Functions
 * 
 * Preprocessing, postprocessing, NMS (Non-Maximum Suppression),
 * and helper functions for YOLOv8 object detection
 */

export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
  class: number;
  className?: string;
}

export interface PreprocessedImage {
  data: Float32Array;
  originalWidth: number;
  originalHeight: number;
  modelWidth: number;
  modelHeight: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Preprocess image for YOLOv8 inference
 * Resizes to 640x640, normalizes pixel values to 0-1, and converts to CHW format
 * 
 * @param imageData - ImageData from canvas
 * @param modelSize - Model input size (default 640)
 * @returns Preprocessed image tensor and metadata
 */
export function preprocessImage(
  imageData: ImageData,
  modelSize: number = 640
): PreprocessedImage {
  const { width: originalWidth, height: originalHeight } = imageData;
  
  // Calculate scale to maintain aspect ratio
  const scale = Math.min(modelSize / originalWidth, modelSize / originalHeight);
  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);
  
  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = modelSize;
  canvas.height = modelSize;
  const ctx = canvas.getContext('2d')!;
  
  // Fill with gray background (0.5 normalized)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, modelSize, modelSize);
  
  // Draw resized image centered
  const offsetX = (modelSize - scaledWidth) / 2;
  const offsetY = (modelSize - scaledHeight) / 2;
  
  // Create temporary canvas with original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Draw resized
  ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, offsetX, offsetY, scaledWidth, scaledHeight);
  
  // Get pixel data
  const resizedImageData = ctx.getImageData(0, 0, modelSize, modelSize);
  const pixels = resizedImageData.data;
  
  // Convert to CHW format (3, 640, 640) and normalize to 0-1
  const data = new Float32Array(3 * modelSize * modelSize);
  
  for (let i = 0; i < pixels.length; i += 4) {
    const pixelIndex = i / 4;
    const y = Math.floor(pixelIndex / modelSize);
    const x = pixelIndex % modelSize;
    
    // RGB values normalized to 0-1
    const r = pixels[i] / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;
    
    // CHW format: [C, H, W]
    data[0 * modelSize * modelSize + y * modelSize + x] = r; // R channel
    data[1 * modelSize * modelSize + y * modelSize + x] = g; // G channel
    data[2 * modelSize * modelSize + y * modelSize + x] = b; // B channel
  }
  
  return {
    data,
    originalWidth,
    originalHeight,
    modelWidth: modelSize,
    modelHeight: modelSize,
    scaleX: scale,
    scaleY: scale,
  };
}

/**
 * Non-Maximum Suppression
 * Filters overlapping boxes keeping only the best detections
 * 
 * @param detections - Array of detections
 * @param iouThreshold - IoU threshold for NMS (default 0.45)
 * @returns Filtered detections
 */
export function nonMaximumSuppression(
  detections: Detection[],
  iouThreshold: number = 0.45
): Detection[] {
  // Sort by confidence score descending
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  
  const selected: Detection[] = [];
  
  for (const detection of sorted) {
    let shouldKeep = true;
    
    for (const selectedDetection of selected) {
      // Only compare detections of the same class
      if (detection.class === selectedDetection.class) {
        const iou = calculateIoU(detection.bbox, selectedDetection.bbox);
        
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }
    }
    
    if (shouldKeep) {
      selected.push(detection);
    }
  }
  
  return selected;
}

/**
 * Calculate Intersection over Union (IoU) between two boxes
 * 
 * @param box1 - [x, y, width, height]
 * @param box2 - [x, y, width, height]
 * @returns IoU value (0-1)
 */
export function calculateIoU(
  box1: [number, number, number, number],
  box2: [number, number, number, number]
): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  
  // Convert to [x1, y1, x2, y2] format
  const box1_x2 = x1 + w1;
  const box1_y2 = y1 + h1;
  const box2_x2 = x2 + w2;
  const box2_y2 = y2 + h2;
  
  // Calculate intersection area
  const intersectX1 = Math.max(x1, x2);
  const intersectY1 = Math.max(y1, y2);
  const intersectX2 = Math.min(box1_x2, box2_x2);
  const intersectY2 = Math.min(box1_y2, box2_y2);
  
  const intersectWidth = Math.max(0, intersectX2 - intersectX1);
  const intersectHeight = Math.max(0, intersectY2 - intersectY1);
  const intersectArea = intersectWidth * intersectHeight;
  
  // Calculate union area
  const box1Area = w1 * h1;
  const box2Area = w2 * h2;
  const unionArea = box1Area + box2Area - intersectArea;
  
  // Calculate IoU
  return intersectArea / unionArea;
}

/**
 * Parse YOLOv8 output tensor to detections
 * YOLOv8 output format: [1, 84, 8400]
 * - 84 = 4 (bbox coords) + 80 (COCO classes)
 * - 8400 = anchor points (80x80 + 40x40 + 20x20)
 * 
 * @param output - Model output tensor
 * @param confThreshold - Confidence threshold (default 0.25)
 * @param preprocessed - Preprocessing metadata
 * @param classNames - Array of class names (COCO classes)
 * @returns Array of detections
 */
export function parseYolov8Output(
  output: Float32Array,
  confThreshold: number,
  preprocessed: PreprocessedImage,
  classNames: string[]
): Detection[] {
  const detections: Detection[] = [];
  const numClasses = 80; // COCO dataset
  const numBoxes = 8400;
  
  // Output shape: [1, 84, 8400]
  // We need to transpose to [8400, 84]
  for (let i = 0; i < numBoxes; i++) {
    // Get box coordinates (x, y, w, h)
    const x = output[i];
    const y = output[numBoxes + i];
    const w = output[2 * numBoxes + i];
    const h = output[3 * numBoxes + i];
    
    // Get class scores (80 classes starting at index 4 * numBoxes)
    let maxScore = 0;
    let maxClass = 0;
    
    for (let c = 0; c < numClasses; c++) {
      const score = output[(4 + c) * numBoxes + i];
      if (score > maxScore) {
        maxScore = score;
        maxClass = c;
      }
    }
    
    // Filter by confidence threshold
    if (maxScore > confThreshold) {
      // Convert from center coordinates to top-left coordinates
      // and scale back to original image size
      const bbox: [number, number, number, number] = [
        (x - w / 2) * preprocessed.originalWidth / preprocessed.modelWidth,
        (y - h / 2) * preprocessed.originalHeight / preprocessed.modelHeight,
        w * preprocessed.originalWidth / preprocessed.modelWidth,
        h * preprocessed.originalHeight / preprocessed.modelHeight,
      ];
      
      detections.push({
        bbox,
        score: maxScore,
        class: maxClass,
        className: classNames[maxClass] || `class_${maxClass}`,
      });
    }
  }
  
  return detections;
}

/**
 * COCO class names for YOLOv8
 */
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

/**
 * Map detected COCO classes to inventory categories
 * @param className - COCO class name
 * @returns Inventory category
 */
export function mapCocoToInventoryCategory(className: string): string {
  const lowerClassName = className.toLowerCase();
  
  // Beverages & bottles
  if (lowerClassName.includes('bottle') || lowerClassName.includes('cup') || lowerClassName.includes('wine glass')) {
    return 'bottle';
  }
  
  // Food items
  if (lowerClassName.includes('food') || lowerClassName.includes('sandwich') || 
      lowerClassName.includes('pizza') || lowerClassName.includes('hot dog') ||
      lowerClassName.includes('donut') || lowerClassName.includes('cake') ||
      lowerClassName.includes('banana') || lowerClassName.includes('apple') ||
      lowerClassName.includes('orange') || lowerClassName.includes('bowl')) {
    return 'food';
  }
  
  // Headphones (not in COCO, but we'll handle it separately)
  if (lowerClassName.includes('headphone') || lowerClassName.includes('earphone')) {
    return 'headphone';
  }
  
  // Default to food for unknown
  return 'food';
}

/**
 * Convert ImageData to Canvas for easier manipulation
 */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Draw detections on canvas for visualization
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: Detection[],
  colors?: string[]
): void {
  const ctx = canvas.getContext('2d')!;
  
  detections.forEach((detection, index) => {
    const [x, y, w, h] = detection.bbox;
    const color = colors ? colors[index % colors.length] : '#00ff00';
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    
    // Draw label background
    const label = `${detection.className} ${(detection.score * 100).toFixed(1)}%`;
    ctx.font = '14px Arial';
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y - textHeight, textMetrics.width + 8, textHeight);
    
    // Draw label text
    ctx.fillStyle = '#000000';
    ctx.fillText(label, x + 4, y - 6);
  });
}

