import { useState, useEffect, useMemo } from "react";
import { db, ref, push, onValue, update, get, set } from "../lib/firebase";
import { calculatePriority } from "../lib/priorityEngine";
import { escalationMonitor } from "../lib/priorityEscalation";
import { contextAI } from "../lib/contextAI";
import {
	scoreAndSortTasks,
	createDefaultFAState,
} from "../lib/taskScoringEngine";
import type { Task, FlightContext } from "../types";

export function useTasks() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!db) {
			setError("Firebase not configured. Please check your .env file.");
			setLoading(false);
			return;
		}

		const tasksRef = ref(db, "tasks");

		const unsubscribe = onValue(
			tasksRef,
			(snapshot) => {
				const data = snapshot.val();
				if (data) {
					const taskList = Object.entries(data).map(
						([id, task]: [string, any]) => ({
							id,
							...task,
						})
					);

					// Sort by PUP score instead of timestamp
					const fa = createDefaultFAState();
					const scoredTasks = scoreAndSortTasks(taskList, fa);
					const sortedTasks = scoredTasks.map((st) => st.task);

					setTasks(sortedTasks);
				} else {
					setTasks([]);
				}
				setLoading(false);
				setError(null);
			},
			(error: any) => {
				console.error("Firebase database error:", error);

				let errorMessage = `Database error: ${error.message}`;

				// Provide helpful messages for common errors
				if (
					error.code === "permission-denied" ||
					error.message?.includes("permission_denied")
				) {
					errorMessage =
						"Permission denied. Please update Firebase Realtime Database rules to allow read/write access. See FIREBASE_RULES_FIX.md for instructions.";
				} else if (error.message?.includes("network")) {
					errorMessage =
						"Network error. Please check your internet connection.";
				}

				setError(errorMessage);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	// Start priority escalation system on mount
	useEffect(() => {
		if (tasks.length === 0) return; // Wait for tasks to load

		const getTasks = () => tasks;

		escalationMonitor.start(getTasks, (task, oldPriority, newPriority) => {
			console.log(
				`🚨 Priority escalation: Seat ${task.seat} ${oldPriority} → ${newPriority}`
			);
		});

		return () => {
			escalationMonitor.stop();
		};
	}, [tasks]);

	// Run context analysis every 30 seconds
	useEffect(() => {
		if (tasks.length === 0) return; // Wait for tasks to load

		const analysisInterval = setInterval(() => {
			try {
				const insights = contextAI.analyzeFlightState(tasks);
				if (insights.length > 0) {
					console.log(
						`📊 Context analysis: ${insights.length} insights detected`
					);
				}
			} catch (error) {
				console.error("Error running context analysis:", error);
			}
		}, 30000); // 30 seconds

		return () => clearInterval(analysisInterval);
	}, [tasks]);

	const createTask = async (
		taskData: Omit<Task, "id" | "timestamp" | "status" | "priority">,
		flightContext?: FlightContext
	): Promise<{ consolidatedItems?: string }> => {
		if (!db) {
			throw new Error("Firebase not configured. Cannot create task.");
		}

		try {
			const firebasePushStart = Date.now();
			const tasksRef = ref(db, "tasks");
			
			// Check if there's an existing pending task for the same seat
			const snapshot = await get(tasksRef);
			let existingTaskId: string | null = null;
			let existingTask: any = null;
			
			if (snapshot.exists()) {
				const allTasks = snapshot.val();
				// Find pending task with same seat
				for (const [taskId, task] of Object.entries(allTasks)) {
					const t = task as any;
					if (t.seat === taskData.seat && t.status === "pending") {
						existingTaskId = taskId;
						existingTask = t;
						break;
					}
				}
			}
			
			if (existingTaskId && existingTask) {
				// Merge with existing task
				console.log(`🔄 Found existing task for seat ${taskData.seat}, merging...`);
				
				// Combine items
				const existingItems = existingTask.item ? existingTask.item.split(", ") : [];
				const newItems = taskData.item ? [taskData.item] : [];
				const combinedItems = [...new Set([...existingItems, ...newItems])]; // Remove duplicates
				const combinedItemString = combinedItems.filter(Boolean).join(", ");
				
				// Combine requests
				const combinedRequest = existingTask.request + " + " + taskData.request;
				
				// Combine special requirements
				const existingReqs = existingTask.specialRequirements || [];
				const newReqs = taskData.specialRequirements || [];
				const combinedSpecialReqs = [...new Set([...existingReqs, ...newReqs])]; // Remove duplicates
				
				// Recalculate priority with combined task
				const combinedTaskForPriority = {
					...existingTask,
					request: combinedRequest,
					item: combinedItemString,
					specialRequirements: combinedSpecialReqs,
				} as Task;
				
				const priorityResult = calculatePriority(
					combinedTaskForPriority,
					flightContext
				);
				
			// Update existing task
			const taskRef = ref(db, `tasks/${existingTaskId}`);
			const updateData: any = {
				request: combinedRequest,
				item: combinedItemString,
				priority: priorityResult.priority,
				// FIXED: Keep original timestamp to maintain task position in priority queue
				// Urgency should be calculated from when the first item was requested
				timestamp: existingTask.timestamp,
			};
				
				// Only include specialRequirements if it has values (Firebase doesn't allow undefined)
				if (combinedSpecialReqs.length > 0) {
					updateData.specialRequirements = combinedSpecialReqs;
				}
				
				await update(taskRef, updateData);
				
				console.log(
					`✅ Merged task for seat ${taskData.seat}: ${combinedItemString}`,
					{
						priority: priorityResult.priority,
						items: combinedItems.length,
					}
				);
				
				const firebasePushEnd = Date.now();
				const firebasePushTime = firebasePushEnd - firebasePushStart;
				console.log(`⏱️ Firebase operation completed in ${firebasePushTime}ms`);
				
				// Return consolidated items for voice confirmation
				console.log(`🔊 Returning consolidated items for voice: "${combinedItemString}"`);
				return { consolidatedItems: combinedItemString };
			} else {
				// Create new task
				// Auto-calculate priority if not provided
				const priorityResult = calculatePriority(
					{
						...taskData,
						id: "", // Temporary, will be set by Firebase
						timestamp: Date.now(),
						status: "pending",
						priority: "normal", // Will be calculated by priority engine
					} as Task,
					flightContext
				);

				const newTask = {
					...taskData,
					priority: priorityResult.priority, // Use calculated priority
					timestamp: Date.now(),
					status: "pending" as const,
				};

				console.log(
					`📋 Created task with auto-assigned priority: ${priorityResult.priority}`,
					{
						factors: priorityResult.factors,
						score: priorityResult.score,
					}
				);

				await push(tasksRef, newTask);
				
				const firebasePushEnd = Date.now();
				const firebasePushTime = firebasePushEnd - firebasePushStart;
				console.log(`⏱️ Firebase operation completed in ${firebasePushTime}ms`);
				
				// Return single item for voice confirmation
				return { consolidatedItems: taskData.item };
			}
		} catch (error: any) {
			console.error("Failed to create task:", error);
			throw error;
		}
	};

	const completeTask = async (taskId: string) => {
		if (!db) {
			throw new Error("Firebase not configured. Cannot complete task.");
		}

		try {
			// Get the task data before completing it
			const taskRef = ref(db, `tasks/${taskId}`);
			const taskSnapshot = await get(taskRef);
			
			if (taskSnapshot.exists()) {
				const task = taskSnapshot.val();
				
				// Update task status
				await update(taskRef, {
					status: "completed",
					completedAt: Date.now(),
				});
				
				// Add completed items to passenger's past food history
				if (task.seat && task.item) {
					const normalizedSeat = task.seat.replace(/\s+/g, "").toUpperCase();
					const items = task.item.split(",").map((i: string) => i.trim()).filter(Boolean);
					
					// Get current past food for this seat
					const pastFoodRef = ref(db, `passengerPastFood/${normalizedSeat}`);
					const pastFoodSnapshot = await get(pastFoodRef);
					
					let currentPastFood: string[] = [];
					if (pastFoodSnapshot.exists()) {
						currentPastFood = pastFoodSnapshot.val() || [];
					}
					
					// Add new items (avoiding duplicates)
					const updatedPastFood = [...new Set([...currentPastFood, ...items])];
					
					// Save back to Firebase using set() for arrays
					await set(pastFoodRef, updatedPastFood);
					
					console.log(`✅ Added ${items.join(", ")} to past food for seat ${normalizedSeat}`);
				}
			}
			
			// Note: Inventory is deducted at task creation time
			// When task is completed, the item quantity has already been reduced
		} catch (error: any) {
			console.error("Failed to complete task:", error);
			throw error;
		}
	};

	const deleteTask = async (taskId: string) => {
		if (!db) {
			throw new Error("Firebase not configured. Cannot delete task.");
		}

		try {
			const taskRef = ref(db, `tasks/${taskId}`);
			await update(taskRef, { status: "deleted" });
		} catch (error: any) {
			console.error("Failed to delete task:", error);
			throw error;
		}
	};

	/**
	 * Cancel a specific item from a task
	 * If the task has multiple items, remove only the specified item
	 * If it's the last item, delete the entire task
	 */
	const cancelTaskItem = async (
		seat: string,
		itemToCancel: string
	): Promise<{
		success: boolean;
		remainingItems?: string;
		deletedTask?: boolean;
		message?: string;
	}> => {
		if (!db) {
			throw new Error("Firebase not configured. Cannot cancel item.");
		}

		try {
			// Normalize seat format (remove spaces, uppercase)
			const normalizedSeat = seat.replace(/\s+/g, "").toUpperCase();

			// Find the task for this seat
			const tasksRef = ref(db, "tasks");
			const snapshot = await get(tasksRef);

			if (!snapshot.exists()) {
				return {
					success: false,
					message: `No task found for seat ${seat}`,
				};
			}

			const allTasks = snapshot.val();
			let taskId: string | null = null;
			let task: any = null;

			// Find pending task with matching seat
			for (const [id, t] of Object.entries(allTasks)) {
				const taskData = t as any;
				const taskSeat = taskData.seat?.replace(/\s+/g, "").toUpperCase();

				if (taskSeat === normalizedSeat && taskData.status === "pending") {
					taskId = id;
					task = taskData;
					break;
				}
			}

		if (!taskId || !task) {
			return {
				success: false,
				message: `No pending task found for seat ${seat}`,
			};
		}

		// Special keyword to cancel entire order
		if (itemToCancel === "__CANCEL_ALL__") {
			console.log(`🗑️ Cancelling entire order for seat ${seat}`);
			await deleteTask(taskId);
			return {
				success: true,
				deletedTask: true,
				message: `Cancelled entire order for seat ${seat}.`,
			};
		}

		// Parse the task's items (could be single item or comma-separated)
		const currentItems = task.item || "";
		const itemsArray = currentItems
			.split(",")
			.map((item: string) => item.trim().toLowerCase());
		const itemToCancelLower = itemToCancel.toLowerCase();

		console.log(`🔍 Cancelling "${itemToCancel}" from seat ${seat}`, {
			currentItems,
			itemsArray,
		});

		// Check if the item exists in the task
		const itemIndex = itemsArray.findIndex((item: string) =>
			item.includes(itemToCancelLower)
		);

		if (itemIndex === -1) {
			return {
				success: false,
				message: `Item "${itemToCancel}" not found in task for seat ${seat}. Current items: ${currentItems}`,
			};
		}

		// Remove the item
		itemsArray.splice(itemIndex, 1);

		if (itemsArray.length === 0) {
			// Last item - delete the entire task
			console.log(`🗑️ Deleting entire task for seat ${seat} (last item)`);
			await deleteTask(taskId);
			return {
				success: true,
				deletedTask: true,
				message: `Cancelled ${itemToCancel} for seat ${seat}. Task deleted (no items remaining).`,
			};
		} else {
				// Update the task with remaining items
				const remainingItems = itemsArray.join(", ");
				const taskRef = ref(db, `tasks/${taskId}`);

				// Also update the request field to match
				// Parse the existing request and rebuild it with remaining items
				const seat = task.seat;
				const updatedRequest = itemsArray
					.map((item: string) => `${seat} ${item}`)
					.join(" + ");

				const updateData: any = {
					item: remainingItems,
					request: updatedRequest, // Update request to reflect cancelled item
				};

				// Also update special requirements if it's an array
				if (Array.isArray(task.specialRequirements)) {
					// Remove special requirements that might be related to the cancelled item
					// For now, keep all special requirements (could be enhanced later)
					updateData.specialRequirements = task.specialRequirements;
				}

				await update(taskRef, updateData);

				console.log(`✅ Updated task for seat ${seat}`, {
					removed: itemToCancel,
					remaining: remainingItems,
					updatedRequest,
				});

				return {
					success: true,
					remainingItems,
					deletedTask: false,
					message: `Cancelled ${itemToCancel} for seat ${seat}. Remaining items: ${remainingItems}`,
				};
			}
		} catch (error: any) {
			console.error("Failed to cancel item:", error);
			throw error;
		}
	};

	/**
	 * Check off (complete) a specific item from a task
	 * If the task has multiple items, remove only the completed item
	 * If it's the last item, complete the entire task
	 */
	const checkTaskItem = async (
		seat: string,
		itemToCheck: string
	): Promise<{
		success: boolean;
		remainingItems?: string;
		completedTask?: boolean;
		message?: string;
	}> => {
		if (!db) {
			throw new Error("Firebase not configured. Cannot check off item.");
		}

		try {
			// Normalize seat format (remove spaces, uppercase)
			const normalizedSeat = seat.replace(/\s+/g, "").toUpperCase();

			// Find the task for this seat
			const tasksRef = ref(db, "tasks");
			const snapshot = await get(tasksRef);

			if (!snapshot.exists()) {
				return {
					success: false,
					message: `No task found for seat ${seat}`,
				};
			}

			const allTasks = snapshot.val();
			let taskId: string | null = null;
			let task: any = null;

			// Find pending task with matching seat
			for (const [id, t] of Object.entries(allTasks)) {
				const taskData = t as any;
				const taskSeat = taskData.seat?.replace(/\s+/g, "").toUpperCase();

				if (taskSeat === normalizedSeat && taskData.status === "pending") {
					taskId = id;
					task = taskData;
					break;
				}
			}

			if (!taskId || !task) {
				return {
					success: false,
					message: `No pending task found for seat ${seat}`,
				};
			}

			// Special keyword to complete entire order
			if (itemToCheck === "__CHECK_ALL__") {
				console.log(`✅ Completing entire order for seat ${seat}`);
				await completeTask(taskId);
				return {
					success: true,
					completedTask: true,
					message: `Completed entire order for seat ${seat}.`,
				};
			}

			// Parse the task's items (could be single item or comma-separated)
			const currentItems = task.item || "";
			const itemsArray = currentItems
				.split(",")
				.map((item: string) => item.trim().toLowerCase());
			const itemToCheckLower = itemToCheck.toLowerCase();

			console.log(`✅ Checking off "${itemToCheck}" from seat ${seat}`, {
				currentItems,
				itemsArray,
			});

			// Check if the item exists in the task
			const itemIndex = itemsArray.findIndex((item: string) =>
				item.includes(itemToCheckLower)
			);

			if (itemIndex === -1) {
				return {
					success: false,
					message: `Item "${itemToCheck}" not found in task for seat ${seat}. Current items: ${currentItems}`,
				};
			}

			// Store the completed item name BEFORE removing it from array
			const completedItemName = itemsArray[itemIndex];

			// Remove the completed item
			itemsArray.splice(itemIndex, 1);

			// Add the completed item to passenger's past food history
			const pastFoodRef = ref(db, `passengerPastFood/${normalizedSeat}`);
			const pastFoodSnapshot = await get(pastFoodRef);
			
			let currentPastFood: string[] = [];
			if (pastFoodSnapshot.exists()) {
				currentPastFood = pastFoodSnapshot.val() || [];
			}
			
			// Add completed item (avoiding duplicates)
			if (!currentPastFood.includes(completedItemName)) {
				const updatedPastFood = [...currentPastFood, completedItemName];
				await set(pastFoodRef, updatedPastFood);
				console.log(`✅ Added "${completedItemName}" to past food for seat ${normalizedSeat}`);
			}

			if (itemsArray.length === 0) {
				// Last item - complete the entire task
				console.log(`✅ Completing entire task for seat ${seat} (last item)`);
				await completeTask(taskId);
				return {
					success: true,
					completedTask: true,
					message: `Completed ${itemToCheck} for seat ${seat}. Task completed (no items remaining).`,
				};
			} else {
				// Update the task with remaining items
				const remainingItems = itemsArray.join(", ");
				const taskRef = ref(db, `tasks/${taskId}`);

				// Also update the request field to match
				// Parse the existing request and rebuild it with remaining items
				const seatValue = task.seat;
				const updatedRequest = itemsArray
					.map((item: string) => `${seatValue} ${item}`)
					.join(" + ");

				const updateData: any = {
					item: remainingItems,
					request: updatedRequest, // Update request to reflect completed item
				};

				// Also update special requirements if it's an array
				if (Array.isArray(task.specialRequirements)) {
					// Keep all special requirements for remaining items
					updateData.specialRequirements = task.specialRequirements;
				}

				await update(taskRef, updateData);

				console.log(`✅ Updated task for seat ${seat} (item completed)`, {
					completed: itemToCheck,
					remaining: remainingItems,
					updatedRequest,
				});

				return {
					success: true,
					remainingItems,
					completedTask: false,
					message: `Completed ${itemToCheck} for seat ${seat}. Remaining items: ${remainingItems}`,
				};
			}
		} catch (error: any) {
			console.error("Failed to check off item:", error);
			throw error;
		}
	};

	const visibleTasks = useMemo(
		() => tasks.filter((t) => t.status !== "deleted"),
		[tasks]
	);

	return {
		tasks: visibleTasks,
		loading,
		error,
		createTask,
		completeTask,
		deleteTask,
		cancelTaskItem,
		checkTaskItem,
	};
}
