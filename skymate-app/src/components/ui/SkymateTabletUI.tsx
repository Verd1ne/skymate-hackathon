import { useMemo, useState } from "react";
import {
	Crown,
	ClipboardList,
	Sparkles,
	Headphones,
	Map as MapIcon,
	CheckSquare,
	Info,
} from "lucide-react";
import {
	getAllSeatNumbers,
	getPassengerInfo,
	getAllPriorityMembers,
	type PassengerInfo,
} from "../../data/passengerData";

type TabId = "gold" | "tasks" | "functions";

function GoldMembersSeatPage() {
	const allSeats = useMemo(() => getAllSeatNumbers(), []);

	const { goldSeatSet, diamondSeatSet } = useMemo(() => {
		const gold = new Set<string>();
		const diamond = new Set<string>();

		// Use passenger membershipTier if available, otherwise treat any
		// priority member as gold by default.
		for (const seat of allSeats) {
			const info = getPassengerInfo(seat);
			if (!info) continue;
			if (info.membershipTier === "diamond") {
				diamond.add(seat);
			} else if (info.membershipTier === "gold" || info.priorityMember) {
				gold.add(seat);
			}
		}

		// Fallback: if no explicit tiers, mark any priority members as gold
		if (gold.size === 0 && diamond.size === 0) {
			getAllPriorityMembers().forEach((p) => gold.add(p.seatNumber));
		}

		return { goldSeatSet: gold, diamondSeatSet: diamond };
	}, [allSeats]);

	// Build a visual 1-2-1 business cabin layout (A–D–G–K style)
	const visualRows = useMemo(() => {
		const BUSINESS_ROWS = 6;
		const SEATS_PER_ROW = 4;

		// Take the first seats from the database to fill the business cabin section.
		// This keeps the layout realistic while still being driven by live data.
		const businessSeats = allSeats.slice(0, BUSINESS_ROWS * SEATS_PER_ROW);

		const rows: { rowNumber: number; seats: (string | null)[] }[] = [];
		let index = 0;

		for (let r = 0; r < BUSINESS_ROWS; r++) {
			const seats: (string | null)[] = [];
			for (let c = 0; c < SEATS_PER_ROW; c++) {
				seats.push(businessSeats[index] ?? null);
				index++;
			}
			rows.push({
				// Simulated business cabin row numbers (16–26 like the reference map)
				rowNumber: 16 + r * 2,
				seats,
			});
		}

		return rows;
	}, [allSeats]);

	const [selectedSeat, setSelectedSeat] = useState<string | null>("10A");
	const [selectedInfo, setSelectedInfo] = useState<PassengerInfo | null>(() =>
		getPassengerInfo("10A")
	);

	const handleSelectSeat = (seat: string) => {
		setSelectedSeat(seat);
		setSelectedInfo(getPassengerInfo(seat));
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-[1.4fr,1fr] gap-6">
			{/* Seat map */}
			<div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-lg shadow-emerald-100/60 flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<MapIcon className="text-emerald-700" size={20} />
						<div>
							<p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
								Cabin View
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 text-xs">
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 border border-sky-300 text-sky-900">
							<span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-br from-sky-400 to-cyan-400" />
							Diamond
						</span>
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900">
							<span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-br from-amber-300 to-amber-500" />
							Gold member
						</span>
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-300 text-slate-800">
							<span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />
							Regular seat
						</span>
					</div>
				</div>

				<div className="relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 via-emerald-50 to-slate-100 p-4">
					{/* Central aisle */}
					<div className="pointer-events-none absolute inset-y-6 left-1/2 w-14 -translate-x-1/2 bg-slate-100 border-x border-slate-200/80 rounded-full" />

					<div className="relative h-full flex">
						{/* Column letters A D G K */}
						<div className="pointer-events-none absolute left-10 right-6 top-0 flex justify-between text-[11px] text-slate-500 font-medium px-6">
							{["A", "D", "G", "K"].map((letter) => (
								<span key={letter}>{letter}</span>
							))}
						</div>

						{/* Row numbers */}
						<div className="flex flex-col justify-between mr-3 text-[11px] text-slate-500 font-medium py-6">
							{visualRows.map((row) => (
								<span key={row.rowNumber}>{row.rowNumber}</span>
							))}
						</div>

						{/* Seat layout: 1-2-1 with slanted seats */}
						<div className="flex-1 pt-4">
							<div className="grid h-full grid-rows-6 gap-y-4">
								{visualRows.map((row, rowIndex) => (
									<div
										key={row.rowNumber}
										className="grid grid-cols-4 gap-x-6 items-center"
									>
										{row.seats.map((seatId, colIndex) => {
											if (!seatId) {
												return (
													<div
														key={`${rowIndex}-${colIndex}`}
														className="h-10 w-14 opacity-20"
													/>
												);
											}

											const isGold = goldSeatSet.has(seatId);
											const isDiamond = diamondSeatSet.has(seatId);
											const isSelected = selectedSeat === seatId;

											const rotationByColumn = [
												"rotate-[20deg]",
												"-rotate-[20deg]",
												"rotate-[20deg]",
												"-rotate-[20deg]",
											] as const;

											const alignByColumn = [
												"justify-self-start",
												"justify-self-end",
												"justify-self-start",
												"justify-self-end",
											] as const;

											const rotationClass = rotationByColumn[colIndex];
											const alignClass = alignByColumn[colIndex];

											return (
												<button
													key={seatId}
													type="button"
													onClick={() => handleSelectSeat(seatId)}
													className={[
														"relative flex flex-col items-center gap-1 text-[11px]",
														alignClass,
													].join(" ")}
												>
													<div
														className={[
															"relative w-14 h-9 transform transition-transform",
															rotationClass,
															isSelected
																? "scale-110 drop-shadow-lg"
																: "drop-shadow",
														].join(" ")}
													>
														<div
															className={[
																"absolute inset-0 rounded-lg border",
																isDiamond
																	? "bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 border-sky-300"
																	: isGold
																	? "bg-gradient-to-br from-amber-300 via-amber-200 to-amber-300 border-amber-300"
																	: "bg-gradient-to-br from-white to-slate-100 border-slate-300",
															].join(" ")}
														/>
														{/* Headrest / console */}
														<div className="absolute -top-1 left-1 w-4 h-3 rounded-md bg-white/95 border border-slate-200" />
													</div>
													<span className="text-slate-700 font-medium">
														{seatId}
													</span>
												</button>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Passenger details */}
			<div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-lg shadow-emerald-100/60 flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Crown className="text-amber-300" size={22} />
						<div>
							<p className="text-xs uppercase tracking-[0.25em] text-emerald-500/90">
								Priority Guest
							</p>
						</div>
					</div>
				</div>

				{selectedInfo ? (
					<div className="space-y-4">
						<div className="flex items-baseline justify-between gap-4">
							<div>
								<p className="text-xs text-emerald-700/80 mb-1">Seat</p>
								<p className="text-3xl font-semibold text-emerald-950">
									{selectedInfo.seatNumber}
								</p>
							</div>
							<div className="text-right">
								<p className="text-xs text-emerald-700/80 mb-1">
									Passenger name
								</p>
								<p className="text-base font-medium text-emerald-950">
									{selectedInfo.passengerName}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{diamondSeatSet.has(selectedInfo.seatNumber) && (
								<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 border border-sky-300 text-xs text-sky-900">
									<Crown size={14} className="text-sky-600" />
									Diamond member
								</span>
							)}
							{!diamondSeatSet.has(selectedInfo.seatNumber) &&
								goldSeatSet.has(selectedInfo.seatNumber) && (
									<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs text-amber-900">
										<Crown size={14} className="text-amber-500" />
										Gold member
									</span>
								)}
							<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-xs text-emerald-900">
								<span className="w-2 h-2 rounded-full bg-emerald-400" />
								Primary meal: {selectedInfo.mealPreference}
							</span>
							{selectedInfo.dietaryRestrictions?.map((r) => (
								<span
									key={r}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-xs text-amber-900"
								>
									{r} meal
								</span>
							))}
							{selectedInfo.specialRequests?.map((r) => (
								<span
									key={r}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-300 text-xs text-sky-900"
								>
									{r}
								</span>
							))}
						</div>

						<div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
							<Info className="text-emerald-600 flex-shrink-0 mt-1" size={18} />
							<div className="space-y-1">
								<p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
									How Skymate uses this
								</p>
								<p className="text-xs text-emerald-900/80">
									Gold members are surfaced first when you say{" "}
									<span className="font-semibold text-emerald-50">
										“skymate, tell me special tasks”
									</span>{" "}
									or when their orders are delayed. This card keeps their key
									details at your fingertips during service.
								</p>
							</div>
						</div>
					</div>
				) : (
					<div className="flex-1 flex items-center justify-center text-center text-emerald-900/70 text-sm">
						Tap on any seat in the map to view passenger details and gold member
						status.
					</div>
				)}
			</div>
		</div>
	);
}

interface DemoInventoryItem {
	id: string;
	name: string;
	unit: string;
	quantity: number;
	capacity: number;
	warningThreshold: number;
	icon: string;
}

interface DemoTask {
	id: string;
	label: string;
	seat: string;
	item: string;
	special?: string;
	bucket: "cathay" | "priority" | "normal";
	done: boolean;
}

function TaskQueueInventoryPage() {
	const [inventory] = useState<DemoInventoryItem[]>([
		{
			id: "chicken",
			name: "Chicken meal",
			unit: "trays",
			quantity: 28,
			capacity: 40,
			warningThreshold: 16,
			icon: "🍗",
		},
		{
			id: "beef",
			name: "Beef meal",
			unit: "trays",
			quantity: 22,
			capacity: 40,
			warningThreshold: 12,
			icon: "🥩",
		},
		{
			id: "earphones",
			name: "Earphones",
			unit: "sets",
			quantity: 45,
			capacity: 60,
			warningThreshold: 20,
			icon: "🎧",
		},
		{
			id: "ramen",
			name: "Cup ramen",
			unit: "cups",
			quantity: 15,
			capacity: 20,
			warningThreshold: 8,
			icon: "🍜",
		},
		{
			id: "water",
			name: "Water bottle",
			unit: "bottles",
			quantity: 52,
			capacity: 80,
			warningThreshold: 24,
			icon: "💧",
		},
	]);

	const [tasks, setTasks] = useState<DemoTask[]>([
		{
			id: "t1",
			label: "Deliver chicken meal",
			seat: "52B",
			item: "Chicken meal",
			special: "Gold member",
			bucket: "cathay",
			done: false,
		},
		{
			id: "t2",
			label: "Refill water",
			seat: "20A",
			item: "Water bottle",
			bucket: "priority",
			done: false,
		},
		{
			id: "t3",
			label: "Provide earphones",
			seat: "21F",
			item: "Earphones",
			bucket: "normal",
			done: false,
		},
		{
			id: "t4",
			label: "Prepare cup ramen",
			seat: "28C",
			item: "Cup ramen",
			bucket: "normal",
			done: true,
		},
		{
			id: "t5",
			label: "Serve champagne",
			seat: "1A",
			item: "Champagne service",
			special: "Diamond member",
			bucket: "priority",
			done: false,
		},
		{
			id: "t6",
			label: "Priority assistance",
			seat: "2B",
			item: "Meet passenger at door",
			special: "Diamond class",
			bucket: "cathay",
			done: false,
		},
	]);

	const toggleTaskDone = (id: string) => {
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
		);
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-6">
			{/* Inventory panel */}
			<div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-lg shadow-emerald-100/60 flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<ClipboardList className="text-emerald-600" size={20} />
						<div>
							<p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
								Inventory Status
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-1">
					{inventory.map((item) => {
						const isLow = item.quantity <= item.warningThreshold;
						const percent = Math.min(
							100,
							Math.round((item.quantity / item.capacity) * 100)
						);
						return (
							<div
								key={item.id}
								className="flex items-center justify-between py-2"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-lg">
										<span>{item.icon}</span>
									</div>
									<div>
										<p className="text-sm font-semibold text-emerald-950">
											{item.name}
										</p>
										<p className="text-[11px] text-emerald-800/80">
											{item.quantity} {item.unit}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 w-48">
									<div className="flex-1 h-2 rounded-full bg-emerald-100 overflow-hidden">
										<div
											className="h-full rounded-full bg-emerald-500"
											style={{ width: `${percent}%` }}
										/>
									</div>
									<div className="text-right text-[11px] text-emerald-800">
										<div className="text-xs font-semibold text-emerald-800">
											{isLow ? "Watch" : "Good"}
										</div>
										<div className="text-[11px]">
											{item.quantity} / {item.capacity}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Task queue panel as Kanban */}
			<div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-lg shadow-emerald-100/60 flex flex-col">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<CheckSquare className="text-emerald-600" size={20} />
						<div>
							<p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
								Active Tasks
							</p>
						</div>
					</div>
					<span className="text-xs text-emerald-700/90">
						{tasks.filter((t) => !t.done).length} active ·{" "}
						{tasks.filter((t) => t.done).length} done
					</span>
				</div>

				<div className="flex-1">
					<div className="grid grid-cols-1 md:grid-cols-3 h-full md:divide-x md:divide-emerald-200/60">
						{["cathay", "priority", "normal"].map((column) => {
							const columnTasks = tasks
								.filter((t) => t.bucket === column)
								.sort((a, b) => Number(a.done) - Number(b.done));
							const titleMap: Record<string, string> = {
								cathay: "Priority Guest",
								priority: "Urgent",
								normal: "Normal",
							};
							return (
								<div key={column} className="flex flex-col px-3 min-h-[200px]">
									<div className="flex items-center justify-between mb-2">
										<p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
											{titleMap[column]}
										</p>
										<span className="text-[11px] text-emerald-700/80">
											{columnTasks.length}
										</span>
									</div>
									<div className="flex-1 overflow-y-auto pr-1">
										{columnTasks.map((task) => {
											const isGoldTask = (task.special ?? "")
												.toLowerCase()
												.includes("gold");
											const isDiamondTask = (task.special ?? "")
												.toLowerCase()
												.includes("diamond");
											return (
												<div
													key={task.id}
													className={[
														"w-full px-2 py-2 flex items-center gap-2.5 text-sm",
														isDiamondTask
															? "bg-indigo-100/95 border-l-4 border-indigo-500/90 shadow-md"
															: isGoldTask
															? "bg-amber-100/95 border-l-4 border-amber-400/90 shadow-sm"
															: "",
														task.done ? "opacity-60" : "opacity-100",
													].join(" ")}
												>
													<button
														type="button"
														onClick={() => toggleTaskDone(task.id)}
														className="mt-0.5 w-5 h-5 rounded-full border border-emerald-300 flex items-center justify-center bg-white hover:bg-emerald-50 shadow-sm"
													>
														{task.done && (
															<span className="text-[11px] text-emerald-700">
																✓
															</span>
														)}
													</button>
													<div className="flex items-center gap-2.5 flex-1">
														<div
															className={[
																"flex items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm",
																isDiamondTask
																	? "w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-500 text-sm"
																	: "w-8 h-8",
																isDiamondTask
																	? ""
																	: isGoldTask
																	? "bg-amber-500"
																	: "bg-emerald-600",
															].join(" ")}
														>
															{task.seat}
														</div>
														<p
															className={[
																"text-[15px] font-semibold text-emerald-950",
																task.done
																	? "line-through text-emerald-500"
																	: "",
															].join(" ")}
														>
															{task.item}
														</p>
													</div>
												</div>
											);
										})}
										{columnTasks.length === 0 && (
											<p className="text-[11px] text-emerald-700/60 italic">
												No tasks here yet.
											</p>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

function AssistantFunctionsPage() {
	const functions = [
		{
			id: 1,
			phrase: "skymate, 52B requests chicken meal",
			title: "Create order from a seat",
			description:
				"Adds a new task in the queue linking the passenger in 52B with a chicken meal from inventory.",
			tag: "Task creation",
			category: "orders",
		},
		{
			id: 2,
			phrase: "skymate, remind me 52B",
			title: "Set a reminder for a seat",
			description:
				"Pins seat 52B to the top of your mental checklist so you don’t forget to follow up.",
			tag: "Reminders",
			category: "reminder",
		},
		{
			id: 3,
			phrase: "skymate, cancel 52B",
			title: "Cancel a passenger’s open order",
			description:
				"Clears any pending tasks for seat 52B and releases reserved inventory items.",
			tag: "Cancellations",
			category: "orders",
		},
		{
			id: 4,
			phrase: "skymate, remind me task 1 to 4",
			title: "Summarise the next few tasks",
			description:
				"Reads back the next four tasks in the queue so you can keep eyes on the cabin, not the tablet.",
			tag: "Summaries",
			category: "reminder",
		},
		{
			id: 5,
			phrase: "skymate, how many order of chicken left",
			title: "Check remaining stock",
			description:
				"Looks up the current chicken meal count in galley inventory and warns when you’re running low.",
			tag: "Inventory",
			category: "information",
		},
		{
			id: 6,
			phrase: "skymate, tell me special tasks",
			title: "Surface special-care passengers",
			description:
				"Highlights any passengers with special requests, dietary needs, or gold member status.",
			tag: "Priority care",
			category: "information",
		},
		{
			id: 7,
			phrase: "skymate, describe ingredients of chicken meal",
			title: "Explain meal ingredients",
			description:
				"Reads out the key ingredients of the chicken meal so you can reassure passengers quickly.",
			tag: "Meal info",
			category: "information",
		},
		{
			id: 8,
			phrase: "skymate has database of customers in flight",
			title: "Know your cabin at a glance",
			description:
				"Backed by a live passenger database so you can ask about seats, names, and preferences in natural language.",
			tag: "Passenger data",
			category: "information",
		},
	];

	const [expandedId, setExpandedId] = useState<number | null>(null);
	const toggleDetails = (id: number) =>
		setExpandedId((prev) => (prev === id ? null : id));

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-lg shadow-emerald-100/60 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Headphones className="text-emerald-600" size={24} />
					<div>
						<p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
							Voice Interface
						</p>
						<h2 className="text-lg font-semibold text-white">
							Wake word: “skymate”
						</h2>
					</div>
				</div>
				<div className="text-right">
					<span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-50 border border-emerald-300 text-xs text-emerald-900">
						<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
						Listening for “skymate”
					</span>
					<p className="mt-1 text-[11px] text-emerald-700/80">
						Example: “
						<span className="font-semibold text-emerald-50">
							skymate, 52B requests chicken meal
						</span>
						”
					</p>
				</div>
			</div>

			<div className="flex-1 overflow-auto pr-1">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
					{[
						{ id: "orders", label: "Orders" },
						{ id: "reminder", label: "Reminder" },
						{ id: "information", label: "Information" },
					].map((column) => {
						const columnFunctions = functions.filter(
							(fn) => fn.category === column.id
						);
						return (
							<div
								key={column.id}
								className="flex flex-col bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 min-h-[220px]"
							>
								<div className="flex items-center justify-between mb-2">
									<p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
										{column.label}
									</p>
									<span className="text-[11px] text-emerald-700/80">
										{columnFunctions.length}
									</span>
								</div>
								<div className="flex-1 space-y-3 overflow-y-auto pr-1">
									{columnFunctions.map((fn) => (
										<div
											key={fn.id}
											className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-4 py-3 flex items-start gap-3"
										>
											<div className="mt-1">
												<Sparkles className="text-emerald-600" size={18} />
											</div>
											<div className="flex-1">
												<p className="text-sm font-semibold text-emerald-900">
													{fn.title}
												</p>
												<div className="mt-1 flex items-center gap-2 flex-wrap">
													<span className="inline-flex items-center px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
														“{fn.phrase}”
													</span>
													<button
														type="button"
														onClick={() => toggleDetails(fn.id)}
														className="text-[11px] text-emerald-700 hover:text-emerald-900 underline"
													>
														{expandedId === fn.id ? "Hide details" : "Details"}
													</button>
												</div>
												{expandedId === fn.id && (
													<p className="text-xs text-emerald-900/80 mt-2">
														{fn.description}
													</p>
												)}
											</div>
											<div className="ml-2 mt-1">
												<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-900">
													{fn.tag}
												</span>
											</div>
										</div>
									))}
									{columnFunctions.length === 0 && (
										<p className="text-[11px] text-emerald-700/60 italic">
											No functions in this category yet.
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function SkymateTabletUI() {
	const [activeTab, setActiveTab] = useState<TabId>("gold");

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100 text-emerald-950">
			<div className="max-w-5xl mx-auto h-screen flex flex-col">
				{/* Header */}
				<header className="pt-6 pb-3 px-4 md:px-6 border-b border-emerald-200">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-[11px] uppercase tracking-[0.35em] text-emerald-700/90">
								Cathay · Skymate
							</p>
							<h1 className="mt-1 text-2xl md:text-3xl font-semibold text-emerald-950">
								Galley AI Assistant
							</h1>
						</div>
						<div className="flex flex-col items-end gap-1">
							<span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-emerald-300 text-[11px] text-emerald-900">
								<Headphones className="w-3.5 h-3.5" />
								In‑ear assistant ready
							</span>
							<p className="text-[10px] text-emerald-700/80">
								CX 520 · HKG → SIN · Galley rear
							</p>
						</div>
					</div>
				</header>

				{/* Content */}
				<main className="flex-1 px-4 md:px-6 py-4 pb-24 overflow-y-auto">
					{activeTab === "gold" && <GoldMembersSeatPage />}
					{activeTab === "tasks" && <TaskQueueInventoryPage />}
					{activeTab === "functions" && <AssistantFunctionsPage />}
				</main>

				{/* Bottom navigation */}
				<nav className="fixed inset-x-0 bottom-0 bg-white/90 border-t border-emerald-200 backdrop-blur-xl">
					<div className="max-w-5xl mx-auto flex justify-around py-2 px-4">
						<button
							type="button"
							onClick={() => setActiveTab("gold")}
							className={[
								"flex-1 flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl text-xs",
								activeTab === "gold"
									? "text-white bg-emerald-600 shadow-sm"
									: "text-emerald-800 hover:bg-emerald-50",
							].join(" ")}
						>
							<Crown size={18} />
							<span>Priority Guest</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("tasks")}
							className={[
								"flex-1 flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl text-xs",
								activeTab === "tasks"
									? "text-white bg-emerald-600 shadow-sm"
									: "text-emerald-800 hover:bg-emerald-50",
							].join(" ")}
						>
							<ClipboardList size={18} />
							<span>Tasks & stock</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("functions")}
							className={[
								"flex-1 flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl text-xs",
								activeTab === "functions"
									? "text-white bg-emerald-600 shadow-sm"
									: "text-emerald-800 hover:bg-emerald-50",
							].join(" ")}
						>
							<Sparkles size={18} />
							<span>What Skymate can do</span>
						</button>
					</div>
				</nav>
			</div>
		</div>
	);
}

export default SkymateTabletUI;
