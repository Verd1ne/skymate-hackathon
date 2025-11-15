# Inventory System - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Application

```bash
cd skymate-app
npm run dev
```

### Step 2: Navigate to Queue Tab

1. Open the Galley App
2. Click the **"Queue"** tab at the bottom (Database icon)

### Step 3: Initialize Your Inventory

1. Click **"Initialize Inventory"** button
2. Default items will be loaded into your database

**✅ You're ready to go!**

---

## 📖 How It Works

### The Two Columns

```
┌─────────────────────┬─────────────────────┐
│   MAIN INVENTORY    │   QUEUE (In Use)    │
├─────────────────────┼─────────────────────┤
│ All items in stock  │ Items being used    │
│                     │                     │
│ • Vegetarian Meals  │ • Coffee (2 pots)   │
│ • Water Bottles     │   Taken: 10:30 AM   │
│ • Blankets          │                     │
│                     │ [Return] [Complete] │
└─────────────────────┴─────────────────────┘
```

### The Workflow

```
1. Item in Main Inventory
   ↓
2. Click item → Set quantity → Move to Queue
   ↓
3. Item appears in Queue (quantity deducted from Main)
   ↓
4. Two options:
   a) Complete → Item deleted permanently
   b) Return → Item goes back to Main Inventory
```

---

## 🎯 Common Tasks

### Task 1: Use an Item (e.g., Serving Coffee)

1. **In Main Inventory**, click "Coffee"
2. Set quantity to `2` (2 pots needed)
3. Click **"Move to Queue"**
4. ✅ Coffee is now in the Queue column
5. After service, click **"Complete"** in Queue
6. ✅ Item is consumed and removed

### Task 2: Undo a Mistake

1. You accidentally moved 10 water bottles
2. **In Queue**, find "Water Bottles"
3. Click **"Return"** button
4. ✅ Water bottles are back in Main Inventory

### Task 3: Check Low Stock

Look for colored indicators:
- 🟢 **Green** = Good stock
- 🟠 **Orange** = Low stock
- 🔴 **Red** = Critical - needs restocking!

---

## 📊 Understanding Status Indicators

| Color | Status | Meaning | Action |
|-------|--------|---------|--------|
| 🟢 Green | OK | Quantity > threshold × 1.5 | No action needed |
| 🟠 Orange | Low | Quantity ≤ threshold × 1.5 | Consider restocking |
| 🔴 Red | Critical | Quantity ≤ threshold | Restock immediately |

---

## 💡 Example Scenario: Flight Service

**Before Takeoff** (Main Inventory)
- Vegetarian Meals: 12 meals 🟢
- Water Bottles: 45 bottles 🟢
- Coffee: 3 pots 🟠

**During Service**
1. Move 8 Vegetarian Meals to Queue
2. Move 20 Water Bottles to Queue
3. Move 2 Coffee pots to Queue

**After Service**
1. Complete all items in Queue
2. Main Inventory updated:
   - Vegetarian Meals: 4 meals 🔴 ← Need restock!
   - Water Bottles: 25 bottles 🟢
   - Coffee: 1 pot 🔴 ← Need restock!

---

## 🔄 Inventory Tracking

### Queue Tab (Database-based)

- Manual selection via voice commands or UI
- Task-based workflow
- Real-time Firebase sync
- Voice-powered for hands-free operation

**Access via the bottom navigation!**

---

## 🛠️ Tips & Best Practices

### ✅ Do's

- ✅ Complete queue items promptly after use
- ✅ Use "Return" for mistakes or cancellations
- ✅ Monitor red/orange items regularly
- ✅ Initialize inventory only once

### ❌ Don'ts

- ❌ Don't leave items in queue unnecessarily
- ❌ Don't initialize multiple times (duplicates)
- ❌ Don't manually edit Firebase database (use the UI)

---

## 🔧 Troubleshooting

### Problem: "Firebase not configured" error

**Solution:**
1. Create `.env` file in `skymate-app/` folder
2. Add Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```
3. Restart dev server: `npm run dev`

### Problem: Items not syncing

**Solution:**
- Check internet connection
- Verify Firebase Database rules allow read/write
- Refresh the page

### Problem: Can't complete queue item

**Solution:**
- Make sure the item exists in the queue
- Check browser console for errors
- Verify Firebase connection

---

## 📱 Mobile-Friendly

The inventory system is fully responsive and works great on tablets and mobile devices used by flight crews!

---

## 🎓 Next Steps

1. ✅ Read the full documentation: `INVENTORY_SYSTEM.md`
2. ✅ Set up Firebase (see `TESTING.md`)
3. ✅ Customize inventory items for your needs
4. ✅ Train your team on the workflow

---

## 📞 Need Help?

Check out these resources:
- Full documentation: `docs/INVENTORY_SYSTEM.md`
- Firebase setup: `TESTING.md`
- API reference in `useInventory.ts`

**Happy tracking! ✈️**

