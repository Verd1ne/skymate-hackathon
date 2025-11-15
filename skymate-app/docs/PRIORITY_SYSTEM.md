# Intelligent Priority Auto-Assignment System

An intelligent system that automatically determines task urgency and escalates priorities based on time pending.

## Features

- ✅ **Auto-Assignment**: Automatically calculates priority when tasks are created
- ✅ **Intelligent Analysis**: Considers multiple factors (keywords, flight phase, passenger type)
- ✅ **Auto-Escalation**: Automatically escalates priorities based on time pending
- ✅ **Firebase Integration**: Updates priorities in real-time
- ✅ **Notification Support**: Callbacks for escalation events

## Components

### 1. Priority Engine (`src/lib/priorityEngine.ts`)

Calculates initial priority based on multiple factors.

**Priority Assignment Rules**:

#### Urgent Priority 🔴
- Medical emergencies (keywords: medical, emergency, sick, pain, etc.)
- Safety issues (safety, danger, unsafe, emergency)
- Passenger distress (distress, help, immediately, asap)

#### High Priority 🟠
- Time-sensitive requests
- Discomfort issues (cold, hot, uncomfortable)
- Families with babies/children
- Special assistance needs
- Bathroom/restroom requests
- Flight phase: landing/takeoff (1.5x multiplier)
- Turbulence conditions (+10 points)

#### Normal Priority 🔵
- Standard meal/beverage requests
- Regular comfort items

#### Low Priority ⚪
- Information queries
- Non-urgent comfort items

**Usage**:
```typescript
import { calculatePriority } from './lib/priorityEngine';
import type { Task, FlightContext } from './types';

const task: Task = {
  id: '1',
  seat: '16A',
  request: 'I need medical assistance, feeling sick',
  type: 'medical',
  priority: 'normal', // Will be recalculated
  status: 'pending',
  timestamp: Date.now(),
};

const flightContext: FlightContext = {
  phase: 'cruise',
  timeToDestination: 120,
  turbulence: false,
  seatbeltSign: false,
};

const result = calculatePriority(task, flightContext);
console.log(result.priority); // 'urgent'
console.log(result.factors); // ['Medical emergency detected']
console.log(result.score); // 100
console.log(result.confidence); // 0.95
```

### 2. Priority Escalation (`src/lib/priorityEscalation.ts`)

Automatically escalates task priorities based on time pending.

**Escalation Thresholds**:
- `low` → `normal`: After 10 minutes
- `normal` → `high`: After 15 minutes
- `high` → `urgent`: After 20 minutes

**Usage**:
```typescript
import { 
  escalationMonitor, 
  updateTaskPriority,
  checkAndEscalateAll 
} from './lib/priorityEscalation';

// Update priority manually
await updateTaskPriority('task-123', 'high', 'Auto-escalated after 15 minutes');

// Check and escalate all tasks
const escalatedCount = await checkAndEscalateAll(tasks, (task, oldPriority, newPriority) => {
  console.log(`Task ${task.id} escalated: ${oldPriority} → ${newPriority}`);
});

// Start automatic monitoring
escalationMonitor.start(
  () => tasks, // Function that returns current tasks
  (task, oldPriority, newPriority) => {
    console.log(`Escalation: ${task.seat} ${oldPriority} → ${newPriority}`);
  },
  5 * 60 * 1000 // Check every 5 minutes
);
```

### 3. React Hook (`src/hooks/usePriorityEscalation.ts`)

React hook for automatic priority escalation in components.

**Usage**:
```tsx
import { useTasks } from './hooks/useTasks';
import { usePriorityEscalation } from './hooks/usePriorityEscalation';

function MyComponent() {
  const { tasks } = useTasks();
  
  usePriorityEscalation(tasks, {
    enabled: true,
    checkInterval: 5 * 60 * 1000, // 5 minutes
    onEscalate: (task, oldPriority, newPriority) => {
      // Show notification, update UI, etc.
      console.log(`Task escalated: ${oldPriority} → ${newPriority}`);
    }
  });
  
  return <div>...</div>;
}
```

## Integration

### Automatic Priority Assignment

The `useTasks` hook now automatically calculates priority when creating tasks:

