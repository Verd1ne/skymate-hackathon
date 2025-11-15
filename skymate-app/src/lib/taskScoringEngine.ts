/**
 * Task Scoring Engine - Priority-Urgency-Proximity (PUP) Algorithm
 *
 * Implements a sophisticated task scoring system that considers:
 * - Priority (60%): Task type importance + passenger flags + flight phase
 * - Urgency (25%): Time-based urgency curve using SLA
 * - Proximity (15%): Distance from FA position
 *
 * @module taskScoringEngine
 */

import type { Task, FlightContext, FAState } from "../types";

// ==============================================
// Configuration Constants
// ==============================================

/**
 * Weights for final score calculation
 */
export const W_PRIORITY = 0.6;
export const W_URGENCY = 0.25;
export const W_PROXIMITY = 0.15;

/**
 * Priority weights for different task categories (0-1 scale)
 */
export const PRIORITY_WEIGHTS: Record<string, number> = {
	medical: 1.0,
	safety: 0.95,
	special_meal: 0.85,
	"infant/UM/wchr": 0.8,
	hot_drink: 0.7,
	regular_drink: 0.55,
	snack: 0.5,
	misc: 0.4,
};

/**
 * Passenger flag bonuses (added to priority)
 */
export const PASSENGER_FLAGS: Record<string, number> = {
	allergy: 0.1,
	language_match: 0.05,
};

/**
 * Flight phase multipliers
 */
export const PHASE_MULTIPLIER: Record<string, number> = {
	"taxi/takeoff/landing": 1.1,
	takeoff: 1.1,
	landing: 1.1,
	boarding: 1.1, // treated as taxi
	meal_service: 1.0,
	mid_cruise: 0.95,
	cruise: 0.95, // treated as mid_cruise
	descent_cleanup: 1.05,
};

/**
 * Proximity calculation parameters
 */
export const SECONDS_PER_ROW = 1.2;
export const TROLLEY_BLOCK_PENALTY = 0.0; // Set to 0 as per requirements

/**
 * Time-urgency curve steepness
 */
export const URGENCY_STEEPNESS = 5.0;

// ==============================================
// Helper Functions
// ==============================================

/**
 * Parse row number from seat string (e.g., "12A" -> 12)
 */
export function parseRowFromSeat(seat: string): number {
	const match = seat.match(/^(\d+)/);
	if (match) {
		return parseInt(match[1], 10);
	}
	// Default to middle of plane if parsing fails
	return 20;
}

/**
 * Parse side (letter) from seat string (e.g., "12A" -> "A")
 */
export function parseSideFromSeat(seat: string): string {
	const match = seat.match(/([A-Z])$/i);
	if (match) {
		return match[1].toUpperCase();
	}
	return "A"; // Default
}

/**
 * Map existing task type to PUP category
 */
export function mapTaskTypeToCategory(task: Task): string {
	const type = task.type;
	const requestLower = task.request.toLowerCase();
	const itemLower = (task.item || "").toLowerCase();
	const fullText = `${requestLower} ${itemLower}`;

	// Medical/safety
	if (type === "medical") return "medical";
	if (fullText.includes("safety") || fullText.includes("emergency"))
		return "safety";

	// Special passengers
	if (
		fullText.includes("infant") ||
		fullText.includes("baby") ||
		fullText.includes("wheelchair") ||
		fullText.includes("unaccompanied minor")
	) {
		return "infant/UM/wchr";
	}

	// Special meals
	if (
		type === "meal" &&
		(fullText.includes("special") ||
			fullText.includes("kosher") ||
			fullText.includes("halal") ||
			fullText.includes("vegan") ||
			fullText.includes("allergy"))
	) {
		return "special_meal";
	}

	// Beverages
	if (type === "beverage") {
		if (
			fullText.includes("hot") ||
			fullText.includes("coffee") ||
			fullText.includes("tea") ||
			fullText.includes("chocolate")
		) {
			return "hot_drink";
		}
		return "regular_drink";
	}

	// Snacks
	if (
		fullText.includes("snack") ||
		fullText.includes("peanuts") ||
		fullText.includes("pretzels") ||
		fullText.includes("chips")
	) {
		return "snack";
	}

	// Assistance gets higher priority
	if (type === "assistance") return "infant/UM/wchr";

	// Default
	return "misc";
}

