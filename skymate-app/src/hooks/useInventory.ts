import { useState, useEffect } from "react";
import { db, ref, onValue, update, push, remove, get } from "../lib/firebase";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  unit: string;
  category: 'food' | 'headphone' | 'wine' | 'bottle' | 'towel';
  galley?: number; // 1=Beverages, 2=Food, 3=Towels & Amenities
  timestamp: number;
}

export interface QueueItem {
	id: string;
	inventoryItemId: string;
	name: string;
	quantity: number;
	unit: string;
	category: string;
	takenAt: number;
	takenBy?: string;
	status: "in_use" | "pending_deletion";
}

export function useInventory() {
	const [mainInventory, setMainInventory] = useState<InventoryItem[]>([]);
	const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Listen to Main Inventory
	useEffect(() => {
		if (!db) {
			setError("Firebase not configured. Please check your .env file.");
			setLoading(false);
			return;
		}

		const inventoryRef = ref(db, "inventory/main");

		const unsubscribe = onValue(
			inventoryRef,
			(snapshot) => {
				const data = snapshot.val();
				if (data) {
					const items = Object.entries(data).map(
						([id, item]: [string, any]) => ({
							id,
							...item,
						})
					);
					setMainInventory(items.sort((a, b) => a.name.localeCompare(b.name)));
				} else {
					setMainInventory([]);
				}
				setLoading(false);
				setError(null);
			},
			(error: any) => {
				console.error("Firebase inventory error:", error);
				setError(`Inventory error: ${error.message}`);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	// Listen to Queue
	useEffect(() => {
		if (!db) return;

		const queueRef = ref(db, "inventory/queue");

		const unsubscribe = onValue(
			queueRef,
			(snapshot) => {
				const data = snapshot.val();
				if (data) {
					const items = Object.entries(data).map(
						([id, item]: [string, any]) => ({
							id,
							...item,
						})
					);
					setQueueItems(items.sort((a, b) => b.takenAt - a.takenAt));
				} else {
					setQueueItems([]);
				}
			},
			(error: any) => {
				console.error("Firebase queue error:", error);
			}
		);

		return () => unsubscribe();
	}, []);

	/**
	 * Initialize inventory with default items
	 * Only call this once to set up your database
	 */
	const initializeInventory = async () => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		const defaultItems: Omit<InventoryItem, "id">[] = [
			{
				name: "Vegetarian Meals",
				quantity: 12,
				threshold: 5,
				unit: "meals",
				category: "food",
				timestamp: Date.now(),
			},
			{
				name: "Chicken Meals",
				quantity: 8,
				threshold: 3,
				unit: "meals",
				category: "food",
				timestamp: Date.now(),
			},
			{
				name: "Beef Meals",
				quantity: 15,
				threshold: 5,
				unit: "meals",
				category: "food",
				timestamp: Date.now(),
			},
			{
				name: "Water Bottles",
				quantity: 45,
				threshold: 20,
				unit: "bottles",
				category: "bottle",
				timestamp: Date.now(),
			},
			{
				name: "Soft Drinks",
				quantity: 30,
				threshold: 15,
				unit: "cans",
				category: "bottle",
				timestamp: Date.now(),
			},
			{
				name: "Coffee",
				quantity: 3,
				threshold: 5,
				unit: "pots",
				category: "food",
				timestamp: Date.now(),
			},
			{
				name: "Tea",
				quantity: 2,
				threshold: 5,
				unit: "pots",
				category: "food",
				timestamp: Date.now(),
			},
			{
				name: "Blankets",
				quantity: 25,
				threshold: 10,
				unit: "units",
				category: "towel",
				timestamp: Date.now(),
			},
			{
				name: "Pillows",
				quantity: 20,
				threshold: 10,
				unit: "units",
				category: "towel",
				timestamp: Date.now(),
			},
		];

		const inventoryRef = ref(db, "inventory/main");

		for (const item of defaultItems) {
			await push(inventoryRef, item);
		}

		console.log("✅ Inventory initialized with default items");
	};

	/**
	 * Add a new item to main inventory
	 */
	const addInventoryItem = async (
		item: Omit<InventoryItem, "id" | "timestamp">
	) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const inventoryRef = ref(db, "inventory/main");
			await push(inventoryRef, {
				...item,
				timestamp: Date.now(),
			});
			console.log(`✅ Added item: ${item.name}`);
		} catch (error: any) {
			console.error("Failed to add inventory item:", error);
			throw error;
		}
	};

	/**
	 * Update an item's quantity in main inventory
	 */
	const updateInventoryQuantity = async (
		itemId: string,
		newQuantity: number
	) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const itemRef = ref(db, `inventory/main/${itemId}`);
			await update(itemRef, { quantity: newQuantity });
			console.log(`✅ Updated quantity for item ${itemId}`);
		} catch (error: any) {
			console.error("Failed to update inventory:", error);
			throw error;
		}
	};

	/**
	 * Move item to queue (when taken for use)
	 */
	const moveToQueue = async (
		itemId: string,
		quantityTaken: number = 1,
		takenBy?: string
	) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const item = mainInventory.find((i) => i.id === itemId);
			if (!item) {
				throw new Error("Item not found in inventory");
			}

			if (item.quantity < quantityTaken) {
				throw new Error("Insufficient quantity in inventory");
			}

			// Deduct from main inventory
			await updateInventoryQuantity(itemId, item.quantity - quantityTaken);

			// Add to queue
			const queueRef = ref(db, "inventory/queue");
			await push(queueRef, {
				inventoryItemId: itemId,
				name: item.name,
				quantity: quantityTaken,
				unit: item.unit,
				category: item.category,
				takenAt: Date.now(),
				takenBy: takenBy || "Unknown",
				status: "in_use",
			});

			console.log(
				`✅ Moved ${quantityTaken} ${item.unit} of ${item.name} to queue`
			);
		} catch (error: any) {
			console.error("Failed to move item to queue:", error);
			throw error;
		}
	};

	/**
	 * Complete queue item - this DELETES the item from main inventory
	 * Use this when the item is consumed/used and won't be returned
	 */
	const completeQueueItem = async (queueItemId: string) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const queueItem = queueItems.find((i) => i.id === queueItemId);
			if (!queueItem) {
				throw new Error("Queue item not found");
			}

			// Simply remove from queue
			// The quantity was already deducted from main inventory when moved to queue
			const queueItemRef = ref(db, `inventory/queue/${queueItemId}`);
			await remove(queueItemRef);

			console.log(
				`✅ Completed queue item: ${queueItem.name} (deleted from system)`
			);
		} catch (error: any) {
			console.error("Failed to complete queue item:", error);
			throw error;
		}
	};

	/**
	 * Return item from queue back to main inventory
	 * Use this to undo/cancel a queue operation
	 */
	const returnFromQueue = async (queueItemId: string) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const queueItem = queueItems.find((i) => i.id === queueItemId);
			if (!queueItem) {
				throw new Error("Queue item not found");
			}

			const mainItem = mainInventory.find(
				(i) => i.id === queueItem.inventoryItemId
			);
			if (!mainItem) {
				throw new Error("Original inventory item not found");
			}

			// Return quantity to main inventory
			await updateInventoryQuantity(
				queueItem.inventoryItemId,
				mainItem.quantity + queueItem.quantity
			);

			// Remove from queue
			const queueItemRef = ref(db, `inventory/queue/${queueItemId}`);
			await remove(queueItemRef);

			console.log(
				`✅ Returned ${queueItem.quantity} ${queueItem.unit} of ${queueItem.name} to inventory`
			);
		} catch (error: any) {
			console.error("Failed to return item from queue:", error);
			throw error;
		}
	};

	/**
	 * Delete an item completely from main inventory
	 */
	const deleteInventoryItem = async (itemId: string) => {
		if (!db) {
			throw new Error("Firebase not configured");
		}

		try {
			const itemRef = ref(db, `inventory/main/${itemId}`);
			await remove(itemRef);
			console.log(`✅ Deleted item from inventory`);
		} catch (error: any) {
			console.error("Failed to delete inventory item:", error);
			throw error;
		}
	};

	/**
	 * Check if an item is in stock
	 * Used for stock validation before task creation
	 */
	const checkStock = async (
		itemName: string
	): Promise<{ inStock: boolean; quantity: number; itemId: string | null }> => {
		if (!db) {
			return { inStock: false, quantity: 0, itemId: null };
		}

		try {
			const inventoryRef = ref(db, "inventory/main");
			const snapshot = await get(inventoryRef);

			if (!snapshot.exists()) {
				return { inStock: false, quantity: 0, itemId: null };
			}

			const data = snapshot.val();
			const items = Object.entries(data);

			// Find matching item (case-insensitive)
			for (const [id, item] of items) {
				if ((item as any).name.toLowerCase() === itemName.toLowerCase()) {
					const quantity = (item as any).quantity;
					return {
						inStock: quantity > 0,
						quantity,
						itemId: id,
					};
				}
			}

			return { inStock: false, quantity: 0, itemId: null };
		} catch (error) {
			console.error("Stock check failed:", error);
			return { inStock: false, quantity: 0, itemId: null };
		}
	};

	/**
	 * Reserve item for task - moves to queue and reduces main inventory
	 * Called when a task is created
	 */
	const reserveItemForTask = async (
		itemName: string,
		seat: string,
		quantityNeeded: number = 1
	): Promise<boolean> => {
		if (!db) {
			console.error("Firebase not configured");
			return false;
		}

		try {
			const inventoryRef = ref(db, "inventory/main");
			const snapshot = await get(inventoryRef);

			if (!snapshot.exists()) {
				console.warn("No inventory found");
				return false;
			}

			const data = snapshot.val();

			// Find matching item (case-insensitive)
			for (const [itemId, itemData] of Object.entries(data)) {
				const item = itemData as any;
				if (item.name.toLowerCase() === itemName.toLowerCase()) {
					// Check if enough quantity available
					if (item.quantity < quantityNeeded) {
						console.warn(
							`Insufficient quantity: ${item.quantity} available, ${quantityNeeded} needed`
						);
						return false;
					}

					// Deduct from main inventory
					const newQuantity = item.quantity - quantityNeeded;
					const itemRef = ref(db, `inventory/main/${itemId}`);
					await update(itemRef, { quantity: newQuantity });

					// Add to queue
					const queueRef = ref(db, "inventory/queue");
					await push(queueRef, {
						inventoryItemId: itemId,
						name: item.name,
						quantity: quantityNeeded,
						unit: item.unit,
						category: item.category,
						takenAt: Date.now(),
						takenBy: seat,
						status: "in_use",
					});

					console.log(
						`✅ Reserved ${quantityNeeded} ${item.unit} of ${item.name} for seat ${seat}. Main inventory: ${item.quantity} → ${newQuantity}`
					);
					return true;
				}
			}

			console.warn(`Item not found in inventory: ${itemName}`);
			return false;
		} catch (error) {
			console.error("Failed to reserve item:", error);
			return false;
		}
	};

	return {
		mainInventory,
		queueItems,
		loading,
		error,
		initializeInventory,
		addInventoryItem,
		updateInventoryQuantity,
		moveToQueue,
		completeQueueItem,
		returnFromQueue,
		deleteInventoryItem,
		checkStock,
		reserveItemForTask,
	};
}
