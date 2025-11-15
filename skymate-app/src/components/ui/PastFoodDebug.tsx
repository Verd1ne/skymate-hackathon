import { useState } from "react";
import { db, ref, set, get } from "../../lib/firebase";

/**
 * Debug component to test past food Firebase functionality
 * Add this temporarily to test if Firebase read/write is working
 */
export function PastFoodDebug() {
	const [testSeat, setTestSeat] = useState("10B");
	const [testFood, setTestFood] = useState("fish meal");
	const [result, setResult] = useState<string>("");

	const testWrite = async () => {
		if (!db) {
			setResult("❌ Firebase DB not initialized");
			return;
		}

		try {
			const normalizedSeat = testSeat.replace(/\s+/g, "").toUpperCase();
			const pastFoodRef = ref(db, `passengerPastFood/${normalizedSeat}`);
			
			// Get current data
			const snapshot = await get(pastFoodRef);
			let currentFood: string[] = [];
			if (snapshot.exists()) {
				currentFood = snapshot.val() || [];
			}
			
			// Add new food
			const updatedFood = [...new Set([...currentFood, testFood])];
			
			// Write to Firebase
			await set(pastFoodRef, updatedFood);
			
			setResult(`✅ Successfully wrote to ${normalizedSeat}: ${JSON.stringify(updatedFood)}`);
		} catch (error: any) {
			setResult(`❌ Error: ${error.message}`);
			console.error("Test write error:", error);
		}
	};

	const testRead = async () => {
		if (!db) {
			setResult("❌ Firebase DB not initialized");
			return;
		}

		try {
			const normalizedSeat = testSeat.replace(/\s+/g, "").toUpperCase();
			const pastFoodRef = ref(db, `passengerPastFood/${normalizedSeat}`);
			
			const snapshot = await get(pastFoodRef);
			
			if (snapshot.exists()) {
				const data = snapshot.val();
				setResult(`📖 Data for ${normalizedSeat}: ${JSON.stringify(data)}`);
			} else {
				setResult(`📖 No data for ${normalizedSeat}`);
			}
		} catch (error: any) {
			setResult(`❌ Error: ${error.message}`);
			console.error("Test read error:", error);
		}
	};

	const testReadAll = async () => {
		if (!db) {
			setResult("❌ Firebase DB not initialized");
			return;
		}

		try {
			const pastFoodRef = ref(db, "passengerPastFood");
			const snapshot = await get(pastFoodRef);
			
			if (snapshot.exists()) {
				const data = snapshot.val();
				setResult(`📖 All past food data: ${JSON.stringify(data, null, 2)}`);
			} else {
				setResult(`📖 No past food data in Firebase`);
			}
		} catch (error: any) {
			setResult(`❌ Error: ${error.message}`);
			console.error("Test read all error:", error);
		}
	};

	return (
		<div className="fixed bottom-4 right-4 bg-white border-2 border-purple-500 rounded-lg p-4 shadow-lg z-50 max-w-md">
			<h3 className="text-sm font-bold mb-2 text-purple-700">🔧 Past Food Debug</h3>
			
			<div className="space-y-2 mb-3">
				<input
					type="text"
					value={testSeat}
					onChange={(e) => setTestSeat(e.target.value)}
					placeholder="Seat (e.g., 10B)"
					className="w-full px-2 py-1 border rounded text-sm"
				/>
				<input
					type="text"
					value={testFood}
					onChange={(e) => setTestFood(e.target.value)}
					placeholder="Food item"
					className="w-full px-2 py-1 border rounded text-sm"
				/>
			</div>

			<div className="flex gap-2 mb-3">
				<button
					onClick={testWrite}
					className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
				>
					Write
				</button>
				<button
					onClick={testRead}
					className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
				>
					Read
				</button>
				<button
					onClick={testReadAll}
					className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
				>
					Read All
				</button>
			</div>

			{result && (
				<div className="text-xs bg-gray-100 p-2 rounded border whitespace-pre-wrap max-h-40 overflow-auto">
					{result}
				</div>
			)}
		</div>
	);
}