/**
 * Infer passenger flags from task data
 */
export function inferPassengerFlags(task: Task): string[] {
	const flags: string[] = [];
	const requestLower = task.request.toLowerCase();
	const itemLower = (task.item || "").toLowerCase();
	const fullText = `${requestLower} ${itemLower}`;
	const specialReqs = task.specialRequirements || [];

	// Check for allergy
	if (
		fullText.includes("allergy") ||
		fullText.includes("allergic") ||
		specialReqs.some((req) => req.toLowerCase().includes("allergy"))
	) {
		flags.push("allergy");
	}

	// Check for language match (simplified - if they mention specific languages)
	if (
		fullText.includes("language") ||
		fullText.includes("translate") ||
		specialReqs.some((req) => req.toLowerCase().includes("language"))
	) {
		flags.push("language_match");
	}

	return flags;
}

/**
 * Map FlightContext phase to PUP phase name
 */
export function inferFlightPhase(flightContext?: FlightContext): string {
	if (!flightContext) return "cruise";

	const phase = flightContext.phase;
	if (phase === "boarding") return "taxi/takeoff/landing";
	if (phase === "takeoff") return "taxi/takeoff/landing";
	if (phase === "landing") return "taxi/takeoff/landing";
	if (phase === "meal_service") return "meal_service";
	if (phase === "cruise") return "mid_cruise";

	return "mid_cruise";
}

/**
 * Estimate SLA (Service Level Agreement) in seconds based on task type
 */
export function estimateSLA(task: Task): number {
	const category = mapTaskTypeToCategory(task);

	// SLA in seconds
	const slaMap: Record<string, number> = {
		medical: 120, // 2 minutes
		safety: 180, // 3 minutes
		special_meal: 600, // 10 minutes
		"infant/UM/wchr": 300, // 5 minutes
		hot_drink: 480, // 8 minutes
		regular_drink: 600, // 10 minutes
		snack: 720, // 12 minutes
		misc: 900, // 15 minutes
	};

	return slaMap[category] || 600; // Default 10 minutes
}

// ==============================================
// PUP Scoring Functions
// ==============================================

/**
 * Calculate priority score (0-1)
 *
 * Priority = (base_weight + passenger_flag_bonuses) * phase_multiplier
 * Clamped to [0, 1]
 */
