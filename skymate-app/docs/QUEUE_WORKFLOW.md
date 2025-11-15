# Queue Workflow - Inventory Management

## 📋 Overview

The inventory system has **two main sections**:

1. **Main Inventory** (left column) - Available stock in storage
2. **Queue (In Use)** (right column) - Items taken out for service

---

## 🔄 Workflow

### When Item is Scanned with "REMOVE" Action:

```
1. Camera scans item
2. Detects: "Taking OUT" (hand gesture = out)
3. System executes:
   - Decrease quantity in Main Inventory (-1)
   - CREATE new entry in Queue (+1)
   - Add timestamp (takenAt)
   - Show success: "Item moved to queue for service"
```

### When Item is Scanned with "ADD" Action:

```
1. Camera scans item  
2. Detects: "Putting IN" (hand gesture = in)
3. System executes:
   - Increase quantity in Main Inventory (+1)
   - Item stays in Main Inventory
   - Show success: "Item added back to inventory"
```

---

## 📊 Queue Management

### Queue Entry Structure:
```typescript
{
  id: string,
  name: string,        // e.g., "Water Bottles"
  quantity: number,    // Always 1 per scan
  unit: string,        // e.g., "bottles"
  takenAt: timestamp,  // When it was taken
  inventoryItemId: string  // Link to main inventory
}
```

### Queue Actions:

#### 1. **Return to Inventory**
- Click "Return" button
- Item moves back to Main Inventory
- Queue entry deleted
- Main inventory quantity increases

#### 2. **Complete** (Consumed/Used)
- Click "Complete" button
- Confirms: "This will be removed permanently"
- Queue entry deleted
- Main inventory stays same (already deducted)
- Item is considered consumed/used

---

## 🎯 Use Cases

### Scenario 1: Flight Attendant Takes Water Bottles

```
Initial State:
Main Inventory: Water Bottles = 45
Queue: Empty

Action: Scan water bottle (gesture = OUT)

Result:
Main Inventory: Water Bottles = 44  ✅ -1
Queue: Water Bottles = 1            ✅ +1
```

### Scenario 2: Return Unused Items

```
Initial State:
Main Inventory: Coffee = 3
Queue: Coffee = 2

Action: Click "Return" on Coffee in queue

Result:
Main Inventory: Coffee = 5   ✅ +2
Queue: Coffee = 0             ✅ Removed
```

### Scenario 3: Complete Service (Item Used)

```
Initial State:
Main Inventory: Vegetarian Meals = 11
Queue: Vegetarian Meals = 1

Action: Click "Complete" on Vegetarian Meals

Result:
Main Inventory: Vegetarian Meals = 11  ✅ No change
Queue: Vegetarian Meals = 0            ✅ Removed
Status: Item considered consumed
```

---

## 🔄 Camera Scan Flow

### Remove (Take Out) Flow:
```
┌─────────────────────────────────────┐
│ 1. Scan item with camera            │
│    (Gesture: hand moving OUT)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Main Inventory: -1               │
│    Water Bottles: 45 → 44           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Queue: +1 (new entry)            │
│    Water Bottles: 1 unit            │
│    TakenAt: 2024-01-15 10:30 AM     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Show notification:               │
│    ✅ "Item Taken"                  │
│    "Water Bottles moved to queue"   │
└─────────────────────────────────────┘
```

### Add (Put Back) Flow:
```
┌─────────────────────────────────────┐
│ 1. Scan item with camera            │
│    (Gesture: hand moving IN)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Main Inventory: +1               │
│    Water Bottles: 44 → 45           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Show notification:               │
│    ✅ "Item Added"                  │
│    "Water Bottles added back"       │
└─────────────────────────────────────┘
```

---

## 💻 Implementation Code

### handleScanComplete Function:

```typescript
const handleScanComplete = async (result: any) => {
  const itemToUpdate = findItem(result.item.itemName);
  const isAdding = result.action === 'add';
  
  if (isAdding) {
    // PUT BACK: Just increase main inventory
    await updateInventoryQuantity(
      itemToUpdate.id, 
      itemToUpdate.quantity + 1
    );
    showSuccess("Item Added", "added back to inventory");
  } else {
    // TAKE OUT: Move to queue
    await moveToQueue(itemToUpdate.id, 1);
    showSuccess("Item Taken", "moved to queue for service");
  }
};
```

### Queue UI Display:

