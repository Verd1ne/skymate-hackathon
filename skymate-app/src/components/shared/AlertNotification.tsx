/**
 * Alert Notification Component
 * 
 * Displays proactive alerts with animations, priority-based styling,
 * and stacking support for multiple alerts.
 * 
 * @module AlertNotification
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Bell, 
  X,
  Zap,
  Users,
  Package,
  Clock,
  TrendingUp
} from 'lucide-react';
import type { Alert } from '../../hooks/useProactiveAlerts';

/**
 * Props for AlertNotification component
 */
export interface AlertNotificationProps {
  /** Array of alerts to display */
  alerts: Alert[];
  /** Function to dismiss an alert by ID */
  onDismiss: (alertId: string) => void;
  /** Maximum number of alerts to show (default: 5) */
  maxAlerts?: number;
  /** Position of alerts (default: 'bottom-right') */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * Get icon for alert type
 */
function getAlertIcon(type: Alert['type'], priority: Alert['priority']) {
  const iconProps = { size: 20, className: 'flex-shrink-0' };
  
  if (priority === 'urgent') {
    return <AlertCircle {...iconProps} />;
  }
  
  switch (type) {
    case 'hot_zone':
      return <Users {...iconProps} />;
    case 'inventory_warning':
      return <Package {...iconProps} />;
    case 'forgotten_warning':
      return <Clock {...iconProps} />;
    case 'crew_suggestion':
      return <Users {...iconProps} />;
    case 'pattern_detected':
      return <TrendingUp {...iconProps} />;
    case 'efficiency_opportunity':
      return <Zap {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

/**
 * Get priority-based styling
 */
function getPriorityStyles(priority: Alert['priority']) {
  const styles = {
    urgent: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      icon: 'text-red-600',
      shadow: 'shadow-red-500/50',
    },
    high: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      shadow: 'shadow-orange-500/50',
    },
    medium: {
      bg: 'bg-yellow-500',
      bgLight: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      shadow: 'shadow-yellow-500/50',
    },
    low: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      shadow: 'shadow-blue-500/50',
    },
  };
  
  return styles[priority];
}

/**
 * Get position classes
 */
function getPositionClasses(position: AlertNotificationProps['position']) {
  const positions = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  return positions[position || 'bottom-right'];
}

/**
 * Alert Notification Component
 * 
 * Displays stacked alerts with smooth animations and priority-based styling.
 * 
 * @example
 * ```tsx
 * <AlertNotification 
 *   alerts={alerts} 
 *   onDismiss={dismissAlert}
 *   position="bottom-right"
 * />
 * ```
 */
export default function AlertNotification({
  alerts,
  onDismiss,
  maxAlerts = 5,
  position = 'bottom-right',
}: AlertNotificationProps) {
  // Filter out dismissed alerts and limit to maxAlerts
  const visibleAlerts = alerts
    .filter(alert => !alert.dismissed)
    .slice(0, maxAlerts);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed ${getPositionClasses(position)} z-50 flex flex-col gap-2 max-w-sm w-full px-4`}
      style={{ pointerEvents: 'none' }}
    >
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert, index) => {
          const styles = getPriorityStyles(alert.priority);
          const Icon = getAlertIcon(alert.type, alert.priority);
          
          return (
            <motion.div
              key={alert.id}
              initial={{ 
                opacity: 0, 
                y: position?.includes('bottom') ? 50 : -50,
                x: position?.includes('right') ? 50 : -50,
                scale: 0.9 
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                x: 0,
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                y: position?.includes('bottom') ? 50 : -50,
                x: position?.includes('right') ? 50 : -50,
                scale: 0.9,
                transition: { duration: 0.2 }
              }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 30,
                delay: index * 0.1 
              }}
              layout
              className={`
                ${styles.bgLight} 
                ${styles.border} 
                border 
                rounded-lg 
                p-3 
                shadow-md 
                backdrop-blur-sm
                relative
                overflow-hidden
                max-h-20
              `}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Priority indicator bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${styles.bg}`} />
              
              {/* Compact Content */}
              <div className="flex items-center gap-2 pt-1">
                {/* Icon */}
                <div className={`${styles.icon} flex-shrink-0`}>
                  {Icon}
                </div>
                
                {/* Compact text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`
                      ${styles.bg} 
                      text-white 
                      text-xs 
                      font-bold 
                      px-1.5 
                      py-0.5 
                      rounded 
                      uppercase
                    `}>
                      {alert.priority}
                    </span>
                    <p className={`${styles.text} font-medium text-xs truncate`}>
                      {alert.message}
                    </p>
                  </div>
                  
                  {/* Compact action */}
                  <p className="text-xs text-gray-600 truncate mt-0.5">
                    {alert.action}
                  </p>
                </div>
                
                {/* Dismiss button */}
                <button
                  onClick={() => onDismiss(alert.id)}
                  className={`
                    ${styles.icon} 
                    hover:opacity-70 
                    transition-opacity 
                    flex-shrink-0 
                    p-0.5 
                    rounded 
                    hover:bg-white/50
                  `}
                  aria-label="Dismiss alert"
                >
                  <X size={14} />
                </button>
              </div>
              
              {/* Pulse animation for urgent alerts */}
              {alert.priority === 'urgent' && (
                <motion.div
                  className={`absolute inset-0 ${styles.bg} opacity-10 rounded-xl`}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.1, 0.2, 0.1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Show count and dismiss all if more alerts exist */}
      {alerts.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`
            bg-gray-800 
            text-white 
            text-xs 
            px-3 
            py-2 
            rounded-lg 
            shadow-lg
            flex items-center justify-between
            gap-2
          `}
          style={{ pointerEvents: 'auto' }}
        >
          <span>
            {alerts.length > maxAlerts 
              ? `+${alerts.length - maxAlerts} more alert${alerts.length - maxAlerts !== 1 ? 's' : ''}`
              : `${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`
            }
          </span>
          <button
            onClick={() => {
              // Dismiss all visible alerts
              alerts.forEach(alert => onDismiss(alert.id));
            }}
            className="text-xs underline hover:no-underline opacity-80 hover:opacity-100"
          >
            Dismiss All
          </button>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Single Alert Item Component (for use in other contexts)
 */
export function AlertItem({ 
  alert, 
  onDismiss 
}: { 
  alert: Alert; 
  onDismiss: (id: string) => void;
}) {
  const styles = getPriorityStyles(alert.priority);
  const Icon = getAlertIcon(alert.type, alert.priority);

  return (
    <div className={`
      ${styles.bgLight} 
      ${styles.border} 
      border-2 
      rounded-lg 
      p-3 
      shadow-md
    `}>
      <div className="flex items-start gap-2">
        <div className={styles.icon}>
          {Icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${styles.bg} text-white text-xs font-bold px-2 py-0.5 rounded uppercase`}>
              {alert.priority}
            </span>
          </div>
          <p className={`${styles.text} text-sm font-medium`}>
            {alert.message}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {alert.action}
          </p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className={`${styles.icon} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

