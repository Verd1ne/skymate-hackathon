/**
 * Flight Initialization Service
 * Automatically creates tasks from passenger database at the start of a flight
 * This includes special dietary requirements and special requests
 */

import { ref, push, get } from "firebase/database";
import { db } from "./firebase";
import {
	getAllSeatNumbers,
	getPassengerInfo,
	type PassengerInfo,
} from "../data/passengerData";

export interface InitializationStats {
	totalPassengers: number;
	tasksCreated: number;
	dietaryTasks: number;
	specialRequestTasks: number;
	priorityOrders: number;
	errors: number;
}

/**
 * Initialize flight tasks from passenger database
 * Creates tasks for dietary restrictions and special requests
 */
export async function initializeFlightTasks(): Promise<InitializationStats> {
	const stats: InitializationStats = {
		totalPassengers: 0,
		tasksCreated: 0,
		dietaryTasks: 0,
		specialRequestTasks: 0,
		priorityOrders: 0,
		errors: 0,
	};

	if (!db) {
		console.warn("⚠️ Firebase not configured, skipping flight initialization");
		return stats;
	}

	try {
		console.log("🛫 Starting flight initialization...");

		// Check if flight initialization tasks already exist (avoid duplicates)
		// Look for baby bassinet tasks which are our flight initialization markers
		const tasksRef = ref(db, "tasks");
		const tasksSnapshot = await get(tasksRef);

		if (tasksSnapshot.exists()) {
			const existingTasks = Object.values(tasksSnapshot.val());
			// Check if we already have baby bassinet tasks (our initialization markers)
			const hasBabyBassinetTasks = existingTasks.some(
				(task: any) =>
					task.status === "pending" &&
					task.item &&
					typeof task.item === "string" &&
					task.item.toLowerCase().includes("baby bassinet")
			);

			if (hasBabyBassinetTasks) {
				console.log(
					"✅ Flight already initialized (baby bassinet tasks exist), skipping..."
				);
				return stats;
			}
		}

		// Get all seat numbers from passenger database
		const seatNumbers = getAllSeatNumbers();
		stats.totalPassengers = seatNumbers.length;

		// Track diamond / gold members so we can seed demo orders for them
		const priorityTierPassengers: PassengerInfo[] = [];

		console.log(`📋 Processing ${seatNumbers.length} passengers...`);

		// Process each passenger
		for (const seatNumber of seatNumbers) {
			const passenger = getPassengerInfo(seatNumber);
			if (!passenger) continue;

			// Collect diamond and gold tier members
			if (
				passenger.membershipTier === "diamond" ||
				passenger.membershipTier === "gold"
			) {
				priorityTierPassengers.push(passenger);
			}

			try {
				// Create tasks for dietary restrictions (only vegan, not vegetarian)
				if (
					passenger.dietaryRestrictions &&
					passenger.dietaryRestrictions.length > 0
				) {
					for (const restriction of passenger.dietaryRestrictions) {
						// Only create tasks for vegan meals, not vegetarian
						if (restriction.toLowerCase() === "vegan") {
							await createDietaryTask(
								passenger.seatNumber,
								passenger.passengerName,
								restriction
							);
							stats.tasksCreated++;
							stats.dietaryTasks++;
						}
					}
				}

				// Create tasks for special requests
				if (passenger.specialRequests && passenger.specialRequests.length > 0) {
					for (const request of passenger.specialRequests) {
						await createSpecialRequestTask(
							passenger.seatNumber,
							passenger.passengerName,
							request
						);
						stats.tasksCreated++;
						stats.specialRequestTasks++;
					}
				}
			} catch (error) {
				console.error(`❌ Error processing passenger ${seatNumber}:`, error);
				stats.errors++;
			}
		}

		// Create a small set of demo orders (about 5) for diamond & gold members
		const priorityOrdersCreated = await createPriorityMemberOrders(
			priorityTierPassengers
		);
		stats.tasksCreated += priorityOrdersCreated;
		stats.priorityOrders = priorityOrdersCreated;

		console.log("✅ Flight initialization complete:", stats);
		return stats;
	} catch (error) {
		console.error("❌ Flight initialization failed:", error);
		stats.errors++;
		return stats;
	}
}

/**
 * Create a task for dietary restriction
 */
async function createDietaryTask(
	seat: string,
	passengerName: string,
	dietaryRestriction: string
): Promise<void> {
	if (!db) return;

	const tasksRef = ref(db, "tasks");

	// Map dietary restriction to meal item
	const mealItem = getDietaryMealItem(dietaryRestriction);

	const task = {
		seat,
		request: `${seat} ${passengerName} - ${dietaryRestriction} meal`,
		type: "meal" as const,
		item: mealItem,
		priority: "high" as const, // Dietary restrictions are high priority
		status: "pending" as const,
		timestamp: Date.now(),
		specialRequirements: [dietaryRestriction],
		passenger_flags: ["dietary_restriction"],
	};

	await push(tasksRef, task);
	console.log(`✅ Created dietary task: ${seat} - ${dietaryRestriction}`);
}

/**
 * Create a task for special request
 */
