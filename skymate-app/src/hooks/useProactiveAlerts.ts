/**
 * Proactive Alerts Hook
 * 
 * Continuously monitors tasks and triggers intelligent notifications
 * based on context analysis every 30 seconds.
 * 
 * @module useProactiveAlerts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { contextAI, type Insight } from '../lib/contextAI';
import type { Task, FlightContext } from '../types';

/**
 * Alert with unique ID and dismissal tracking
 */
export interface Alert extends Insight {
  id: string;
  dismissed: boolean;
  shownAt: number;
  autoDismissAt?: number;
}

/**
 * Configuration options for the alerts hook
 */
export interface UseProactiveAlertsOptions {
  /** Analysis interval in milliseconds (default: 30000 = 30 seconds) */
  analysisInterval?: number;
  /** Auto-dismiss low priority alerts after this time (default: 30000 = 30 seconds) */
  autoDismissDelay?: number;
  /** Enable sound notifications (default: false) */
  enableSound?: boolean;
  /** Flight context for more accurate analysis */
  flightContext?: FlightContext;
}

/**
 * Return type of useProactiveAlerts hook
 */
export interface UseProactiveAlertsReturn {
  /** Current active alerts */
  alerts: Alert[];
  /** Dismiss a specific alert by ID */
  dismissAlert: (alertId: string) => void;
  /** Dismiss all alerts */
  dismissAll: () => void;
  /** Clear all alerts from history */
  clearHistory: () => void;
  /** Number of active alerts */
  alertCount: number;
  /** Has urgent alerts */
  hasUrgent: boolean;
}

/**
 * Generate unique ID for an alert
 */
function generateAlertId(insight: Insight): string {
  return `${insight.type}-${insight.timestamp}-${insight.message.slice(0, 20).replace(/\s/g, '-')}`;
}

/**
 * Check if two insights are duplicates
 */
function isDuplicateInsight(insight1: Insight, insight2: Insight): boolean {
  return (
    insight1.type === insight2.type &&
    insight1.message === insight2.message &&
    Math.abs(insight1.timestamp - insight2.timestamp) < 60000 // Within 1 minute
  );
}

// Global AudioContext that gets resumed after user interaction
let globalAudioContext: AudioContext | null = null;
let audioContextResumed = false;

/**
 * Resume AudioContext after user interaction (required by Chrome autoplay policy)
 */
function resumeAudioContext(): void {
  if (audioContextResumed || !globalAudioContext) return;
  
  try {
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().then(() => {
        audioContextResumed = true;
        console.log('✅ AudioContext resumed after user interaction');
      }).catch((error) => {
        console.debug('Failed to resume AudioContext:', error);
      });
    } else {
      audioContextResumed = true;
    }
  } catch (error) {
    console.debug('Error resuming AudioContext:', error);
  }
}

/**
 * Initialize AudioContext on first user interaction
 */
function initAudioContext(): AudioContext | null {
  if (globalAudioContext) {
    return globalAudioContext;
  }

  try {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume immediately if already allowed
    if (globalAudioContext.state === 'suspended') {
      // Set up one-time resume on user interaction
      const resumeOnce = () => {
        resumeAudioContext();
        document.removeEventListener('click', resumeOnce);
        document.removeEventListener('touchstart', resumeOnce);
        document.removeEventListener('keydown', resumeOnce);
      };
      
      document.addEventListener('click', resumeOnce, { once: true });
      document.addEventListener('touchstart', resumeOnce, { once: true });
      document.addEventListener('keydown', resumeOnce, { once: true });
    } else {
      audioContextResumed = true;
    }
    
    return globalAudioContext;
  } catch (error) {
    console.debug('AudioContext not available:', error);
    return null;
  }
}

/**
 * Play notification sound (optional)
 * FIXED: Handles Chrome autoplay policy by resuming AudioContext after user interaction
 */
function playNotificationSound(priority: Insight['priority']): void {
  try {
    const audioContext = initAudioContext();
    if (!audioContext) {
      return; // Audio not supported
    }

    // Resume AudioContext if suspended (required by Chrome autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        // Retry playing sound after resume
        playNotificationSound(priority);
      }).catch((error) => {
        console.debug('AudioContext resume failed, sound will play after user interaction:', error);
      });
      return; // Will retry after resume
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different priorities
    const frequencies: Record<Insight['priority'], number> = {
      urgent: 800,
      high: 600,
      medium: 400,
      low: 300,
    };

    oscillator.frequency.value = frequencies[priority];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    // Silently fail if audio is not supported
    console.debug('Audio notification not available:', error);
  }
}

/**
 * React hook for proactive alerts
 * 
 * Monitors tasks continuously and generates intelligent alerts
 * based on context analysis.
 * 
 * @param tasks - Array of current tasks
 * @param options - Configuration options
 * @returns Alert management functions and current alerts
 * 
 * @example
 * ```tsx
 * const { alerts, dismissAlert, alertCount } = useProactiveAlerts(tasks, {
 *   analysisInterval: 30000,
 *   enableSound: true
 * });
 * ```
 */
