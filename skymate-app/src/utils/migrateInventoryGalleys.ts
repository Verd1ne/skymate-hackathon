/**
 * Migration script to add 'galley' field to existing inventory items
 * Run this ONCE to update your Firebase database
 */

import { db, ref, update, get } from "../lib/firebase";

/**
 * Galley mapping:
 * - Galley 1 = Beverages (Water, Soft Drinks, Coffee, Tea, etc.)
 * - Galley 2 = Food (Meals)
 * - Galley 3 = Towels & Amenities (Blankets, Pillows, Headphones, etc.)
 */

// Map item names to galley numbers
const ITEM_TO_GALLEY_MAP: Record<string, number> = {
	// Galley 1: Beverages
	"Water Bottles": 1,
	"Soft Drinks": 1,
	Coffee: 1,
	Tea: 1,
	"Orange Juice": 1,
	"Apple Juice": 1,
	"Red Wine": 1,
	"White Wine": 1,
	Beer: 1,
	Champagne: 1,

	// Galley 2: Food
	"Vegetarian Meals": 2,
	"Chicken Meals": 2,
	"Beef Meals": 2,
	"Fish Meals": 2,
	Pasta: 2,
	Salad: 2,
	Snacks: 2,
	Dessert: 2,
	Breakfast: 2,

	// Galley 3: Towels & Amenities
	Blankets: 3,
	Pillows: 3,
	Headphones: 3,
	Towels: 3,
	"Amenity Kits": 3,
	Newspapers: 3,
	Magazines: 3,
};

// Fallback: map by category if name not found
const CATEGORY_TO_GALLEY_MAP: Record<string, number> = {
	bottle: 1, // Beverages
	wine: 1, // Beverages
	food: 2, // Food
	headphone: 3, // Amenities
	towel: 3, // Amenities
};

export async function migrateInventoryGalleys() {
	if (!db) {
		throw new Error("Firebase not configured");
	}

	console.log("🔄 Starting galley migration...");

	try {
		const inventoryRef = ref(db, "inventory/main");
		const snapshot = await get(inventoryRef);

		if (!snapshot.exists()) {
			console.log("⚠️ No inventory items found");
			return;
		}

		const data = snapshot.val();
		let updatedCount = 0;
		let skippedCount = 0;

		for (const [itemId, itemData] of Object.entries(data)) {
			const item = itemData as any;

			// Skip if galley already exists
			if (item.galley !== undefined && item.galley !== null) {
				console.log(
					`⏭️ Skipping "${item.name}" - galley already set to ${item.galley}`
				);
				skippedCount++;
				continue;
			}

			// Determine galley number
			let galleyNumber: number;

			// First, try to match by exact name
			if (ITEM_TO_GALLEY_MAP[item.name]) {
				galleyNumber = ITEM_TO_GALLEY_MAP[item.name];
			}
			// Fallback to category mapping
			else if (item.category && CATEGORY_TO_GALLEY_MAP[item.category]) {
				galleyNumber = CATEGORY_TO_GALLEY_MAP[item.category];
			}
			// Default to galley 2 (Food) if unknown
			else {
				galleyNumber = 2;
				console.warn(
					`⚠️ Unknown item "${item.name}" with category "${item.category}" - defaulting to galley 2`
				);
			}

			// Update the item with galley number
			const itemRef = ref(db, `inventory/main/${itemId}`);
			await update(itemRef, { galley: galleyNumber });

			console.log(`✅ Updated "${item.name}" → Galley ${galleyNumber}`);
			updatedCount++;
		}

		console.log("\n📊 Migration Summary:");
		console.log(`   ✅ Updated: ${updatedCount} items`);
		console.log(`   ⏭️ Skipped: ${skippedCount} items (already had galley)`);
		console.log("   ✨ Migration complete!");

		return { updatedCount, skippedCount };
	} catch (error) {
		console.error("❌ Migration failed:", error);
		throw error;
	}
}

// Helper function to manually assign galley to a specific item
export async function assignGalleyToItem(itemId: string, galleyNumber: number) {
	if (!db) {
		throw new Error("Firebase not configured");
	}

	if (galleyNumber < 1 || galleyNumber > 3) {
		throw new Error("Galley number must be 1, 2, or 3");
	}

	try {
		const itemRef = ref(db, `inventory/main/${itemId}`);
		await update(itemRef, { galley: galleyNumber });
		console.log(`✅ Assigned galley ${galleyNumber} to item ${itemId}`);
	} catch (error) {
		console.error("❌ Failed to assign galley:", error);
		throw error;
	}
}
