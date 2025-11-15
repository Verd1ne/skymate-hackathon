import { Sparkles } from "lucide-react";
import VoiceInput from "../crew/VoiceInput";

/**
 * Clean voice assistant interface for tablet UI
 * Wraps VoiceInput and hides unnecessary dev/testing elements
 */
const columnBackgrounds: Record<string, string> = {
	orders: "md:bg-gradient-to-b md:from-emerald-50/60 md:via-white md:to-white",
	reminder:
		"md:bg-gradient-to-b md:from-emerald-50/60 md:via-white md:to-white",
	information:
		"md:bg-gradient-to-b md:from-emerald-50/60 md:via-white md:to-white",
};

const voicePlaybook = [
	{
		id: "orders",
		label: "Orders",
		items: [
			{
				title: "Create order from a seat",
				phrase: "Skymate, 1A requests chicken meal",
				tag: "Task creation",
			},
			{
				title: "Cancel a passenger's open order",
				phrase: "Skymate, cancel 1A",
				tag: "Cancellations",
			},
		],
	},
	{
		id: "reminder",
		label: "Reminder",
		items: [
			{
				title: "Set a reminder for a seat",
				phrase: "Skymate, remind me 1A",
				tag: "Reminders",
			},
			{
				title: "Summarise the next few tasks",
				phrase: "Skymate, remind me task 1 to 4",
				tag: "Summaries",
			},
			{
				title: "List all gold class members",
				phrase: "Skymate, remind me gold class members",
				tag: "Loyalty",
			},
			{
				title: "List all diamond class members",
				phrase: "Skymate, remind me diamond class members",
				tag: "Loyalty",
			},
		],
	},
	{
		id: "information",
		label: "Information",
		items: [
			{
				title: "Check remaining stock",
				phrase: "Skymate, how many order of chicken left",
				tag: "Inventory",
			},
			{
				title: "Surface special-care passengers",
				phrase: "Skymate, tell me special tasks",
				tag: "Priority care",
			},
			{
				title: "Explain meal ingredients",
				phrase: "Skymate, describe ingredients of chicken meal",
				tag: "Meal info",
			},
			{
				title: "Know your cabin at a glance",
				phrase: "Skymate has database of customers in flight",
				tag: "Passenger data",
			},
		],
	},
];

function VoiceAssistantTab() {
	return (
		<div className="h-full flex flex-col gap-6">
			{/* Voice Input Component - hide UI elements with CSS */}
			<div className="voice-input-wrapper">
				<style>{`
          .voice-input-wrapper button:has(svg[class*="Headphones"]) {
            display: none !important;
          }
          .voice-input-wrapper > div > div:first-child {
            display: none !important;
          }
          .voice-input-wrapper > div > button:nth-of-type(2) {
            display: none !important;
          }
          .voice-input-wrapper > div > p:nth-of-type(2) {
            display: none !important;
          }
          .voice-input-wrapper > div > div:last-child {
            display: none !important;
          }
          .voice-input-wrapper > div > button:last-of-type {
            display: none !important;
          }
          
          /* Style the start flight button to match tablet UI */
          .voice-input-wrapper button[class*="bg-blue-600"],
          .voice-input-wrapper button[class*="bg-green-600"] {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
            border: 2px solid #059669 !important;
            box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3) !important;
          }
          
          .voice-input-wrapper button[class*="bg-blue-600"]:hover,
          .voice-input-wrapper button[class*="bg-green-600"]:hover {
            background: linear-gradient(135deg, #047857 0%, #059669 100%) !important;
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.4) !important;
          }
          
          /* Style the main microphone button */
          .voice-input-wrapper button[class*="from-blue-500"] {
            background: linear-gradient(135deg, #059669 0%, #34d399 100%) !important;
            box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.5) !important;
          }
          
          .voice-input-wrapper button[class*="from-blue-500"]:hover {
            background: linear-gradient(135deg, #047857 0%, #10b981 100%) !important;
            transform: scale(1.05) !important;
          }
          
          /* Center the content */
          .voice-input-wrapper > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          /* Update text colors to match emerald theme */
          .voice-input-wrapper p {
            color: #064e3b !important;
          }
        `}</style>
				<VoiceInput />
			</div>

			<section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 md:rounded-[32px] md:border md:border-emerald-100 md:bg-emerald-50/40 shadow-sm shadow-emerald-100">
				{voicePlaybook.map((column, idx) => (
					<div
						key={column.id}
						className={[
							"flex flex-col p-4 md:px-8 md:py-6 transition-colors",
							columnBackgrounds[column.id] || "",
							idx !== 0
								? "md:border-l-[2px] md:border-emerald-200/80 md:pl-8 md:pr-6"
								: "md:pl-6 md:pr-6",
						].join(" ")}
					>
						<div className="flex items-center justify-between mb-2">
							<p className="text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
								{column.label}
							</p>
							<span className="text-xs text-emerald-700/80">
								{column.items.length}
							</span>
						</div>
						<div className="flex flex-col gap-4">
							{column.items.map((item) => (
								<div
									key={item.title}
									className="rounded-3xl border border-emerald-100 bg-white shadow-sm px-4 py-4 flex items-start gap-3"
								>
									<Sparkles className="text-emerald-600 mt-1" size={18} />
									<div className="flex-1 space-y-2 text-left">
										<div className="flex items-start justify-between gap-3 flex-wrap">
											<div className="space-y-2">
												<p className="text-base md:text-lg font-semibold text-emerald-900 leading-snug">
													{item.phrase.trim()}
												</p>
												<div className="md:hidden h-px bg-emerald-100" />
												<p className="text-sm text-emerald-700/90">
													{item.title.charAt(0).toUpperCase() +
														item.title.slice(1).toLowerCase()}
												</p>
											</div>
											<span className="uppercase text-[10px] tracking-[0.25em] text-emerald-600/80">
												{item.tag}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}

export default VoiceAssistantTab;
