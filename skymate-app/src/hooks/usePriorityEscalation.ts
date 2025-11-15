/**
 * React Hook for Priority Escalation
 * 
 * Automatically monitors tasks and escalates priorities in React components.
 * 
 * @module usePriorityEscalation
 */

import { useEffect, useRef, useCallback } from 'react';
import { escalationMonitor, type EscalationCallback } from '../lib/priorityEscalation';
import type { Task } from '../types';

/**
 * Options for usePriorityEscalation hook
 */
export interface UsePriorityEscalationOptions {
  /** Enable automatic escalation monitoring (default: true) */
  enabled?: boolean;
  /** Check interval in milliseconds (default: 5 minutes) */
  checkInterval?: number;
  /** Callback when task is escalated */
  onEscalate?: EscalationCallback;
}

/**
 * React hook for priority escalation
 * 
 * Automatically monitors tasks and escalates priorities based on time pending.
 * 
 * @param tasks - Array of current tasks
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tasks } = useTasks();
 *   
 *   usePriorityEscalation(tasks, {
 *     enabled: true,
 *     onEscalate: (task, oldPriority, newPriority) => {
 *       console.log(`Task escalated: ${oldPriority} → ${newPriority}`);
 *     }
 *   });
 * }
 * ```
 */
export function usePriorityEscalation(
  tasks: Task[],
  options: UsePriorityEscalationOptions = {}
): void {
  const {
    enabled = true,
    checkInterval = 5 * 60 * 1000, // 5 minutes
    onEscalate,
  } = options;

  const tasksRef = useRef(tasks);
  const onEscalateRef = useRef(onEscalate);

  // Update refs when they change
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    onEscalateRef.current = onEscalate;
  }, [onEscalate]);

  // Get current tasks function
  const getTasks = useCallback(() => tasksRef.current, []);

  // Escalation callback wrapper
  const handleEscalate = useCallback<EscalationCallback>((task, oldPriority, newPriority) => {
    if (onEscalateRef.current) {
      onEscalateRef.current(task, oldPriority, newPriority);
    }
  }, []);

  // Start/stop monitor
  useEffect(() => {
    if (!enabled) {
      escalationMonitor.stop();
      return;
    }

    escalationMonitor.start(getTasks, handleEscalate, checkInterval);

    return () => {
      escalationMonitor.stop();
    };
  }, [enabled, checkInterval, getTasks, handleEscalate]);
}

