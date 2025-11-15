# Task Consolidation by Seat

## Overview
Tasks for the same seat are now automatically consolidated into a single task. This prevents duplicate entries when a passenger makes multiple requests (e.g., seat 51B requesting both beef and water).

## How It Works

### Before
If seat 51B requested:
1. "Beef" - Creates Task 1
2. "Water" - Creates Task 2

You would have 2 separate tasks in the task list.

### After
If seat 51B requested:
1. "Beef" - Creates Task 1
2. "Water" - Merges into Task 1

You now have 1 consolidated task showing: "Beef + Water"

## Implementation Details

### Consolidation Logic
When creating a new task:
1. **Check for existing task**: The system checks if there's already a pending task for the same seat
2. **Merge if found**: 
   - Combines items (e.g., "beef, water")
   - Combines requests (e.g., "Beef please + Can I have water?")
   - Merges special requirements (removes duplicates)
   - Recalculates priority based on combined task
   - Updates timestamp to reflect latest request
3. **Create new if not found**: Creates a normal task if no pending task exists for that seat

### Key Features
- **Automatic deduplication**: If the same item is requested twice, it only appears once
- **Priority recalculation**: Priority is recalculated based on the combined task complexity
- **Timestamp update**: The task timestamp updates to reflect the most recent request
- **Status-aware**: Only merges with "pending" tasks (completed/in-progress tasks are not affected)

## Code Changes

### Modified Files
- `src/hooks/useTasks.ts` - Updated `createTask` function to check for and merge existing tasks
- `src/lib/firebase.ts` - Added `get` export for reading data before writing

### Technical Implementation
```typescript
// Check for existing pending task
const snapshot = await get(tasksRef);
if (snapshot.exists()) {
  const allTasks = snapshot.val();
  for (const [taskId, task] of Object.entries(allTasks)) {
    if (task.seat === taskData.seat && task.status === "pending") {
      // Found existing task - merge instead of creating new
      existingTaskId = taskId;
      existingTask = task;
      break;
    }
  }
}

// If existing task found, update it with combined data
if (existingTaskId && existingTask) {
  const combinedItems = [...existingItems, ...newItems];
  const combinedRequest = existingTask.request + " + " + taskData.request;
  await update(taskRef, {
    request: combinedRequest,
    item: combinedItemString,
    priority: recalculatedPriority,
    timestamp: Date.now()
  });
}
```

## Console Logging

The system provides clear console logs:
- `🔄 Found existing task for seat 51B, merging...` - When merging occurs
- `✅ Merged task for seat 51B: beef, water` - Confirmation of merge with item list
- `📋 Created task with auto-assigned priority: normal` - When creating a new task

## Benefits

1. **Cleaner task list**: No duplicate entries for the same seat
2. **Better overview**: Flight attendants can see all requests from a passenger at once
3. **Efficiency**: Handle multiple requests in one trip
4. **Accurate inventory**: Items are tracked correctly without over-reservation
5. **Smart prioritization**: Combined tasks may have different priority than individual ones

## Example Scenarios

### Scenario 1: Multiple Beverage Requests
```
Time 10:00 - "51B wants coffee"
  → Creates task: Seat 51B - coffee

Time 10:02 - "51B also wants water"
  → Updates task: Seat 51B - coffee, water
```

### Scenario 2: Mixed Request Types
```
Time 10:00 - "51B wants beef"
  → Creates task: Seat 51B - beef (meal)

Time 10:01 - "51B needs a blanket"
  → Updates task: Seat 51B - beef, blanket (meal + comfort)
```

### Scenario 3: Duplicate Items
```
Time 10:00 - "51B wants water"
  → Creates task: Seat 51B - water

Time 10:02 - "51B wants water again"
  → Updates task: Seat 51B - water (not duplicated)
```

## Firebase Database Structure

Tasks in Firebase Realtime Database:
```json
{
  "tasks": {
    "task-123": {
      "seat": "51B",
      "request": "Can I have beef? + Can I also get some water?",
      "item": "beef, water",
      "type": "meal",
      "priority": "normal",
      "status": "pending",
      "timestamp": 1699876543210,
      "specialRequirements": []
    }
  }
}
```

## Performance Considerations

- **Read before write**: The system performs one read operation to check for existing tasks before creating/updating
- **Minimal overhead**: Only reads from Firebase once per task creation
- **Efficient search**: Breaks loop as soon as matching task is found
- **Atomic operations**: Uses Firebase `update()` for safe concurrent modifications

## Future Enhancements

Potential improvements:
- Option to configure consolidation behavior (on/off per task type)
- Time window for consolidation (e.g., only merge if within 5 minutes)
- Visual indicator in UI showing consolidated tasks
- Separate display of each item with individual completion checkboxes

