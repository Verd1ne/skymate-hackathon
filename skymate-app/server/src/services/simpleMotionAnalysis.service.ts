/**
 * Simple Motion Analysis Service
 * Classifies motion as 'take_out', 'put_in', or 'none'
 */

import { DetectedObject } from '../types/video.types';

export interface SimpleMotionResult {
  action: 'take_out' | 'put_in' | 'none';
  confidence: number;
  reasoning: string;
}

/**
 * Analyze detected objects and classify motion as take_out, put_in, or none
 * @param detectedObjects - Objects detected by Video Intelligence API
 * @returns Simple motion classification
 */
export function classifySimpleMotion(detectedObjects: DetectedObject[]): SimpleMotionResult {
  console.log(`\n🔍 Analyzing motion from ${detectedObjects.length} detected objects...`);

  // If no objects detected, return 'none'
  if (detectedObjects.length === 0) {
    return {
      action: 'none',
      confidence: 0.9,
      reasoning: 'No objects detected in video',
    };
  }

  // Find hand/person objects
  const handObjects = detectedObjects.filter(obj =>
    ['hand', 'arm', 'finger', 'person'].some(keyword =>
      obj.entity.toLowerCase().includes(keyword)
    )
  );

  // Find item objects (non-hand objects)
  const itemObjects = detectedObjects.filter(obj =>
    !['hand', 'arm', 'finger', 'person'].some(keyword =>
      obj.entity.toLowerCase().includes(keyword)
    )
  );

  console.log(`  - Hand/Person objects: ${handObjects.length}`);
  console.log(`  - Item objects: ${itemObjects.length}`);

  // If no hand detected, return 'none'
  if (handObjects.length === 0) {
    return {
      action: 'none',
      confidence: 0.8,
      reasoning: 'No hand movement detected',
    };
  }

  // Analyze hand movement direction
  const handObject = handObjects[0]; // Use first hand object
  const frames = handObject.frames;

  if (frames.length < 2) {
    return {
      action: 'none',
      confidence: 0.7,
      reasoning: 'Insufficient frames to determine motion',
    };
  }

  // Calculate vertical movement (Y-axis)
  // In video coordinates: top = 0, bottom = 1
  // Moving down (increasing Y) = putting in
  // Moving up (decreasing Y) = taking out

  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];

  const firstY = (firstFrame.boundingBox.top + firstFrame.boundingBox.bottom) / 2;
  const lastY = (lastFrame.boundingBox.top + lastFrame.boundingBox.bottom) / 2;

  const verticalMovement = lastY - firstY;
  const movementMagnitude = Math.abs(verticalMovement);

  console.log(`  - First Y position: ${firstY.toFixed(3)}`);
  console.log(`  - Last Y position: ${lastY.toFixed(3)}`);
  console.log(`  - Vertical movement: ${verticalMovement.toFixed(3)}`);

  // Threshold for significant movement (adjust as needed)
  const MOVEMENT_THRESHOLD = 0.1; // 10% of frame height

  if (movementMagnitude < MOVEMENT_THRESHOLD) {
    return {
      action: 'none',
      confidence: 0.75,
      reasoning: `Insufficient movement detected (${(movementMagnitude * 100).toFixed(1)}%)`,
    };
  }

  // Determine action based on direction
  if (verticalMovement > 0) {
    // Moving down = putting in
    const confidence = Math.min(0.95, 0.7 + movementMagnitude);
    return {
      action: 'put_in',
      confidence,
      reasoning: `Hand moving downward (${(movementMagnitude * 100).toFixed(1)}% movement)`,
    };
  } else {
    // Moving up = taking out
    const confidence = Math.min(0.95, 0.7 + movementMagnitude);
    return {
      action: 'take_out',
      confidence,
      reasoning: `Hand moving upward (${(movementMagnitude * 100).toFixed(1)}% movement)`,
    };
  }
}

/**
 * Alternative: Analyze based on item presence over time
 * More sophisticated approach that tracks item appearance/disappearance
 */
export function classifyMotionByItemPresence(detectedObjects: DetectedObject[]): SimpleMotionResult {
  console.log(`\n🔍 Analyzing motion by item presence...`);

  // Find item objects (non-hand objects)
  const itemObjects = detectedObjects.filter(obj =>
    !['hand', 'arm', 'finger', 'person'].some(keyword =>
      obj.entity.toLowerCase().includes(keyword)
    )
  );

  if (itemObjects.length === 0) {
    return {
      action: 'none',
      confidence: 0.8,
      reasoning: 'No items detected in video',
    };
  }

  // Analyze item trajectory
  const item = itemObjects[0]; // Use first item
  const frames = item.frames;

  if (frames.length < 2) {
    return {
      action: 'none',
      confidence: 0.7,
      reasoning: 'Insufficient frames to track item',
    };
  }

  // Calculate vertical movement of item
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];

  const firstY = (firstFrame.boundingBox.top + firstFrame.boundingBox.bottom) / 2;
  const lastY = (lastFrame.boundingBox.top + lastFrame.boundingBox.bottom) / 2;

  const verticalMovement = lastY - firstY;
  const movementMagnitude = Math.abs(verticalMovement);

  console.log(`  - Item: ${item.entity}`);
  console.log(`  - First Y position: ${firstY.toFixed(3)}`);
  console.log(`  - Last Y position: ${lastY.toFixed(3)}`);
  console.log(`  - Vertical movement: ${verticalMovement.toFixed(3)}`);

  const MOVEMENT_THRESHOLD = 0.1;

  if (movementMagnitude < MOVEMENT_THRESHOLD) {
    return {
      action: 'none',
      confidence: 0.75,
      reasoning: `Item not moving significantly (${(movementMagnitude * 100).toFixed(1)}%)`,
    };
  }

  // Determine action based on direction
  if (verticalMovement > 0) {
    const confidence = Math.min(0.95, 0.7 + movementMagnitude);
    return {
      action: 'put_in',
      confidence,
      reasoning: `Item moving downward into cabinet (${(movementMagnitude * 100).toFixed(1)}% movement)`,
    };
  } else {
    const confidence = Math.min(0.95, 0.7 + movementMagnitude);
    return {
      action: 'take_out',
      confidence,
      reasoning: `Item moving upward out of cabinet (${(movementMagnitude * 100).toFixed(1)}% movement)`,
    };
  }
}

