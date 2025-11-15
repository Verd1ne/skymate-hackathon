/**
 * Motion Analysis Service
 * Classifies hand motion direction based on Video Intelligence object tracking data
 */

import { DetectedObject, MotionDirection } from '../types/video.types';

/**
 * Keywords for identifying hand/arm objects
 */
const HAND_KEYWORDS = ['hand', 'arm', 'finger', 'person', 'human'];

/**
 * Keywords for identifying item objects
 */
const ITEM_KEYWORDS = [
  'bottle', 'container', 'package', 'box', 'food', 'drink',
  'can', 'cup', 'glass', 'bag', 'product', 'object',
  'towel', 'cloth', 'fabric', 'wine', 'beverage'
];

/**
 * Check if object entity matches any keywords
 */
function matchesKeywords(entity: string, keywords: string[]): boolean {
  const lowerEntity = entity.toLowerCase();
  return keywords.some(keyword => lowerEntity.includes(keyword));
}

/**
 * Calculate average Y position for a subset of frames
 */
function calculateAverageY(frames: any[], startPercent: number, endPercent: number): number {
  const totalFrames = frames.length;
  const startIdx = Math.floor(totalFrames * startPercent);
  const endIdx = Math.ceil(totalFrames * endPercent);
  
  const relevantFrames = frames.slice(startIdx, endIdx);
  
  if (relevantFrames.length === 0) return 0.5;
  
  const sum = relevantFrames.reduce((acc, frame) => {
    const box = frame.boundingBox;
    // Use center Y position of bounding box
    const centerY = (box.top + box.bottom) / 2;
    return acc + centerY;
  }, 0);
  
  return sum / relevantFrames.length;
}

/**
 * Classify hand motion direction based on detected objects
 * 
 * Logic:
 * 1. Find hand/arm objects
 * 2. Find item objects (bottle, container, etc.)
 * 3. Analyze trajectory of hand or item movement
 * 4. Compare Y position at start vs end of video
 * 5. Upward motion (decreasing Y) = 'in' (putting into cabinet)
 * 6. Downward motion (increasing Y) = 'out' (taking from cabinet)
 * 
 * @param detectedObjects - Objects detected by Video Intelligence API
 * @returns Motion direction classification
 */
