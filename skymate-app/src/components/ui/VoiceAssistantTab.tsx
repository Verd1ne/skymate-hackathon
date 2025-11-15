import { useState } from "react";
import VoiceInput from "../crew/VoiceInput";

/**
 * Clean voice assistant interface for tablet UI
 * Wraps VoiceInput and hides unnecessary dev/testing elements
 */
function VoiceAssistantTab() {
  return (
    <div className="h-full flex flex-col gap-6">
      {/* Info card matching the tablet UI theme */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-lg shadow-emerald-100/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/90">
              Voice Control
            </p>
            <h2 className="text-xl font-semibold text-emerald-950">
              Say "Skymate" to activate
            </h2>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-emerald-900/80">
          <p className="leading-relaxed">
            The assistant is always listening for the wake word{" "}
            <span className="font-semibold text-emerald-950">"Skymate"</span>. 
            Once activated, speak your request naturally.
          </p>
          
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide mb-2">
              Example commands
            </p>
            <ul className="space-y-2 text-xs text-emerald-900/90">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>"Skymate, 52B requests chicken meal"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>"Skymate, remind me of task 1 to 4"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>"Skymate, check off 10A"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span>"Skymate, tell me special tasks"</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

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
    </div>
  );
}

export default VoiceAssistantTab;

