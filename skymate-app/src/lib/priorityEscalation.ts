/**
 * Priority Escalation System
 * 
 * Automatically escalates task priorities based on time pending.
 * Monitors tasks every 5 minutes and escalates when thresholds are met.
 * 
 * @module priorityEscalation
 */

import { db, ref, update } from './firebase';
import { checkAutoEscalation } from './priorityEngine';
import type { Task } from '../types';

/**
 * Escalation thresholds in minutes
 */
export const ESCALATION_THRESHOLDS = {
  LOW_TO_NORMAL: 10,      // 10 minutes
  NORMAL_TO_HIGH: 15,     // 15 minutes
  HIGH_TO_URGENT: 20,     // 20 minutes
} as const;

/**
 * Check interval in milliseconds (5 minutes)
 */
export const ESCALATION_CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * Priority escalation notification callback
 */
export type EscalationCallback = (task: Task, oldPriority: Task['priority'], newPriority: Task['priority']) => void;

/**
 * Update task priority in Firebase
 * 
 * @param taskId - Task ID to update
 * @param newPriority - New priority level
 * @param reason - Reason for priority change (optional)
 * @returns Promise that resolves when update completes
 * 
 * @example
 * ```typescript
 * await updateTaskPriority('task-123', 'high', 'Auto-escalated after 15 minutes');
 * ```
 */
export async function updateTaskPriority(
  taskId: string,
  newPriority: Task['priority'],
  reason?: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase not configured. Cannot update task priority.');
  }

  try {
    const taskRef = ref(db, `tasks/${taskId}`);
    
    const updates: Partial<Task> = {
      priority: newPriority,
    };

    // Add escalation metadata if reason provided
    if (reason) {
      // Store escalation history in task metadata
      // Note: This assumes you might want to track escalation history
      // You may need to extend Task interface to include escalationHistory
      console.log(`Priority escalation for task ${taskId}: ${reason}`);
    }

    await update(taskRef, updates);
    console.log(`✅ Task ${taskId} priority updated to ${newPriority}`);
  } catch (error: any) {
    console.error(`❌ Failed to update task priority for ${taskId}:`, error);
    throw error;
  }
}

/**
 * Check and escalate a single task if needed
 * 
 * @param task - Task to check
 * @param onEscalate - Callback when escalation occurs
 * @returns True if task was escalated, false otherwise
 */
export async function checkAndEscalateTask(
  task: Task,
  onEscalate?: EscalationCallback
): Promise<boolean> {
  // Only check pending tasks
  if (task.status !== 'pending') {
    return false;
  }

  // Check if escalation is needed
  const newPriority = checkAutoEscalation(task, task.priority);
  
  if (newPriority && newPriority !== task.priority) {
    const minutesPending = Math.floor((Date.now() - task.timestamp) / 60000);
    const reason = `Auto-escalated after ${minutesPending} minutes pending`;

    try {
      // Update priority in Firebase
      await updateTaskPriority(task.id, newPriority, reason);

      // Notify callback
      if (onEscalate) {
        onEscalate(task, task.priority, newPriority);
      }

      console.log(`🚨 Task ${task.id} (Seat ${task.seat}) escalated: ${task.priority} → ${newPriority}`);
      return true;
    } catch (error) {
      console.error(`Failed to escalate task ${task.id}:`, error);
      return false;
    }
  }

  return false;
}

/**
 * Check and escalate all pending tasks
 * 
 * @param tasks - Array of all tasks
 * @param onEscalate - Callback when escalation occurs
 * @returns Number of tasks escalated
 */
export async function checkAndEscalateAll(
  tasks: Task[],
  onEscalate?: EscalationCallback
): Promise<number> {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  let escalatedCount = 0;

  console.log(`🔍 Checking ${pendingTasks.length} pending tasks for escalation...`);

  // Check each pending task
  const escalationPromises = pendingTasks.map(async (task) => {
    const wasEscalated = await checkAndEscalateTask(task, onEscalate);
    if (wasEscalated) {
      escalatedCount++;
    }
    return wasEscalated;
  });

  await Promise.all(escalationPromises);

  if (escalatedCount > 0) {
    console.log(`✅ Escalated ${escalatedCount} task(s)`);
  } else {
    console.log(`✓ No tasks needed escalation`);
  }

  return escalatedCount;
}

/**
 * Priority Escalation Monitor
 * 
 * Continuously monitors tasks and escalates priorities automatically.
 * Runs checks every 5 minutes.
 */
