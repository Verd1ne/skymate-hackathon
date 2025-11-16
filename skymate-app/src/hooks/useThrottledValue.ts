import { useState, useEffect, useRef } from 'react';

/**
 * Hook to throttle rapid value changes for smoother UI updates
 * Useful for interim speech transcripts that update multiple times per second
 * 
 * @param value - The value to throttle
 * @param delay - Minimum time between updates (ms)
 * @param immediate - Whether to update immediately on first change
 * @returns Throttled value
 * 
 * @example
 * ```tsx
 * const [interimText, setInterimText] = useState('');
 * const smoothedText = useThrottledValue(interimText, 300);
 * 
 * // UI will only update every 300ms, preventing flickering
 * return <div>{smoothedText}</div>;
 * ```
 */
export function useThrottledValue<T>(
  value: T,
  delay: number = 300,
  immediate: boolean = false
): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update immediately on first render or if immediate flag is set
    if (immediate && lastUpdateRef.current === 0) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
      return;
    }

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      // Otherwise, schedule an update
      const remainingTime = delay - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, remainingTime);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, immediate]);

  return throttledValue;
}

/**
 * Hook for smooth text transitions with CSS animations
 * Adds a CSS class when text changes for smooth fade/slide animations
 * 
 * @param value - The text value
 * @param duration - Animation duration (ms)
 * @returns Object with value and animation class
 * 
 * @example
 * ```tsx
 * const { value: text, className } = useSmoothTransition(interimText, 200);
 * 
 * // In CSS: .text-updating { opacity: 0.7; transition: opacity 0.2s; }
 * return <div className={className}>{text}</div>;
 * ```
 */
export function useSmoothTransition(
  value: string,
  duration: number = 200
): { value: string; className: string } {
  const [displayValue, setDisplayValue] = useState(value);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== displayValue) {
      setIsTransitioning(true);
      
      // Update value
      setDisplayValue(value);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Remove transition class after animation
      timeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, displayValue, duration]);

  return {
    value: displayValue,
    className: isTransitioning ? 'text-updating' : ''
  };
}