```tsx
<div className="queue-column">
  <h3>Queue (In Use)</h3>
  <p>{queueItems.length} items in queue</p>
  
  {queueItems.map(item => (
    <div key={item.id} className="queue-item">
      <h4>{item.name}</h4>
      <p>{item.quantity} {item.unit}</p>
      <p>Taken: {item.takenAt}</p>
      
      <button onClick={() => handleReturnFromQueue(item.id)}>
        Return
      </button>
      <button onClick={() => handleCompleteQueue(item.id)}>
        Complete
      </button>
    </div>
  ))}
</div>
```

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────┐
│                 INVENTORY PANEL                      │
├──────────────────────────┬──────────────────────────┤
│   MAIN INVENTORY         │   QUEUE (IN USE)         │
│   (Available Stock)      │   (Taken for Service)    │
├──────────────────────────┼──────────────────────────┤
│                          │                          │
│  📦 Water Bottles        │  📦 Water Bottles        │
│     45 bottles           │     1 bottle             │
│     Status: OK           │     Taken: 10:30 AM      │
│     [Scan Item]          │     [Return] [Complete]  │
│                          │                          │
│  🍽️ Vegetarian Meals    │  🍽️ Chicken Meals       │
│     12 meals             │     2 meals              │
│     Status: OK           │     Taken: 10:25 AM      │
│     [Scan Item]          │     [Return] [Complete]  │
│                          │                          │
│  ☕ Coffee               │  ☕ Tea                  │
│     3 pots               │     1 pot                │
│     Status: Critical     │     Taken: 10:15 AM      │
│     [Scan Item]          │     [Return] [Complete]  │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

---

## 🔔 Notifications

### Success Messages:

- **Item Taken**: `"{ItemName} moved to queue for service"`
- **Item Added**: `"{ItemName} added back to inventory"`
- **Item Returned**: `"{ItemName} returned to inventory"`
- **Item Completed**: `"{ItemName} service completed"`

### Undo Feature:

```
┌─────────────────────────────────────────┐
│  ℹ️ Item deducted                       │
│  Water Bottles                          │
│  [Undo] [✕]                             │
└─────────────────────────────────────────┘
```

- Appears for 5 seconds after scan
- Click "Undo" to reverse the action
- Works for both add and remove

---

## 📱 Mobile Experience

### Queue Badge:
```
┌─────────────────────┐
│  Queue (In Use)     │
│  🔵 3 items         │  ← Badge shows count
└─────────────────────┘
```

### Quick Actions:
- Swipe left/right for Return/Complete
- Tap item for details
- Pull to refresh queue

---

## 🧪 Testing Scenarios

### Test 1: Basic Take Out
```
1. Scan water bottle (gesture OUT)
2. Verify: Main inventory -1
3. Verify: Queue +1
4. Verify: Success notification shown
```

### Test 2: Put Back
```
1. Scan water bottle (gesture IN)
2. Verify: Main inventory +1
3. Verify: Queue unchanged
4. Verify: Success notification shown
```

### Test 3: Return from Queue
```
1. Click "Return" on queue item
2. Verify: Queue item removed
3. Verify: Main inventory increased
```

### Test 4: Complete from Queue
```
1. Click "Complete" on queue item
2. Confirm dialog appears
3. Verify: Queue item removed
4. Verify: Main inventory unchanged
```

### Test 5: Undo
```
1. Scan item
2. Click "Undo" within 5 seconds
3. Verify: Action reversed
4. Verify: Quantities restored
```

---

## 🚨 Error Handling

### Errors to Handle:

1. **Item not found**: 
   - Show: "Item not in inventory"
   - Don't move to queue

2. **Zero quantity**:
   - Show: "No stock available"
   - Can't take out

3. **Firebase error**:
   - Show: "Failed to update inventory"
   - Keep previous state

4. **Network timeout**:
   - Retry 3 times
   - Show error if all fail

---

## 📊 Analytics & Tracking

### Metrics to Track:

- Items taken per hour
- Average time in queue
- Most frequently taken items
- Return vs Complete ratio
- Peak usage times

### Firebase Structure:
```
inventory/
  └── items/
       ├── item-1/
       │   ├── quantity: 45
       │   └── ...
       └── ...

queue/
  └── items/
       ├── queue-1/
       │   ├── name: "Water Bottles"
       │   ├── quantity: 1
       │   ├── takenAt: timestamp
       │   └── inventoryItemId: "item-1"
       └── ...
```

---

## 🎯 Summary

**Queue System Benefits:**

✅ Track items currently in use
✅ Know what's being served
✅ Easy return of unused items
✅ Accurate consumption tracking
✅ Real-time inventory status
✅ Audit trail of item movement

**Key Features:**

- Automatic queue entry on "REMOVE" scan
- Direct inventory update on "ADD" scan
- Manual return/complete actions
- Undo capability
- Success notifications
- Real-time sync with Firebase