export class PriorityEscalationMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private tasks: Task[] = [];
  private onEscalateCallback?: EscalationCallback;
  private getTasksFunction?: () => Task[];
  private isRunning = false;

  /**
   * Start monitoring tasks for escalation
   * 
   * @param getTasks - Function that returns current tasks array
   * @param onEscalate - Callback when escalation occurs
   * @param checkInterval - Check interval in milliseconds (default: 5 minutes)
   */
  start(
    getTasks: () => Task[],
    onEscalate?: EscalationCallback,
    checkInterval: number = ESCALATION_CHECK_INTERVAL
  ): void {
    // If already running, restart with new parameters (graceful restart)
    if (this.isRunning) {
      console.log('🔄 Priority escalation monitor already running, restarting with new parameters...');
      this.stop();
    }

    this.onEscalateCallback = onEscalate;
    this.getTasksFunction = getTasks; // Store the function
    this.isRunning = true;

    console.log(`🚀 Starting priority escalation monitor (checking every ${checkInterval / 60000} minutes)`);

    // Run initial check
    this.checkTasks();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkTasks();
    }, checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Priority escalation monitor stopped');
  }

  /**
   * Check tasks and escalate if needed
   */
  private async checkTasks(): Promise<void> {
    try {
      if (!this.getTasksFunction) {
        console.warn('⚠️ No getTasks function available for escalation check');
        return;
      }
      this.tasks = this.getTasksFunction();
      await checkAndEscalateAll(this.tasks, this.onEscalateCallback);
    } catch (error) {
      console.error('❌ Error during priority escalation check:', error);
    }
  }

  /**
   * Check if monitor is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger a check
   */
  async triggerCheck(getTasks?: () => Task[]): Promise<number> {
    if (getTasks) {
      this.tasks = getTasks();
    } else if (this.getTasksFunction) {
      this.tasks = this.getTasksFunction();
    } else {
      console.warn('⚠️ No getTasks function available for manual escalation check');
      return 0;
    }
    return await checkAndEscalateAll(this.tasks, this.onEscalateCallback);
  }
}

/**
 * Create a singleton instance of the escalation monitor
 */
export const escalationMonitor = new PriorityEscalationMonitor();

/**
 * React hook for priority escalation (optional)
 * 
 * Use this in React components to automatically monitor and escalate tasks
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tasks } = useTasks();
 *   
 *   usePriorityEscalation(tasks, (task, oldPriority, newPriority) => {
 *     console.log(`Task ${task.id} escalated to ${newPriority}`);
 *   });
 * }
 * ```
 */
export function usePriorityEscalation(
  _tasks: Task[],
  _onEscalate?: EscalationCallback
): void {
  // This would be implemented as a React hook
  // For now, it's a placeholder that can be used with useEffect
  // See implementation example below
}

/**
 * Get escalation status for a task
 * 
 * @param task - Task to check
 * @returns Escalation status information
 */
export function getEscalationStatus(task: Task): {
  minutesPending: number;
  nextEscalationAt: number | null;
  nextPriority: Task['priority'] | null;
  willEscalate: boolean;
} {
  const minutesPending = (Date.now() - task.timestamp) / 60000;
  const nextPriority = checkAutoEscalation(task, task.priority);
  
  let nextEscalationAt: number | null = null;
  
  if (nextPriority) {
    const thresholds: Record<'low' | 'normal' | 'high', number> = {
      low: ESCALATION_THRESHOLDS.LOW_TO_NORMAL,
      normal: ESCALATION_THRESHOLDS.NORMAL_TO_HIGH,
      high: ESCALATION_THRESHOLDS.HIGH_TO_URGENT,
    };
    
    // Only check thresholds for priorities that can escalate (not 'urgent')
    if (task.priority !== 'urgent' && task.priority in thresholds) {
      const threshold = thresholds[task.priority as 'low' | 'normal' | 'high'];
      if (threshold) {
        nextEscalationAt = task.timestamp + (threshold * 60 * 1000);
      }
    }
  }

  return {
    minutesPending: Math.floor(minutesPending),
    nextEscalationAt,
    nextPriority,
    willEscalate: nextPriority !== null,
  };
}

/**
 * Format escalation message for display
 * 
 * @param task - Task that was escalated
 * @param oldPriority - Previous priority
 * @param newPriority - New priority
 * @returns Formatted message
 */
export function formatEscalationMessage(
  task: Task,
  oldPriority: Task['priority'],
  newPriority: Task['priority']
): string {
  const minutesPending = Math.floor((Date.now() - task.timestamp) / 60000);
  
  return `Task at seat ${task.seat} escalated from ${oldPriority} to ${newPriority} after ${minutesPending} minutes`;
}

