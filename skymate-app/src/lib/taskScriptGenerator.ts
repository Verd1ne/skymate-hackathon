/**
 * Task Script Generator - Production Grade
 * 
 * Uses GPT to generate natural language scripts from task data
 * Converts task data into conversational summaries for TTS
 */

import { config } from './config';
import type { Task } from '../types';

interface TaskScriptOptions {
	taskNumber?: number; // Specific task number to summarize
	startTask?: number; // Start of task range (1-indexed)
	endTask?: number; // End of task range (1-indexed)
	allTasks?: boolean; // Summarize all tasks
	status?: 'pending' | 'in_progress' | 'completed'; // Filter by status
}

/**
 * Generate a natural language script from task data using GPT
 */
export async function generateTaskScript(
	tasks: Task[],
	options: TaskScriptOptions = {}
): Promise<string> {
	if (!config.openai) {
		throw new Error('OpenAI API key not configured');
	}

	// Filter tasks based on options
	let filteredTasks = tasks;
	
	if (options.taskNumber !== undefined) {
		// Get task by number (1-indexed from user, 0-indexed in array)
		const taskIndex = options.taskNumber - 1;
		if (taskIndex >= 0 && taskIndex < tasks.length) {
			// FIXED: Use tasks array as-is (already sorted by priority from useTasks)
			// This ensures task numbers match what user sees on screen
			filteredTasks = [tasks[taskIndex]];
		} else {
			// Task number not found
			if (tasks.length === 0) {
				return "There are no tasks.";
			} else {
				return `I couldn't find Task ${options.taskNumber}. There are ${tasks.length} tasks available.`;
			}
		}
	} else if (options.startTask !== undefined && options.endTask !== undefined) {
		// Get task range (1-indexed from user, 0-indexed in array)
		const startIndex = options.startTask - 1;
		const endIndex = options.endTask - 1;
		
		if (startIndex < 0 || endIndex < 0 || startIndex >= tasks.length || endIndex >= tasks.length) {
			// Invalid range
			return `Invalid task range. There are ${tasks.length} tasks available.`;
		}
		
		if (startIndex > endIndex) {
			// Start is greater than end
			return `Invalid task range: Task ${options.startTask} is greater than Task ${options.endTask}.`;
		}
		
		// FIXED: Use tasks array as-is (already sorted by priority from useTasks)
		// This ensures task numbers match what user sees on screen
		filteredTasks = tasks.slice(startIndex, endIndex + 1);
	} else if (options.status) {
		filteredTasks = tasks.filter(t => t.status === options.status);
	} else if (!options.allTasks) {
		// Default: show pending tasks
		filteredTasks = tasks.filter(t => t.status === 'pending');
	}

	// PRODUCTION: Early return if no tasks - avoid GPT call and any processing
	if (filteredTasks.length === 0) {
		return "There are no tasks.";
	}

	// PRODUCTION: Format task data for GPT (only if tasks exist)
	const taskData = filteredTasks.map((task, index) => {
		let taskNumber: number;
		if (options.taskNumber !== undefined) {
			taskNumber = options.taskNumber;
		} else if (options.startTask !== undefined) {
			taskNumber = options.startTask + index;
		} else {
			taskNumber = index + 1;
		}
		
		return {
			number: taskNumber,
			seat: task.seat,
			type: task.type,
			item: task.item || 'unspecified item',
			priority: task.priority,
			status: task.status,
			request: task.request,
			specialRequirements: task.specialRequirements || [],
			timestamp: new Date(task.timestamp).toLocaleTimeString(),
		};
	});

	// Create prompt for GPT
	const prompt = `You are a flight attendant assistant. Generate a concise, direct summary of the following tasks for voice announcement.

Task Data:
${JSON.stringify(taskData, null, 2)}

Requirements:
1. Be VERY concise and direct (for speech)
2. If a task has multiple items (comma-separated in the "item" field), combine them naturally: "52a wanted chicken, beef, and water"
3. Format for single seat with multiple items: "52a wanted chicken, beef, and water" (use "and" before last item)
4. Format for multiple different seats: "52b wanted chicken, 53a wanted water, 58a wanted beef" (comma-separated list)
5. Use simple past tense: "wanted", "needed", "requested"
6. Seat format: lowercase letters (52a, not 52A)
7. Item format: simple item names (chicken, beef, water - not "chicken meal")
8. No formal language, no "Ladies and gentlemen", no "we have", no "they've requested"
9. Just list: seat + wanted/needed/requested + items (with "and" for multiple items per seat)
10. Keep it under 50 words total

Examples:
- Single seat, multiple items: "52a wanted chicken, beef, and water"
- Multiple seats: "52b wanted chicken, 53a wanted water, 58a wanted beef"
- Single seat, single item: "52a wanted chicken"

Generate ONLY the spoken text, no markdown, no numbers, just the direct list:`;

	try {
		// Dynamic import to avoid bundle size issues
		const { default: OpenAI } = await import('openai');
		const openai = new OpenAI({
			apiKey: config.openai,
			dangerouslyAllowBrowser: true,
		});

		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [
				{
					role: 'system',
					content: 'You are a helpful flight attendant assistant. Generate concise, direct summaries of tasks. For single seat with multiple items: "52a wanted chicken, beef, and water". For multiple seats: "52b wanted chicken, 53a wanted water". Always use "and" before the last item when a seat has multiple items. Be brief and direct.',
				},
				{
					role: 'user',
					content: prompt,
				},
			],
			temperature: 0.3, // Lower temperature for more consistent, direct output
			max_tokens: 100, // Reduced for concise output
		});

		const script = response.choices[0]?.message?.content?.trim() || 
			"I'm sorry, I couldn't generate a summary at this time.";

		console.log('📝 Generated task script:', script);
		return script;
	} catch (error: any) {
		console.error('❌ Failed to generate task script:', error);
		
		// Fallback: Generate simple script without GPT
		return generateFallbackScript(filteredTasks, options.taskNumber);
	}
}

/**
 * Fallback script generator (if GPT fails)
 * Creates a simple natural language summary
 */
function generateFallbackScript(tasks: Task[], taskNumber?: number): string {
	if (tasks.length === 0) {
		return "There are no tasks.";
	}

	// Helper function to format items with "and" before last item
	const formatItems = (itemString: string): string => {
		if (!itemString) return 'an item';
		
		// Split by comma and clean up
		const items = itemString.split(',').map(i => i.trim()).filter(Boolean);
		
		if (items.length === 1) {
			return items[0];
		} else if (items.length === 2) {
			return `${items[0]} and ${items[1]}`;
		} else {
			// 3+ items: "chicken, beef, and water"
			return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
		}
	};

	if (taskNumber !== undefined && tasks.length === 1) {
		const task = tasks[0];
		const seat = (task.seat || 'unknown').toLowerCase();
		const formattedItems = formatItems(task.item || 'an item');
		
		return `${seat} wanted ${formattedItems}`;
	}

	// Multiple tasks - format as simple comma-separated list
	const taskList = tasks.map(t => {
		const seat = (t.seat || 'unknown').toLowerCase();
		const formattedItems = formatItems(t.item || 'an item');
		return `${seat} wanted ${formattedItems}`;
	});

	return taskList.join(', ');
}

