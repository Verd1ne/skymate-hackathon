# Proactive Alerts System

A real-time intelligent alerting system that continuously monitors flight tasks and provides proactive insights to optimize crew operations.

## Features

- ✅ **Real-time Monitoring**: Analyzes tasks every 30 seconds
- ✅ **Intelligent Insights**: Uses Context AI to detect patterns and issues
- ✅ **Priority-based Alerts**: Urgent, High, Medium, Low priority levels
- ✅ **Auto-dismiss**: Low-priority alerts automatically dismiss after 30 seconds
- ✅ **Duplicate Prevention**: Tracks shown alerts to avoid spam
- ✅ **Stacking Support**: Multiple alerts stack beautifully
- ✅ **Smooth Animations**: Framer Motion powered transitions
- ✅ **Sound Notifications**: Optional audio alerts for urgent/high priority
- ✅ **Color-coded**: Visual priority indicators (red/orange/yellow/blue)

## Components

### 1. `useProactiveAlerts` Hook

React hook that manages alert lifecycle and analysis.

**Location**: `src/hooks/useProactiveAlerts.ts`

**Usage**:
```tsx
import { useProactiveAlerts } from '../hooks/useProactiveAlerts';
import { useTasks } from '../hooks/useTasks';

function MyComponent() {
  const { tasks } = useTasks();
  
  const { 
    alerts, 
    dismissAlert, 
    dismissAll, 
    alertCount, 
    hasUrgent 
  } = useProactiveAlerts(tasks, {
    analysisInterval: 30000,    // 30 seconds
    autoDismissDelay: 30000,    // 30 seconds
    enableSound: true,          // Sound notifications
    flightContext: {            // Optional
      phase: 'meal_service',
      timeToDestination: 120,
      turbulence: false,
      seatbeltSign: false
    }
  });
  
  return (
    <div>
      {alertCount > 0 && <p>{alertCount} active alerts</p>}
      {/* ... */}
    </div>
  );
}
```

**Options**:
- `analysisInterval`: How often to run analysis (default: 30000ms)
- `autoDismissDelay`: Auto-dismiss delay for low priority (default: 30000ms)
- `enableSound`: Enable sound notifications (default: false)
- `flightContext`: Optional flight context for better analysis

**Returns**:
- `alerts`: Array of active alerts
- `dismissAlert(id)`: Dismiss specific alert
- `dismissAll()`: Dismiss all alerts
- `clearHistory()`: Clear alert history
- `alertCount`: Number of active alerts
- `hasUrgent`: Boolean indicating urgent alerts exist

### 2. `AlertNotification` Component

Visual alert display component with animations.

**Location**: `src/components/shared/AlertNotification.tsx`

**Usage**:
```tsx
import AlertNotification from '../components/shared/AlertNotification';

function MyComponent() {
  const { alerts, dismissAlert } = useProactiveAlerts(tasks);
  
  return (
    <>
      {/* Your app content */}
      
      <AlertNotification
        alerts={alerts}
        onDismiss={dismissAlert}
        position="bottom-right"
        maxAlerts={5}
      />
    </>
  );
}
```

**Props**:
- `alerts`: Array of alerts to display
- `onDismiss`: Function to dismiss alerts
- `position`: Alert position (`bottom-right`, `bottom-left`, `top-right`, `top-left`)
- `maxAlerts`: Maximum alerts to show (default: 5)

## Alert Types

The system detects and alerts on:

1. **Hot Zones** 🔥
   - Zones with 3+ active requests
   - Suggests crew reallocation

2. **Inventory Warnings** 📦
   - High demand items (>20% of requests)
   - Meal type imbalances

3. **Forgotten Tasks** ⏰
   - Tasks pending >10 minutes
   - Critical: Tasks pending >20 minutes

4. **Crew Suggestions** 👥
   - Unbalanced task distribution
   - Zone assignment recommendations

5. **Pattern Detection** 📈
   - Passenger request patterns
   - Predictive insights

6. **Efficiency Opportunities** ⚡
   - Batch processing opportunities
   - Time-saving suggestions

## Priority Levels

- **Urgent** 🔴: Critical issues requiring immediate attention
- **High** 🟠: Important issues that should be addressed soon
- **Medium** 🟡: Moderate priority items
- **Low** 🔵: Informational, auto-dismisses after 30s

## Integration Example

See `src/components/crew/CrewAppWithAlerts.tsx` for a complete integration example.

**Quick Integration**:
```tsx
import { useTasks } from '../hooks/useTasks';
import { useProactiveAlerts } from '../hooks/useProactiveAlerts';
import AlertNotification from '../components/shared/AlertNotification';

function App() {
  const { tasks } = useTasks();
  const { alerts, dismissAlert } = useProactiveAlerts(tasks, {
    enableSound: true
  });
  
  return (
    <div>
      {/* Your app */}
      <AlertNotification alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
```

## Customization

### Styling
Alerts use Tailwind CSS classes. You can customize colors in `AlertNotification.tsx`:
- Urgent: Red (`bg-red-500`)
- High: Orange (`bg-orange-500`)
- Medium: Yellow (`bg-yellow-500`)
- Low: Blue (`bg-blue-500`)

### Sound
Sound notifications use Web Audio API. Customize frequencies in `useProactiveAlerts.ts`:
```typescript
const frequencies = {
  urgent: 800,
  high: 600,
  medium: 400,
  low: 300,
};
```

### Analysis Interval
Adjust how often analysis runs:
```typescript
useProactiveAlerts(tasks, {
  analysisInterval: 60000, // 1 minute
});
```

## Performance

- Analysis runs in background every 30 seconds
- Duplicate detection prevents alert spam
- Auto-cleanup removes old dismissed alerts
- Efficient React hooks with proper cleanup
- Minimal re-renders with memoization

## Browser Support

- Modern browsers with Web Audio API support
- Gracefully degrades if audio unavailable
- Works with all modern React 18+ features

## Future Enhancements

- [ ] Alert history panel
- [ ] Custom alert rules
- [ ] Alert grouping by type
- [ ] Push notifications (PWA)
- [ ] Alert analytics dashboard