export function f_priority(task: Task, flightContext?: FlightContext): number {
	// Get base priority weight
	const category = mapTaskTypeToCategory(task);
	const base = PRIORITY_WEIGHTS[category] || PRIORITY_WEIGHTS.misc;

	// Add passenger flag bonuses
	const flags = task.passenger_flags || inferPassengerFlags(task);
	const boost = flags.reduce(
		(sum, flag) => sum + (PASSENGER_FLAGS[flag] || 0),
		0
	);

	// Get phase multiplier
	const phase = task.phase || inferFlightPhase(flightContext);
	const phase_k = PHASE_MULTIPLIER[phase] || 1.0;

	// Calculate final score
	const score = (base + boost) * phase_k;

	// Clamp to [0, 1]
	return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Calculate time urgency score (0-1)
 *
 * Uses sigmoid curve: 1 / (1 + exp(-k * (elapsed/sla - 0.5)))
 * where k = URGENCY_STEEPNESS
 */
export function f_time_urgency(now_s: number, task: Task): number {
	const created = task.created_s || task.timestamp / 1000;
	const elapsed = Math.max(0.0, now_s - created);

	const sla = task.sla_s || estimateSLA(task);
	const x = Math.max(0.0, Math.min(1.0, elapsed / Math.max(1.0, sla)));

	// Sigmoid curve
	return 1 / (1 + Math.exp(-URGENCY_STEEPNESS * (x - 0.5)));
}

/**
 * Calculate ETA (walking time) in seconds from FA position to task
 */
export function eta_walk_seconds(fa: FAState, task: Task): number {
	const taskRow = parseRowFromSeat(task.seat);
	const row_delta = Math.abs(fa.seat.row - taskRow) * SECONDS_PER_ROW;
	const trolley_pen = fa.trolley_blocked ? TROLLEY_BLOCK_PENALTY : 0.0;

	return row_delta + trolley_pen;
}

/**
 * Calculate proximity score (0-1)
 *
 * Based on normalized ETA - closer tasks get higher scores
 * Proximity = 1 - (my_eta - min_eta) / (max_eta - min_eta)
 */
export function f_proximity(
	fa: FAState,
	task: Task,
	open_tasks_etas_s: number[]
): number {
	const my_eta = eta_walk_seconds(fa, task);
	const etas = [...open_tasks_etas_s, my_eta];

	const mn = Math.min(...etas);
	const mx = Math.max(...etas);

	if (mx === mn) {
		return 1.0; // All tasks at same distance
	}

	return 1 - (my_eta - mn) / (mx - mn);
}

/**
 * Calculate final PUP task score
 *
 * Score = w_priority * P + w_urgency * U + w_proximity * R
 *
 * @param task - Task to score
 * @param fa - Flight attendant state
 * @param now_s - Current time in seconds
 * @param open_tasks_etas_s - ETAs for all other open tasks
 * @param flightContext - Optional flight context for phase multiplier
 * @param w_priority - Priority weight (default 0.60)
 * @param w_urgency - Urgency weight (default 0.25)
 * @param w_prox - Proximity weight (default 0.15)
 * @returns Final score (0-1)
 */
export function task_score(
	task: Task,
	fa: FAState,
	now_s: number,
	open_tasks_etas_s: number[],
	flightContext?: FlightContext,
	w_priority: number = W_PRIORITY,
	w_urgency: number = W_URGENCY,
	w_prox: number = W_PROXIMITY
): number {
	const P = f_priority(task, flightContext);
	const U = f_time_urgency(now_s, task);
	const R = f_proximity(fa, task, open_tasks_etas_s);

	return w_priority * P + w_urgency * U + w_prox * R;
}

/**
 * Score multiple tasks and return them sorted by score (descending)
 *
 * @param tasks - Array of tasks to score
 * @param fa - Flight attendant state
 * @param flightContext - Optional flight context
 * @returns Array of tasks with scores, sorted by score descending
 */
export function scoreAndSortTasks(
	tasks: Task[],
	fa: FAState,
	flightContext?: FlightContext
): Array<{
	task: Task;
	score: number;
	components: { priority: number; urgency: number; proximity: number };
}> {
	const now_s = Date.now() / 1000;

	// Calculate ETAs for all tasks first
	const etas = tasks.map((task) => eta_walk_seconds(fa, task));

	// Score each task
	const scoredTasks = tasks.map((task, index) => {
		const other_etas = etas.filter((_, i) => i !== index);
		const P = f_priority(task, flightContext);
		const U = f_time_urgency(now_s, task);
		const R = f_proximity(fa, task, other_etas);
		const score = W_PRIORITY * P + W_URGENCY * U + W_PROXIMITY * R;

		return {
			task,
			score,
			components: {
				priority: P,
				urgency: U,
				proximity: R,
			},
		};
	});

	// Sort by score descending
	return scoredTasks.sort((a, b) => b.score - a.score);
}

/**
 * Create a default FA state (at front galley, row 1)
 */
export function createDefaultFAState(): FAState {
	return {
		seat: { row: 1, side: "A" },
		section_id: "front_galley",
		trolley_blocked: false,
	};
}