async function createSpecialRequestTask(
	seat: string,
	passengerName: string,
	specialRequest: string
): Promise<void> {
	if (!db) return;

	const tasksRef = ref(db, "tasks");

	// Determine task type and priority based on request
	const { type, priority } = categorizeRequest(specialRequest);

	const task = {
		seat,
		request: `${seat} ${passengerName} - ${specialRequest}`,
		type,
		item: specialRequest,
		priority,
		status: "pending" as const,
		timestamp: Date.now(),
	};

	await push(tasksRef, task);
	console.log(`✅ Created special request task: ${seat} - ${specialRequest}`);
}

/**
 * Create a handful of demo orders for diamond & gold members
 * so the task queue starts with some priority-guest activity.
 */
async function createPriorityMemberOrders(
	priorityPassengers: PassengerInfo[]
): Promise<number> {
	if (!db) return 0;
	if (!priorityPassengers.length) return 0;

	const tasksRef = ref(db, "tasks");
	const maxOrders = 5;
	let created = 0;

	// Keep things deterministic
	const sorted = [...priorityPassengers].sort((a, b) =>
		a.seatNumber.localeCompare(b.seatNumber)
	);

	// First pass: one meal order per priority guest
	for (const passenger of sorted) {
		if (created >= maxOrders) break;

		const seat = passenger.seatNumber;
		const mealItem = `${passenger.mealPreference} meal`;
		const isDiamond = passenger.membershipTier === "diamond";

		const task = {
			seat,
			request: `${seat} ${passenger.passengerName} - ${mealItem}`,
			type: "meal" as const,
			item: mealItem,
			priority: isDiamond ? ("urgent" as const) : ("high" as const),
			status: "pending" as const,
			timestamp: Date.now(),
			passenger_flags: ["priority_member"],
		};

		await push(tasksRef, task);
		created++;
	}

	// Second pass: add beverage orders until we hit the max
	const beverageOptions = [
		"bottle of water",
		"Hong Kong-style milk tea",
		"sparkling water",
		"green tea",
		"orange juice",
	];

	let drinkIndex = 0;
	while (
		created < maxOrders &&
		drinkIndex < beverageOptions.length &&
		sorted.length > 0
	) {
		const passenger = sorted[drinkIndex % sorted.length];
		const seat = passenger.seatNumber;
		const drinkItem = beverageOptions[drinkIndex];
		const isDiamond = passenger.membershipTier === "diamond";

		const task = {
			seat,
			request: `${seat} ${passenger.passengerName} - ${drinkItem}`,
			type: "beverage" as const,
			item: drinkItem,
			priority: isDiamond ? ("high" as const) : ("normal" as const),
			status: "pending" as const,
			timestamp: Date.now(),
			passenger_flags: ["priority_member"],
		};

		await push(tasksRef, task);
		created++;
		drinkIndex++;
	}

	return created;
}

/**
 * Map dietary restriction to meal item name
 */
function getDietaryMealItem(dietaryRestriction: string): string {
	const restriction = dietaryRestriction.toLowerCase();

	const mealMap: Record<string, string> = {
		vegan: "vegan meal",
		vegetarian: "vegetarian meal",
		"gluten-free": "gluten-free meal",
		"dairy-free": "dairy-free meal",
		halal: "halal meal",
		kosher: "kosher meal",
	};

	return mealMap[restriction] || `${dietaryRestriction} meal`;
}

/**
 * Categorize special request to determine task type and priority
 */
function categorizeRequest(request: string): {
	type:
		| "meal"
		| "beverage"
		| "comfort"
		| "assistance"
		| "medical"
		| "information";
	priority: "urgent" | "high" | "normal" | "low";
} {
	const requestLower = request.toLowerCase();

	// Beverages
	if (
		requestLower.includes("water") ||
		requestLower.includes("coffee") ||
		requestLower.includes("tea") ||
		requestLower.includes("juice") ||
		requestLower.includes("wine") ||
		requestLower.includes("beer")
	) {
		return { type: "beverage", priority: "normal" };
	}

	// Comfort items
	if (
		requestLower.includes("pillow") ||
		requestLower.includes("blanket") ||
		requestLower.includes("headphones") ||
		requestLower.includes("headset") ||
		requestLower.includes("magazine") ||
		requestLower.includes("newspaper")
	) {
		return { type: "comfort", priority: "low" };
	}

	// Food items
	if (
		requestLower.includes("meal") ||
		requestLower.includes("snack") ||
		requestLower.includes("fruit")
	) {
		return { type: "meal", priority: "normal" };
	}

	// Default to assistance with normal priority
	return { type: "assistance", priority: "normal" };
}

/**
 * Check if flight has been initialized
 */
export async function isFlightInitialized(): Promise<boolean> {
	if (!db) return false;

	try {
		const tasksRef = ref(db, "tasks");
		const snapshot = await get(tasksRef);

		if (!snapshot.exists()) return false;

		const tasks = Object.values(snapshot.val());
		// Consider initialized if there are any pending tasks
		return tasks.some((task: any) => task.status === "pending");
	} catch (error) {
		console.error("Error checking initialization status:", error);
		return false;
	}
}
