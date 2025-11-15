/**
 * Post-Event Analyzer
 * 
 * Analyzes recorded frame sequences to classify actions:
 * - take_out: Object disappears (was visible at start, not at end)
 * - put_in: Object appears (not visible at start, visible at end)
 * - idle: No significant change
 */

import yolov8Service from './yolov8Service';
import type { Detection } from './yolov8Utils';
import type { CapturedFrame } from './frameBuffer';
import { MOTION_CONFIG } from './motionConfig';

export type ActionType = 'take_out' | 'put_in' | 'idle';

export interface ActionResult {
  action: ActionType;
  item: string | null;
  confidence: number;
  description: string;
}

export interface FrameDetections {
  frameIndex: number;
  timestamp: number;
  detections: Detection[];
}

/**
 * Analyze a sequence of frames to determine what action occurred
 */
export async function analyzeFrameSequence(
  frames: CapturedFrame[]
): Promise<ActionResult> {
  if (frames.length < MOTION_CONFIG.startFrames + MOTION_CONFIG.endFrames) {
    console.warn(`Not enough frames to analyze (need at least ${MOTION_CONFIG.startFrames + MOTION_CONFIG.endFrames}, got ${frames.length})`);
    return {
      action: 'idle',
      item: null,
      confidence: 0,
      description: 'Insufficient frames for analysis',
    };
  }

  console.log(`📊 Analyzing ${frames.length} frames...`);
  const startTime = Date.now();

  // Step 1: Run YOLOv8 detection on all frames
  const allDetections = await detectObjectsInFrames(frames);
  
  // Step 2: Compare start and end frames
  const startDetections = allDetections.slice(0, MOTION_CONFIG.startFrames);
  const endDetections = allDetections.slice(-MOTION_CONFIG.endFrames);
  
  // Step 3: Average detections in start and end periods
  const startObjects = averageDetections(startDetections);
  const endObjects = averageDetections(endDetections);
  
  console.log(`📋 Start objects: ${startObjects.length}, End objects: ${endObjects.length}`);
  
  // Step 4: Classify the action
  const result = classifyAction(startObjects, endObjects);
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Analysis complete in ${totalTime}ms: ${result.action} (${result.item || 'none'})`);
  
  return result;
}

/**
 * Run YOLO detection on all frames
 */
async function detectObjectsInFrames(
  frames: CapturedFrame[]
): Promise<FrameDetections[]> {
  console.log(`🔍 Running YOLO detection on ${frames.length} frames...`);
  
  const allDetections: FrameDetections[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      const result = await yolov8Service.detectObjects(
        frame.imageData,
        MOTION_CONFIG.confidenceThreshold,
        MOTION_CONFIG.iouThreshold
      );
      
      allDetections.push({
        frameIndex: frame.index,
        timestamp: frame.timestamp,
        detections: result.detections,
      });
      
      if (i % 5 === 0) {
        console.log(`  Progress: ${i + 1}/${frames.length} frames (${((i + 1) / frames.length * 100).toFixed(0)}%)`);
      }
    } catch (error) {
      console.error(`Failed to process frame ${i}:`, error);
      allDetections.push({
        frameIndex: frame.index,
        timestamp: frame.timestamp,
        detections: [],
      });
    }
  }
  
  console.log(`✅ YOLO detection complete on all frames`);
  return allDetections;
}

/**
 * Average detections from multiple frames
 * Groups objects by class and averages their properties
 */
function averageDetections(frameDetections: FrameDetections[]): Detection[] {
  if (frameDetections.length === 0) return [];
  
  // Collect all detections
  const allDetections = frameDetections.flatMap(fd => fd.detections);
  
  // Group by class name
  const grouped = new Map<string, Detection[]>();
  
  for (const detection of allDetections) {
    const className = detection.className || 'unknown';
    if (!grouped.has(className)) {
      grouped.set(className, []);
    }
    grouped.get(className)!.push(detection);
  }
  
  // Average each group
  const averaged: Detection[] = [];
  
  for (const [className, detections] of grouped.entries()) {
    // Average bbox coordinates
    const avgBbox: [number, number, number, number] = [
      detections.reduce((sum, d) => sum + d.bbox[0], 0) / detections.length,
      detections.reduce((sum, d) => sum + d.bbox[1], 0) / detections.length,
      detections.reduce((sum, d) => sum + d.bbox[2], 0) / detections.length,
      detections.reduce((sum, d) => sum + d.bbox[3], 0) / detections.length,
    ];
    
    // Average confidence
    const avgScore = detections.reduce((sum, d) => sum + d.score, 0) / detections.length;
    
    averaged.push({
      bbox: avgBbox,
      score: avgScore,
      class: detections[0].class,
      className,
    });
  }
  
  return averaged;
}

/**
 * Classify action by comparing start and end objects
 */
function classifyAction(
  startObjects: Detection[],
  endObjects: Detection[]
): ActionResult {
  // Find objects that disappeared (take_out)
  const disappeared = findDisappearedObjects(startObjects, endObjects);
  
  // Find objects that appeared (put_in)
  const appeared = findAppearedObjects(startObjects, endObjects);
  
  console.log(`  Disappeared: ${disappeared.length}, Appeared: ${appeared.length}`);
  
  // Prioritize take_out over put_in (more common in inventory scenarios)
  if (disappeared.length > 0) {
    const item = disappeared[0];
    return {
      action: 'take_out',
      item: item.className || 'unknown item',
      confidence: item.score,
      description: `${item.className} taken out of cabinet`,
    };
  }
  
  if (appeared.length > 0) {
    const item = appeared[0];
    return {
      action: 'put_in',
      item: item.className || 'unknown item',
      confidence: item.score,
      description: `${item.className} put into cabinet`,
    };
  }
  
  // No significant change
  return {
    action: 'idle',
    item: null,
    confidence: 0.5,
    description: 'No significant change detected',
  };
}

/**
 * Find objects that were in start but not in end
 */
function findDisappearedObjects(
  startObjects: Detection[],
  endObjects: Detection[]
): Detection[] {
  return startObjects.filter(startObj => {
    // Check if this object exists in end
    const existsInEnd = endObjects.some(endObj => 
      endObj.className === startObj.className &&
      isSimilarPosition(startObj.bbox, endObj.bbox)
    );
    return !existsInEnd;
  });
}

/**
 * Find objects that were not in start but are in end
 */
function findAppearedObjects(
  startObjects: Detection[],
  endObjects: Detection[]
): Detection[] {
  return endObjects.filter(endObj => {
    // Check if this object exists in start
    const existsInStart = startObjects.some(startObj => 
      startObj.className === endObj.className &&
      isSimilarPosition(startObj.bbox, endObj.bbox)
    );
    return !existsInStart;
  });
}

/**
 * Check if two bounding boxes are in similar positions
 * (within tolerance to account for minor camera movement)
 */
function isSimilarPosition(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  const tolerance = MOTION_CONFIG.positionTolerancePx;
  
  // Calculate centers
  const center1X = bbox1[0] + bbox1[2] / 2;
  const center1Y = bbox1[1] + bbox1[3] / 2;
  const center2X = bbox2[0] + bbox2[2] / 2;
  const center2Y = bbox2[1] + bbox2[3] / 2;
  
  // Calculate distance
  const distance = Math.sqrt(
    Math.pow(center1X - center2X, 2) + 
    Math.pow(center1Y - center2Y, 2)
  );
  
  return distance <= tolerance;
}

/**
 * Get a summary of all detections in a frame sequence
 */
export function getDetectionSummary(frameDetections: FrameDetections[]): {
  totalFrames: number;
  uniqueObjects: Set<string>;
  objectCounts: Map<string, number>;
} {
  const uniqueObjects = new Set<string>();
  const objectCounts = new Map<string, number>();
  
  for (const fd of frameDetections) {
    for (const detection of fd.detections) {
      const className = detection.className || 'unknown';
      uniqueObjects.add(className);
      objectCounts.set(className, (objectCounts.get(className) || 0) + 1);
    }
  }
  
  return {
    totalFrames: frameDetections.length,
    uniqueObjects,
    objectCounts,
  };
}

export default analyzeFrameSequence;

