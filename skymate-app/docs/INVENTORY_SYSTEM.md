# Inventory Management System

## Overview

The Inventory Management System is a Firebase-based solution for tracking galley items across two stages:

1. **Main Inventory** - All available items in stock
2. **Queue** - Items currently being used/worked on

## Key Concept

When items are moved to the **Queue**, they are:

- Deducted from **Main Inventory** quantity
- Added to the **Queue** as "in use"

When **Queue** work is completed, the item is:

- Removed from the **Queue**
- **NOT** returned to Main Inventory (consumed/used)

## Database Structure

### Firebase Realtime Database Schema

```
inventory/
  ├── main/
  │   ├── {itemId1}
  │   │   ├── name: "Vegetarian Meals"
  │   │   ├── quantity: 12
  │   │   ├── threshold: 5
  │   │   ├── unit: "meals"
  │   │   ├── category: "food"
  │   │   └── timestamp: 1699564800000
  │   └── {itemId2}
  │       └── ...
  └── queue/
      ├── {queueId1}
      │   ├── inventoryItemId: "itemId1"
      │   ├── name: "Vegetarian Meals"
      │   ├── quantity: 2
      │   ├── unit: "meals"
      │   ├── category: "food"
      │   ├── takenAt: 1699564900000
      │   ├── takenBy: "Flight Attendant #1"
      │   └── status: "in_use"
      └── {queueId2}
          └── ...
```

## Features

### 1. Main Inventory

- **View all items** with quantity, threshold, and status
- **Status indicators**:
  - 🔴 **Critical**: Quantity ≤ threshold
  - 🟠 **Low**: Quantity ≤ threshold × 1.5
  - 🟢 **OK**: Quantity > threshold × 1.5
- **Move to Queue**: Select item and specify quantity

### 2. Queue Management

- **View in-use items** with timestamp
- **Return to Inventory**: Undo/cancel queue operation
- **Complete**: Mark as used and remove from system

### 3. Real-time Sync

- All changes sync instantly across devices
- Uses Firebase Realtime Database listeners
- Automatic updates when data changes

## Usage Guide

### Initialize Inventory (First Time Only)

1. Navigate to the **Queue** tab in Galley App
2. Click **"Initialize Inventory"** button
3. Default items will be added to Main Inventory

### Move Item to Queue

1. Click on an item in **Main Inventory**
2. Adjust the **quantity** you want to move
3. Click **"Move to Queue"**
4. Item quantity is deducted from Main Inventory
5. Item appears in Queue column

### Complete Queue Item (Delete from System)

1. In **Queue** column, find the item
2. Click **"Complete"** button
3. Confirm the action
4. Item is removed from Queue
5. **Main Inventory is NOT affected** (already deducted)

### Return from Queue (Undo)

1. In **Queue** column, find the item
2. Click **"Return"** button
3. Item quantity is restored to Main Inventory
4. Item is removed from Queue

## API Reference

### useInventory Hook

```typescript
const {
  mainInventory, // Array of inventory items
  queueItems, // Array of queue items
  loading, // Loading state
  error, // Error message
  initializeInventory, // Initialize with default items
  addInventoryItem, // Add new item to inventory
  updateInventoryQuantity, // Update item quantity
  moveToQueue, // Move item from main to queue
  completeQueueItem, // Complete and delete from system
  returnFromQueue, // Return item to main inventory
  deleteInventoryItem, // Delete item completely
} = useInventory();
```

### Functions

#### `initializeInventory()`

Initializes the database with default inventory items. Only call once.

```typescript
await initializeInventory();
```

#### `addInventoryItem(item)`

Adds a new item to main inventory.

```typescript
await addInventoryItem({
  name: "Orange Juice",
  quantity: 20,
  threshold: 10,
  unit: "bottles",
  category: "bottle",
});
```

#### `moveToQueue(itemId, quantity, takenBy?)`

Moves item from main inventory to queue.

```typescript
await moveToQueue("item123", 2, "Flight Attendant #1");
```

#### `completeQueueItem(queueItemId)`

Completes queue item (deletes from system).

```typescript
await completeQueueItem("queue456");
```

#### `returnFromQueue(queueItemId)`

Returns item from queue back to main inventory.

```typescript
await returnFromQueue("queue456");
```

## Integration with Camera Scanner

The original `InventoryPanel.tsx` includes camera vision capabilities:

- Scan items using OpenAI Vision API
- Automatically detect and classify items
- Auto-deduct from inventory

The new `InventoryPanelFirebase.tsx` focuses on queue management:

- Manual inventory tracking
- Queue workflow management
- Real-time Firebase sync

Both panels are available in the Galley App:

- **Scanner** tab: Camera-based inventory scanning
- **Queue** tab: Firebase-based queue management

## Firebase Setup

### Required Configuration

Add to `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### Database Rules

Set Firebase Realtime Database rules for development:

```json
{
  "rules": {
    "inventory": {
      ".read": true,
      ".write": true
    }
  }
}
```

For production, implement proper authentication and security rules.

## Workflow Examples

### Example 1: Serving Meals

1. Flight attendant needs 5 vegetarian meals
2. Select "Vegetarian Meals" in Main Inventory
3. Set quantity to 5
4. Click "Move to Queue"
5. Main Inventory: 12 → 7 meals
6. Queue: +5 meals (in use)
7. After service is complete, click "Complete"
8. Queue: Item removed
9. Main Inventory: Still 7 meals (consumed)

### Example 2: Accidental Queue Entry (Undo)

1. Accidentally moved 10 water bottles to queue
2. In Queue, click "Return" on the water bottles item
3. Queue: Item removed
4. Main Inventory: Quantity restored (+10)

### Example 3: Low Stock Alert

1. Item quantity drops below threshold
2. Status indicator turns 🔴 Critical
3. Restock needed
4. Use `updateInventoryQuantity()` to add stock

## Best Practices

1. **Regular Monitoring**: Check status indicators regularly
2. **Complete Queue Items**: Don't let items sit in queue
3. **Return Mistakes**: Use Return button for accidental moves
4. **Maintain Thresholds**: Update thresholds based on flight needs
5. **Restock Promptly**: Address critical/low items immediately

## Troubleshooting

### Items Not Appearing

- Check Firebase configuration in `.env`
- Verify Firebase Realtime Database rules allow read/write
- Check browser console for errors

### Sync Issues

- Verify internet connection
- Check Firebase Console for database status
- Restart the application

### Initialization Failed

- Ensure Firebase is properly configured
- Check console for specific error messages
- Verify database rules allow writes

## Future Enhancements

- [ ] Barcode scanning integration
- [ ] Automatic restock notifications
- [ ] Historical usage analytics
- [ ] Multi-user role permissions
- [ ] Batch operations
- [ ] Export reports
- [ ] Integration with flight manifest data