```typescript
import { useTasks } from './hooks/useTasks';
import type { FlightContext } from './types';

function MyComponent() {
  const { createTask } = useTasks();
  const flightContext: FlightContext = {
    phase: 'meal_service',
    timeToDestination: 60,
    turbulence: false,
    seatbeltSign: false,
  };
  
  const handleCreateTask = async () => {
    await createTask({
      seat: '16A',
      request: 'I need a blanket, I\'m very cold',
      type: 'comfort',
      item: 'blanket',
    }, flightContext); // Priority will be auto-calculated
  };
};
```

### Complete Integration Example

```tsx
import { useTasks } from './hooks/useTasks';
import { usePriorityEscalation } from './hooks/usePriorityEscalation';
import { useProactiveAlerts } from './hooks/useProactiveAlerts';
import AlertNotification from './components/shared/AlertNotification';

function CrewApp() {
  const { tasks } = useTasks();
  
  // Auto-escalate priorities
  usePriorityEscalation(tasks, {
    onEscalate: (task, oldPriority, newPriority) => {
      // Show alert when task escalates
      console.log(`🚨 Task escalated: Seat ${task.seat} ${oldPriority} → ${newPriority}`);
    }
  });
  
  // Proactive alerts (includes forgotten tasks)
  const { alerts, dismissAlert } = useProactiveAlerts(tasks);
  
  return (
    <div>
      {/* Your app content */}
      
      {/* Show alerts including escalations */}
      <AlertNotification alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
```

## Priority Factors

The system considers these factors when calculating priority:

1. **Request Keywords**: Medical, emergency, discomfort, etc.
2. **Request Type**: Medical > Assistance > Comfort > Meal/Beverage > Information
3. **Flight Phase**: Landing/Takeoff = higher priority
4. **Time Pending**: Auto-escalates after thresholds
5. **Passenger Type**: Families, special needs, etc.
6. **Turbulence**: Increases priority during turbulence
7. **Seatbelt Sign**: Increases priority for assistance during seatbelt sign

## Escalation Timeline

```
Task Created → Priority Assigned
     ↓
[10 minutes] → Low → Normal (if applicable)
     ↓
[15 minutes] → Normal → High (if applicable)
     ↓
[20 minutes] → High → Urgent (if applicable)
```

## Configuration

### Escalation Thresholds

Modify in `src/lib/priorityEscalation.ts`:
```typescript
export const ESCALATION_THRESHOLDS = {
  LOW_TO_NORMAL: 10,      // minutes
  NORMAL_TO_HIGH: 15,     // minutes
  HIGH_TO_URGENT: 20,     // minutes
};
```

### Check Interval

Modify in `src/lib/priorityEscalation.ts`:
```typescript
export const ESCALATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

### Priority Keywords

Modify in `src/lib/priorityEngine.ts`:
```typescript
const URGENT_KEYWORDS = [
  'medical', 'emergency', 'sick', ...
];
```

## API Reference

### `calculatePriority(task, flightContext?)`

Calculates priority for a task.

**Returns**: `PriorityResult` with:
- `priority`: Calculated priority level
- `score`: 0-100 priority score
- `factors`: Array of reasons
- `confidence`: 0-1 confidence level

### `updateTaskPriority(taskId, newPriority, reason?)`

Updates task priority in Firebase.

### `checkAutoEscalation(task, currentPriority)`

Checks if task should be escalated.

**Returns**: New priority if escalation needed, `null` otherwise.

### `escalationMonitor.start(getTasks, onEscalate?, interval?)`

Starts automatic escalation monitoring.

### `escalationMonitor.stop()`

Stops escalation monitoring.

## Best Practices

1. **Always provide flight context** when creating tasks for better priority calculation
2. **Monitor escalations** with callbacks to notify crew
3. **Use proactive alerts** to show escalation notifications
4. **Review priority factors** in console logs for debugging
5. **Adjust thresholds** based on flight duration and crew size

## Testing

Test priority calculation:
```typescript
const medicalTask = {
  request: 'Medical emergency, passenger is sick',
  type: 'medical',
  // ...
};

const result = calculatePriority(medicalTask);
console.assert(result.priority === 'urgent');
```

Test escalation:
```typescript
const oldTask = {
  ...task,
  timestamp: Date.now() - (16 * 60 * 1000), // 16 minutes ago
  priority: 'normal',
};

const newPriority = checkAutoEscalation(oldTask, 'normal');
console.assert(newPriority === 'high');
```

