/**
 * Priority Engine
 * 
 * Intelligent priority auto-assignment system that determines task urgency
 * based on multiple factors including request content, flight phase, and
 * passenger characteristics.
 * 
 * Now uses PUP (Priority-Urgency-Proximity) scoring algorithm.
 * 
 * @module priorityEngine
 */

import type { Task, FlightContext } from '../types';
import { 
  createDefaultFAState, 
  f_priority, 
  f_time_urgency, 
  f_proximity,
  mapTaskTypeToCategory,
  inferPassengerFlags,
  inferFlightPhase
} from './taskScoringEngine';

/**
 * Priority level type
 */
export type Priority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Priority calculation result with reasoning
 */
export interface PriorityResult {
  priority: Priority;
  score: number; // 0-100 score for priority determination
  factors: string[]; // Reasons for this priority
  confidence: number; // 0-1 confidence in the assignment
}


/**
 * Calculate priority for a task based on PUP (Priority-Urgency-Proximity) algorithm
 * 
 * @param task - Task to calculate priority for
 * @param flightContext - Current flight context (optional)
 * @returns Priority result with score and reasoning
 * 
 * @example
 * ```typescript
 * const result = calculatePriority(task, {
 *   phase: 'landing',
 *   timeToDestination: 30,
 *   turbulence: false,
 *   seatbeltSign: true
 * });
 * 
 * console.log(result.priority); // 'urgent'
 * console.log(result.factors); // ['Priority: medical (1.00)', 'Urgency: 0.85', ...]
 * ```
 */
export function calculatePriority(
  task: Task,
  flightContext?: FlightContext
): PriorityResult {
  const factors: string[] = [];
  
  // Create FA state (always at front galley, row 1)
  const fa = createDefaultFAState();
  
  // Current time in seconds
  const now_s = Date.now() / 1000;
  
  // Calculate PUP components
  const P = f_priority(task, flightContext);
  const U = f_time_urgency(now_s, task);
  // For single task calculation, proximity is relative to FA position only
  const R = f_proximity(fa, task, []);
  
  // Calculate final score (0-1 scale)
  const pupScore = 0.60 * P + 0.25 * U + 0.15 * R;
  
  // Convert to 0-100 scale for backward compatibility
  const score = pupScore * 100;
  
  // Build factors explanation
  const category = mapTaskTypeToCategory(task);
  factors.push(`Task category: ${category} (priority weight: ${P.toFixed(2)})`);
  
  const passengerFlags = task.passenger_flags || inferPassengerFlags(task);
  if (passengerFlags.length > 0) {
    factors.push(`Passenger flags: ${passengerFlags.join(', ')}`);
  }
  
  const phase = task.phase || inferFlightPhase(flightContext);
  factors.push(`Flight phase: ${phase}`);
  
  const elapsed_s = now_s - (task.created_s || task.timestamp / 1000);
  const elapsed_min = Math.floor(elapsed_s / 60);
  factors.push(`Time urgency: ${(U * 100).toFixed(0)}% (${elapsed_min} min elapsed)`);
  
  factors.push(`Proximity score: ${(R * 100).toFixed(0)}%`);
  factors.push(`Final PUP score: ${(pupScore * 100).toFixed(1)}/100`);
  
  // Determine priority level based on score
  let priority: Priority;
  let confidence = 0.85;
  
  if (pupScore >= 0.80) {
    priority = 'urgent';
    confidence = 0.95;
  } else if (pupScore >= 0.60) {
    priority = 'high';
    confidence = 0.90;
  } else if (pupScore >= 0.40) {
    priority = 'normal';
    confidence = 0.85;
  } else {
    priority = 'low';
    confidence = 0.80;
  }
  
  return {
    priority,
    score: Math.round(score),
    factors,
    confidence
  };
}

/**
 * Check if a task should be auto-escalated based on time pending
 * 
 * @param task - Task to check
 * @param currentPriority - Current priority level
 * @returns New priority if escalation needed, null otherwise
 */
export function checkAutoEscalation(
  task: Task,
  currentPriority: Priority
): Priority | null {
  if (task.status !== 'pending') {
    return null; // Don't escalate completed or in-progress tasks
  }

  const minutesPending = (Date.now() - task.timestamp) / 60000;

  // Escalation thresholds
  if (currentPriority === 'low' && minutesPending >= 10) {
    return 'normal';
  }
  
  if (currentPriority === 'normal' && minutesPending >= 15) {
    return 'high';
  }
  
  if (currentPriority === 'high' && minutesPending >= 20) {
    return 'urgent';
  }

  return null;
}

/**
 * Get priority color for UI display
 * 
 * @param priority - Priority level
 * @returns Tailwind CSS color classes
 */
export function getPriorityColor(priority: Priority): {
  bg: string;
  border: string;
  text: string;
} {
  const colors = {
    urgent: {
      bg: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-900',
    },
    high: {
      bg: 'bg-orange-100',
      border: 'border-orange-500',
      text: 'text-orange-900',
    },
    normal: {
      bg: 'bg-blue-100',
      border: 'border-blue-500',
      text: 'text-blue-900',
    },
    low: {
      bg: 'bg-gray-100',
      border: 'border-gray-500',
      text: 'text-gray-900',
    },
  };

  return colors[priority];
}

/**
 * Get priority icon name (for Lucide icons)
 * 
 * @param priority - Priority level
 * @returns Icon name
 */
export function getPriorityIcon(priority: Priority): string {
  const icons = {
    urgent: 'AlertCircle',
    high: 'AlertTriangle',
    normal: 'Clock',
    low: 'Info',
  };

  return icons[priority];
}

/**
 * Format priority for display
 * 
 * @param priority - Priority level
 * @returns Formatted string
 */
export function formatPriority(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

