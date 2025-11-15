# Inventory Management System

## Overview

The Inventory Management System is a Firebase-based solution for tracking galley items. When a task is created for a passenger, inventory is automatically reserved and deducted from available stock.

## Key Concept

When a task is created:

- Items are **deducted from Main Inventory** immediately
- The task system tracks what items are allocated to which passengers
- When the task is completed, items are considered consumed (already deducted)

## Database Structure

### Firebase Realtime Database Schema

```
inventory/
  └── main/
      ├── {itemId1}
      │   ├── name: "Vegetarian Meals"
      │   ├── quantity: 12
      │   ├── threshold: 5
      │   ├── unit: "meals"
      │   ├── category: "food"
      │   └── timestamp: 1699564800000
      └── {itemId2}
          └── ...

tasks/
  ├── {taskId1}
  │   ├── seat: "52B"
  │   ├── request: "52B wants chicken meal"
  │   ├── type: "meal"
  │   ├── item: "chicken meal"
  │   ├── priority: "normal"
  │   ├── status: "pending"
  │   └── timestamp: 1699564900000
  └── {taskId2}
      └── ...
```

## Features

### 1. Main Inventory

- **View all items** with quantity, threshold, and status
- **Status indicators**:
  - 🔴 **Critical**: Quantity ≤ threshold
  - 🟠 **Low**: Quantity ≤ threshold × 1.5
  - 🟢 **OK**: Quantity > threshold × 1.5
- **Automatic deduction**: Items are deducted when tasks are created

### 2. Task-Inventory Integration

- **Automatic reservation**: When a task is created, inventory is automatically checked and reserved
- **Stock validation**: System prevents task creation if items are out of stock
- **Real-time tracking**: Tasks show which items are allocated to which seats

### 3. Real-time Sync

- All changes sync instantly across devices
- Uses Firebase Realtime Database listeners
- Automatic updates when data changes

## Usage Guide

### Initialize Inventory (First Time Only)

1. Open the application for the first time
2. Inventory will be automatically initialized with default items
3. View current stock levels in the Inventory tab

### Create a Task (Automatic Inventory Deduction)

1. Use voice command: "Skymate, 52B wants chicken meal"
2. System automatically:
   - Checks if item is in stock
   - Deducts quantity from Main Inventory
   - Creates task for seat 52B
3. If out of stock, you'll receive an alert

### Complete a Task

1. View tasks in the Task list
2. Mark task as complete when delivered
3. Inventory remains deducted (item consumed)

### Manual Inventory Adjustment

1. Navigate to Inventory Management
2. Select item to adjust
3. Update quantity manually if needed (for restocking)

## API Reference

### useInventory Hook

```typescript
const {
  mainInventory, // Array of inventory items
  loading, // Loading state
  error, // Error message
  initializeInventory, // Initialize with default items
  addInventoryItem, // Add new item to inventory
  updateInventoryQuantity, // Update item quantity
  deleteInventoryItem, // Delete item completely
  checkStock, // Check if item is in stock
  reserveItemForTask, // Reserve item when creating task
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

#### `checkStock(itemName)`

Checks if an item is in stock.

```typescript
const { inStock, quantity, itemId } = await checkStock("Chicken Meal");
```

#### `reserveItemForTask(itemName, seat, quantity)`

Reserves item for a task by reducing inventory. Called automatically when tasks are created.

```typescript
const reserved = await reserveItemForTask("Chicken Meal", "52B", 1);
```

## Integration with Task System

The inventory system is integrated with the task management system:

- When a voice command creates a task (e.g., "Skymate, 52B wants chicken meal")
- System automatically checks stock availability
- If in stock, inventory is reserved and deducted immediately
- Task is created with the allocated item
- If out of stock, user receives an alert and task is not created

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

### Example 1: Creating a Task with Automatic Inventory Deduction

1. Flight attendant says: "Skymate, 52B wants chicken meal"
2. System checks Main Inventory for "Chicken Meal"
3. If available: Main Inventory: 12 → 11 meals
4. Task is created for seat 52B with chicken meal
5. Flight attendant delivers the meal and marks task complete
6. Main Inventory remains at 11 meals (consumed)

### Example 2: Out of Stock Prevention

1. Flight attendant says: "Skymate, 30A wants vegetarian meal"
2. System checks inventory: Vegetarian meals = 0
3. System responds: "No stock available"
4. Task is NOT created
5. Flight attendant restocks inventory before attempting again

### Example 3: Low Stock Alert

1. Item quantity drops below threshold
2. Status indicator turns 🔴 Critical
3. Restock needed
4. Use inventory management to update quantities manually

## Best Practices

1. **Regular Monitoring**: Check status indicators regularly
2. **Complete Tasks Promptly**: Mark tasks complete when delivered to keep accurate tracking
3. **Monitor Stock Levels**: Watch for critical/low stock alerts
4. **Maintain Thresholds**: Update thresholds based on flight needs
5. **Restock Promptly**: Address critical/low items immediately before they run out

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
- [ ] Automatic restock notifications when items reach threshold
- [ ] Historical usage analytics and consumption patterns
- [ ] Multi-user role permissions
- [ ] Batch operations for inventory updates
- [ ] Export inventory reports
- [ ] Predictive stock management based on flight routes and passenger counts
