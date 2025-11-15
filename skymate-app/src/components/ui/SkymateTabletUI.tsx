import { useMemo, useState } from "react";
import {
	Crown,
	ClipboardList,
	Sparkles,
	Headphones,
	Mic,
	MicOff,
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
import { AnimatePresence, motion } from "framer-motion";
import { useInventory } from "../../hooks/useInventory";
import { useTasks } from "../../hooks/useTasks";
import type { Task as BackendTask } from "../../types";

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

	// Build a visual 2-aisles (2-left, aisle, 2-right) business cabin layout and
	// generate consistent seat labels starting from row 1 A–D for rows 1–6.
	const visualRows = useMemo(() => {
		const ROWS = 6;
		const seatLetters = ["A", "B", "C", "D"];

		const rows: { rowNumber: number; seats: string[] }[] = [];

		for (let r = 0; r < ROWS; r++) {
			const rowNumber = r + 1;
			const seats = seatLetters.map((letter) => `${rowNumber}${letter}`);
			rows.push({ rowNumber, seats });
		}

		return rows;
	}, []);

	const [selectedSeat, setSelectedSeat] = useState<string | null>("1A");
	const [selectedInfo, setSelectedInfo] = useState<PassengerInfo | null>(() =>
		getPassengerInfo("1A")
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
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-300 text-slate-900">
							<span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-br from-slate-800 to-slate-700" />
							Diamond
						</span>
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-600 text-amber-900">
							<span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-br from-amber-700 to-amber-400" />
							Gold
						</span>
						<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-300 text-slate-800">
							<span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />
							Regular
						</span>
					</div>
				</div>

				<div className="relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 via-emerald-50 to-slate-100 p-4">
					{/* Dual aisles: between A–B and C–D */}
					<div className="pointer-events-none absolute inset-y-6 left-[28%] w-12 -translate-x-1/2 bg-slate-100 border-x border-slate-200/80 rounded-full" />
					<div className="pointer-events-none absolute inset-y-6 left-[76%] w-12 -translate-x-1/2 bg-slate-100 border-x border-slate-200/80 rounded-full" />

					<div className="relative h-full flex">
						{/* Column letters A B C D aligned to 6‑col grid (with aisles at 2 and 5) */}
						<div className="pointer-events-none absolute left-10 right-6 top-0 grid grid-cols-[1fr_44px_1fr_1fr_44px_1fr] text-[11px] text-slate-500 font-medium px-6">
							<span className="justify-self-start col-start-1">A</span>
							<span className="justify-self-end col-start-3">B</span>
							<span className="justify-self-start col-start-4">C</span>
							<span className="justify-self-end col-start-6">D</span>
						</div>

						{/* Row numbers */}
						<div className="flex flex-col justify-between mr-3 text-[11px] text-slate-500 font-medium py-6">
							{visualRows.map((row) => (
								<span key={row.rowNumber}>{row.rowNumber}</span>
							))}
						</div>

						{/* Seat layout: 1‑aisle‑1‑1‑aisle‑1 (A|B C|D) with slanted seats */}
						<div className="flex-1 pt-4">
							<div className="grid h-full grid-rows-6 gap-y-4">
								{visualRows.map((row) => (
									<div
										key={row.rowNumber}
										className="grid grid-cols-[1fr_44px_1fr_1fr_44px_1fr] gap-x-6 items-center"
									>
										{row.seats.map((seatId, colIndex) => {
											const isGold = goldSeatSet.has(seatId);
											const isDiamond = diamondSeatSet.has(seatId);
											const isSelected = selectedSeat === seatId;

											const rotationByColumn = [
												"rotate-[18deg]",
												"-rotate-[18deg]",
												"rotate-[18deg]",
												"-rotate-[18deg]",
											] as const;

											const alignByColumn = [
												"justify-self-start",
												"justify-self-end",
												"justify-self-start",
												"justify-self-end",
											] as const;

											// Place seats in columns 1,3,4,6 to create aisles at 2 and 5
											const colStartByColumn = [
												"col-start-1",
												"col-start-3",
												"col-start-4",
												"col-start-6",
											] as const;

											const rotationClass = rotationByColumn[colIndex];
											const alignClass = alignByColumn[colIndex];
											const colStartClass = colStartByColumn[colIndex];

											return (
												<button
													key={seatId}
													type="button"
													onClick={() => handleSelectSeat(seatId)}
													className={[
														"relative flex flex-col items-center gap-1 text-[11px]",
														colStartClass,
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
																	? "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700"
																	: isGold
																	? "bg-gradient-to-br from-amber-700 via-amber-500 to-amber-400 border-amber-600"
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
								Loyal Members
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
							{!diamondSeatSet.has(selectedInfo.seatNumber) &&
								goldSeatSet.has(selectedInfo.seatNumber) && (
									<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-500 text-xs text-amber-900">
										<Crown size={14} className="text-amber-600" />
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

function TaskQueueInventoryPage() {
	const {
		mainInventory,
		loading: inventoryLoading,
		error: inventoryError,
	} = useInventory();
	const {
		tasks,
		loading: tasksLoading,
		error: tasksError,
		completeTask,
	} = useTasks();

	const activeTasks = tasks.filter(
		(t) => t.status === "pending" || t.status === "in_progress"
	);
	const completedTasks = tasks.filter((t) => t.status === "completed");

	const getTaskBucket = (
		task: BackendTask
	): "cathay" | "priority" | "normal" => {
		const info = getPassengerInfo(task.seat);
		const isPriorityGuest =
			!!info &&
			(info.membershipTier === "diamond" ||
				info.membershipTier === "gold" ||
				info.priorityMember);

		if (isPriorityGuest) return "cathay";
		if (task.priority === "urgent" || task.priority === "high")
			return "priority";
		return "normal";
	};

	const getInventoryIcon = (name: string) => {
		const n = name.toLowerCase();
		// Prioritise specific matches before generic 'meal'
		if (n.includes("beef")) return "🥩";
		if (n.includes("chicken")) return "🍗";
		if (n.includes("ramen") || n.includes("cup")) return "🍜";
		if (n.includes("coffee")) return "☕";
		if (n.includes("tea")) return "🍵";
		if (n.includes("water") || n.includes("bottle")) return "💧";
		if (
			n.includes("headphone") ||
			n.includes("earphone") ||
			n.includes("earphones")
		)
			return "🎧";
		if (n.includes("pillow") || n.includes("blanket")) return "🛏️";
		if (n.includes("drink") || n.includes("soft")) return "🥤";
		// generic meal fallback (if nothing else matched)
		if (n.includes("meal")) return "🍽️";
		// fallback
		return "📦";
	};

	const formatTaskLabel = (raw?: string | null) => {
		if (!raw) return "";
		// Split by comma to handle multiple items like "water, chicken"
		const parts = raw
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);

		const mapped = parts.map((part) => {
			const lower = part.toLowerCase();
			if (lower.includes("chicken")) return "Chicken meal";
			if (lower.includes("beef")) return "Beef meal";
			// Title-case other phrases
			return part
				.split(/\s+/)
				.map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
				.join(" ");
		});

		return mapped.join(", ");
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
					{inventoryLoading && (
						<p className="text-[11px] text-emerald-700/80">
							Loading galley inventory...
						</p>
					)}
					{inventoryError && (
						<p className="text-[11px] text-red-600">
							Inventory error: {inventoryError}
						</p>
					)}
					{!inventoryLoading &&
						!inventoryError &&
						mainInventory.length === 0 && (
							<p className="text-[11px] text-emerald-700/60 italic">
								No inventory items yet.
							</p>
						)}
					{mainInventory.slice(0, 8).map((item) => {
						const isLow = item.quantity <= item.threshold;
						const capacity = Math.max(item.quantity, item.threshold * 3);
						const percent = Math.min(
							100,
							Math.round((item.quantity / capacity) * 100)
						);

						return (
							<div
								key={item.id}
								className="flex items-center justify-between py-2"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-lg">
										<span>{getInventoryIcon(item.name)}</span>
									</div>
									<div>
										<p className="text-xs font-semibold text-emerald-950 mr-2">
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
											{item.quantity} / {capacity}
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
						{activeTasks.length} active · {completedTasks.length} done
					</span>
				</div>

				<div className="flex-1">
					<div className="grid grid-cols-1 md:grid-cols-3 h-full md:divide-x md:divide-emerald-200/60">
						{["cathay", "priority", "normal"].map((column) => {
							// Only show active (non-completed) tasks in the columns.
							const columnTasks = tasks
								.filter(
									(t) =>
										getTaskBucket(t as BackendTask) === column &&
										t.status !== "completed"
								)
								.sort((a, b) => a.timestamp - b.timestamp);
							const titleMap: Record<string, string> = {
								cathay: "Loyal Members",
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
										{tasksLoading && column === "cathay" && (
											<p className="text-[11px] text-emerald-700/80">
												Loading tasks...
											</p>
										)}
										{tasksError && column === "cathay" && (
											<p className="text-[11px] text-red-600">
												Task error: {tasksError}
											</p>
										)}
										<motion.div layout>
											<AnimatePresence initial={false}>
												{columnTasks.map((task) => {
													const passengerInfo = getPassengerInfo(task.seat);
													const isDiamondTask =
														passengerInfo?.membershipTier === "diamond";
													const isGoldTask =
														(!isDiamondTask &&
															passengerInfo?.membershipTier === "gold") ||
														passengerInfo?.priorityMember === true;
													const isDone = task.status === "completed";
													return (
														<motion.div
															key={task.id}
															layout
															style={{ overflow: "hidden" }}
															initial={{ opacity: 0, y: 12, scale: 0.98 }}
															animate={{ opacity: 1, y: 0, scale: 1 }}
															exit={{
																opacity: 0,
																y: -8,
																height: 0,
																marginTop: 0,
																marginBottom: 0,
																paddingTop: 0,
																paddingBottom: 0,
															}}
															transition={{ duration: 0.25, ease: "easeOut" }}
														>
															<div
																className={[
																	"w-full px-2 py-2 flex items-center gap-2.5 text-sm",
																	isDiamondTask
																		? "bg-slate-50/95 border-l-4 border-slate-700/90 shadow-md"
																		: isGoldTask
																		? "bg-amber-50/95 border-l-4 border-amber-600/90 shadow-md"
																		: "",
																	isDone ? "opacity-60" : "opacity-100",
																].join(" ")}
															>
																<button
																	type="button"
																	onClick={() => completeTask(task.id)}
																	className="mt-0.5 w-5 h-5 rounded-full border border-emerald-300 flex items-center justify-center bg-white hover:bg-emerald-50 shadow-sm"
																>
																	{isDone && (
																		<span className="text-[11px] text-emerald-700">
																			✓
																		</span>
																	)}
																</button>
																<div className="flex items-center gap-2.5 flex-1">
																	<div
																		className={[
																			"flex items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm shrink-0 overflow-hidden leading-none text-center",
																			isDiamondTask
																				? "w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-700 text-white text-sm"
																				: "w-8 h-8",
																			isDiamondTask
																				? ""
																				: isGoldTask
																				? "bg-gradient-to-br from-amber-700 to-amber-500 text-white"
																				: "bg-emerald-600",
																		].join(" ")}
																	>
																		{task.seat}
																	</div>
																	<div className="flex flex-col">
																		<p
																			className={[
																				"text-sm font-semibold text-emerald-950",
																				isDone
																					? "line-through text-emerald-500"
																					: "",
																			].join(" ")}
																		>
																			{formatTaskLabel(
																				task.item || task.request
																			)}
																		</p>
																	</div>
																</div>
															</div>
														</motion.div>
													);
												})}
											</AnimatePresence>
										</motion.div>
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

function AssistantFunctionsPage({
	onMicActiveChange,
}: {
	onMicActiveChange?: (active: boolean) => void;
}) {
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
	const [micEnabled, setMicEnabled] = useState<boolean>(false);
	const [requestingMic, setRequestingMic] = useState<boolean>(false);
	const [micError, setMicError] = useState<string | null>(null);

	const requestMicrophone = async () => {
		try {
			setMicError(null);
			setRequestingMic(true);
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error("Microphone API not available in this browser.");
			}
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// Immediately stop tracks; we only wanted permission here
			stream.getTracks().forEach((t) => t.stop());
			setMicEnabled(true);
			onMicActiveChange?.(true);
		} catch (err: any) {
			console.error("Microphone permission error:", err);
			setMicError(
				err?.message || "Unable to access microphone. Please check permissions."
			);
			setMicEnabled(false);
			onMicActiveChange?.(false);
		} finally {
			setRequestingMic(false);
		}
	};

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="bg-white border border-emerald-200 rounded-3xl p-5 shadow-lg shadow-emerald-100/60 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Headphones className="text-emerald-600" size={24} />
					<div>
						<p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
							Voice Interface
						</p>
						<h2 className="text-lg font-semibold text-emerald-900">
							Wake word: “skymate”
						</h2>
					</div>
				</div>
				<div className="text-right">
					<button
						type="button"
						onClick={micEnabled ? undefined : requestMicrophone}
						disabled={requestingMic || micEnabled}
						className={[
							"inline-flex items-center gap-2 rounded-full px-3 py-1 border text-xs",
							micEnabled
								? "bg-emerald-50 border-emerald-300 text-emerald-900"
								: "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50",
						].join(" ")}
						aria-pressed={micEnabled}
						aria-label={micEnabled ? "Microphone enabled" : "Enable microphone"}
					>
						{micEnabled ? (
							<>
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
								Listening for “skymate”
								<Mic className="w-3.5 h-3.5 text-emerald-700" />
							</>
						) : (
							<>
								{requestingMic ? (
									<span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
								) : (
									<MicOff className="w-3.5 h-3.5 text-emerald-700" />
								)}
								{requestingMic
									? "Requesting microphone..."
									: "Enable microphone"}
							</>
						)}
					</button>
					<p className="mt-1 text-[11px] text-emerald-700/80">
						Example: “
						<span className="font-semibold text-emerald-900">
							skymate, 52B requests chicken meal
						</span>
						”
					</p>
					{micError && (
						<p className="mt-1 text-[11px] text-red-600">{micError}</p>
					)}
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
	const [micActive, setMicActive] = useState<boolean>(false);

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100 text-emerald-950">
			<div className="max-w-5xl mx-auto min-h-screen flex flex-col">
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
							<span
								className={[
									"inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px]",
									micActive
										? "bg-red-50 border border-red-400 text-red-800 animate-pulse ring-1 ring-red-300"
										: "bg-white border border-emerald-300 text-emerald-900",
								].join(" ")}
							>
								{micActive && (
									<span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
								)}
								<Headphones
									className={[
										"w-3.5 h-3.5",
										micActive ? "text-red-700" : "",
									].join(" ")}
								/>
								Skymate ready
							</span>
							<p className="text-[10px] text-emerald-700/80">
								CX 659 · HKG → SIN · Galley rear
							</p>
						</div>
					</div>
				</header>

				{/* Content */}
				<main className="flex-1 px-4 md:px-6 py-4 pb-24">
					{activeTab === "gold" && <GoldMembersSeatPage />}
					{activeTab === "tasks" && <TaskQueueInventoryPage />}
					{activeTab === "functions" && (
						<AssistantFunctionsPage onMicActiveChange={setMicActive} />
					)}
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
							<span>Loyal Members</span>
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