export function useProactiveAlerts(
  tasks: Task[],
  options: UseProactiveAlertsOptions = {}
): UseProactiveAlertsReturn {
  const {
    analysisInterval = 30000, // 30 seconds
    autoDismissDelay = 30000, // 30 seconds
    enableSound = false,
    flightContext,
  } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const shownInsightsRef = useRef<Set<string>>(new Set());
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Convert insight to alert
   */
  const createAlert = useCallback((insight: Insight): Alert => {
    const id = generateAlertId(insight);
    const now = Date.now();
    
    // Auto-dismiss low priority alerts
    const autoDismissAt = insight.priority === 'low' 
      ? now + autoDismissDelay 
      : undefined;

    return {
      ...insight,
      id,
      dismissed: false,
      shownAt: now,
      autoDismissAt,
    };
  }, [autoDismissDelay]);

  /**
   * Add new alert if not duplicate
   */
  const addAlert = useCallback((insight: Insight) => {
    const alertId = generateAlertId(insight);
    
    // Check if we've already shown this alert
    if (shownInsightsRef.current.has(alertId)) {
      return;
    }

    // Check for duplicates in current alerts
    const isDuplicate = alerts.some(alert => 
      !alert.dismissed && isDuplicateInsight(alert, insight)
    );

    if (isDuplicate) {
      return;
    }

    // Mark as shown
    shownInsightsRef.current.add(alertId);

    // Create alert
    const alert = createAlert(insight);

    // Play sound if enabled
    if (enableSound && (alert.priority === 'urgent' || alert.priority === 'high')) {
      playNotificationSound(alert.priority);
    }

    // Add to alerts
    setAlerts(prev => {
      // Remove dismissed alerts that are older than 5 minutes
      const filtered = prev.filter(a => 
        !a.dismissed || (Date.now() - a.shownAt) < 300000
      );
      return [...filtered, alert];
    });

    // Set auto-dismiss timer for low priority
    if (alert.autoDismissAt) {
      const timer = setTimeout(() => {
        dismissAlert(alert.id);
      }, autoDismissDelay);
      
      autoDismissTimersRef.current.set(alert.id, timer);
    }
  }, [alerts, createAlert, enableSound, autoDismissDelay]);

  /**
   * Run context analysis
   */
  const runAnalysis = useCallback(() => {
    try {
      const insights = contextAI.analyzeFlightState(tasks, flightContext);
      
      // Add new insights as alerts
      insights.forEach(insight => {
        addAlert(insight);
      });
    } catch (error) {
      console.error('Error running proactive alerts analysis:', error);
    }
  }, [tasks, flightContext, addAlert]);

  /**
   * Dismiss an alert - immediately remove it from the array
   */
  const dismissAlert = useCallback((alertId: string) => {
    // Immediately remove the alert from the array (don't just mark as dismissed)
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    // Clear auto-dismiss timer if exists
    const timer = autoDismissTimersRef.current.get(alertId);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimersRef.current.delete(alertId);
    }
  }, []);

  /**
   * Dismiss all alerts
   */
  const dismissAll = useCallback(() => {
    setAlerts(prev => 
      prev.map(alert => ({ ...alert, dismissed: true }))
    );

    // Clear all timers
    autoDismissTimersRef.current.forEach(timer => clearTimeout(timer));
    autoDismissTimersRef.current.clear();
  }, []);

  /**
   * Clear alert history
   */
  const clearHistory = useCallback(() => {
    setAlerts([]);
    shownInsightsRef.current.clear();
    autoDismissTimersRef.current.forEach(timer => clearTimeout(timer));
    autoDismissTimersRef.current.clear();
  }, []);

  /**
   * Set up periodic analysis
   */
  useEffect(() => {
    // Run initial analysis
    runAnalysis();

    // Set up interval
    analysisIntervalRef.current = setInterval(() => {
      runAnalysis();
    }, analysisInterval);

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      // Clean up auto-dismiss timers
      autoDismissTimersRef.current.forEach(timer => clearTimeout(timer));
      autoDismissTimersRef.current.clear();
    };
  }, [runAnalysis, analysisInterval]);

  /**
   * Clean up dismissed alerts after animation
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts(prev => 
        prev.filter(alert => {
          // Keep non-dismissed alerts
          if (!alert.dismissed) return true;
          // Remove dismissed alerts older than 1 minute (after animation)
          return (Date.now() - alert.shownAt) < 60000;
        })
      );
    }, 5000); // Check every 5 seconds

    return () => clearInterval(timer);
  }, []);

  // Filter active (non-dismissed) alerts
  const activeAlerts = alerts.filter(alert => !alert.dismissed);
  
  // Sort by priority (urgent first)
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return {
    alerts: sortedAlerts,
    dismissAlert,
    dismissAll,
    clearHistory,
    alertCount: sortedAlerts.length,
    hasUrgent: sortedAlerts.some(alert => alert.priority === 'urgent'),
  };
}

