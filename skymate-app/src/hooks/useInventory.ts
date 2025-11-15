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

export function useInventory() {
	const [mainInventory, setMainInventory] = useState<InventoryItem[]>([]);
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
	 * Reserve item for task - reduces main inventory
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
		loading,
		error,
		initializeInventory,
		addInventoryItem,
		updateInventoryQuantity,
		deleteInventoryItem,
		checkStock,
		reserveItemForTask,
	};
}