export function classifyHandMotion(detectedObjects: DetectedObject[]): MotionDirection {
  console.log(`🔍 Classifying motion from ${detectedObjects.length} detected objects`);
  
  // Filter objects by type
  const handObjects = detectedObjects.filter(obj => 
    matchesKeywords(obj.entity, HAND_KEYWORDS)
  );
  
  const itemObjects = detectedObjects.filter(obj => 
    matchesKeywords(obj.entity, ITEM_KEYWORDS)
  );
  
  console.log(`  - Hand objects: ${handObjects.length}`);
  console.log(`  - Item objects: ${itemObjects.length}`);
  
  // If no hand or item detected, return unknown
  if (handObjects.length === 0 && itemObjects.length === 0) {
    return {
      direction: 'unknown',
      confidence: 0,
      reasoning: 'No hand or item objects detected in video',
    };
  }
  
  // Prioritize analyzing item movement if available (more reliable)
  const primaryObject = itemObjects.length > 0 ? itemObjects[0] : handObjects[0];
  
  if (!primaryObject || primaryObject.frames.length < 3) {
    return {
      direction: 'unknown',
      confidence: 0.3,
      reasoning: 'Insufficient frame data for motion analysis',
    };
  }
  
  console.log(`  - Analyzing: ${primaryObject.entity} (${primaryObject.frames.length} frames)`);
  
  // Calculate average Y position for first 30% and last 30% of frames
  const startY = calculateAverageY(primaryObject.frames, 0, 0.3);
  const endY = calculateAverageY(primaryObject.frames, 0.7, 1.0);
  
  // Calculate delta (positive = downward, negative = upward)
  const deltaY = endY - startY;
  
  console.log(`  - Start Y: ${startY.toFixed(3)}, End Y: ${endY.toFixed(3)}, Delta: ${deltaY.toFixed(3)}`);
  
  // Threshold for determining direction (adjust based on testing)
  const THRESHOLD = 0.08; // 8% of screen height
  
  let direction: 'in' | 'out' | 'unknown';
  let confidence: number;
  let reasoning: string;
  
  if (deltaY < -THRESHOLD) {
    // Upward motion = putting INTO cabinet
    direction = 'in';
    confidence = Math.min(0.95, 0.6 + Math.abs(deltaY) * 2);
    reasoning = `Object moved upward (ΔY: ${deltaY.toFixed(3)}), indicating item being placed into cabinet`;
  } else if (deltaY > THRESHOLD) {
    // Downward motion = taking OUT of cabinet
    direction = 'out';
    confidence = Math.min(0.95, 0.6 + Math.abs(deltaY) * 2);
    reasoning = `Object moved downward (ΔY: ${deltaY.toFixed(3)}), indicating item being removed from cabinet`;
  } else {
    // Minimal movement = unknown
    direction = 'unknown';
    confidence = 0.4;
    reasoning = `Minimal vertical movement detected (ΔY: ${deltaY.toFixed(3)}), direction unclear`;
  }
  
  // Boost confidence if both hand and item are detected
  if (handObjects.length > 0 && itemObjects.length > 0) {
    confidence = Math.min(0.98, confidence + 0.15);
    reasoning += ' (hand and item both detected)';
  }
  
  console.log(`  ✅ Classification: ${direction} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  console.log(`  📝 Reasoning: ${reasoning}`);
  
  return {
    direction,
    confidence,
    reasoning,
  };
}

/**
 * Enhanced classification that considers multiple objects
 * Uses weighted average based on confidence scores
 */
export function classifyHandMotionAdvanced(detectedObjects: DetectedObject[]): MotionDirection {
  console.log(`🔍 Advanced classification from ${detectedObjects.length} detected objects`);
  
  const handObjects = detectedObjects.filter(obj => 
    matchesKeywords(obj.entity, HAND_KEYWORDS)
  );
  
  const itemObjects = detectedObjects.filter(obj => 
    matchesKeywords(obj.entity, ITEM_KEYWORDS)
  );
  
  // Collect all valid motion vectors
  const motionVectors: Array<{ deltaY: number; weight: number; entity: string }> = [];
  
  // Analyze all objects with sufficient frames
  [...handObjects, ...itemObjects].forEach(obj => {
    if (obj.frames.length >= 3) {
      const startY = calculateAverageY(obj.frames, 0, 0.3);
      const endY = calculateAverageY(obj.frames, 0.7, 1.0);
      const deltaY = endY - startY;
      
      // Weight by confidence and number of frames
      const weight = obj.confidence * (obj.frames.length / 10);
      
      motionVectors.push({ deltaY, weight, entity: obj.entity });
    }
  });
  
  if (motionVectors.length === 0) {
    return {
      direction: 'unknown',
      confidence: 0,
      reasoning: 'No valid motion vectors found',
    };
  }
  
  // Calculate weighted average delta
  const totalWeight = motionVectors.reduce((sum, v) => sum + v.weight, 0);
  const weightedDeltaY = motionVectors.reduce((sum, v) => sum + (v.deltaY * v.weight), 0) / totalWeight;
  
  console.log(`  - Weighted ΔY: ${weightedDeltaY.toFixed(3)} (from ${motionVectors.length} objects)`);
  
  const THRESHOLD = 0.08;
  
  let direction: 'in' | 'out' | 'unknown';
  let confidence: number;
  
  if (weightedDeltaY < -THRESHOLD) {
    direction = 'in';
    confidence = Math.min(0.95, 0.65 + Math.abs(weightedDeltaY) * 2);
  } else if (weightedDeltaY > THRESHOLD) {
    direction = 'out';
    confidence = Math.min(0.95, 0.65 + Math.abs(weightedDeltaY) * 2);
  } else {
    direction = 'unknown';
    confidence = 0.4;
  }
  
  const reasoning = `Weighted analysis of ${motionVectors.length} objects: ${direction} motion (ΔY: ${weightedDeltaY.toFixed(3)})`;
  
  console.log(`  ✅ Advanced classification: ${direction} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  
  return { direction, confidence, reasoning };
}

