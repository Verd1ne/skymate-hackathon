/**
 * Early WebSocket monkey-patch for visibility and authentication
 * 
 * Patches window.WebSocket BEFORE any SDK imports to ensure we can see
 * all WebSocket creations and verify protocol headers are set.
 * 
 * Import this in your app entry point (main.tsx) BEFORE any other imports.
 */
if (typeof window !== "undefined") {
	const _WS = window.WebSocket;
	let wsCount = 0;

	(window as any).WebSocket = function (
		url: string | URL,
		protocols?: string | string[]
	) {
		wsCount++;
		const urlString = typeof url === "string" ? url : url.toString();
		const isDeepgram = urlString.includes("api.deepgram.com");

		// Auto-inject protocol header for Deepgram if missing or invalid
		let finalProtocols = protocols;
		if (isDeepgram) {
			// Get API key from environment
			const apiKey = (import.meta.env.VITE_DEEPGRAM_API_KEY || "").trim();
			
			if (apiKey && apiKey !== "your_deepgram_key_here" && apiKey !== "undefined") {
				// Check if protocols are missing or invalid
				if (!protocols || 
					(Array.isArray(protocols) && protocols.length === 0) ||
					(typeof protocols === "string" && !protocols.includes(apiKey))) {
					// SDK didn't provide valid protocols, inject them
					finalProtocols = ["token", apiKey];
					console.log(`🔧 [WebSocket #${wsCount}] Auto-injecting protocol header (SDK didn't provide valid one)`);
				} else {
					// SDK provided protocols, use them but verify format
					finalProtocols = protocols;
					if (Array.isArray(protocols) && protocols.length === 2 && protocols[0] === "token") {
						console.log(`✅ [WebSocket #${wsCount}] SDK provided protocol header correctly`);
					} else {
						console.warn(`⚠️ [WebSocket #${wsCount}] SDK provided protocols but format may be incorrect:`, protocols);
					}
				}
			} else {
				console.warn(`⚠️ [WebSocket #${wsCount}] Deepgram connection but no API key found in env`);
			}
		}

		console.log(`🔍 [WebSocket #${wsCount}] Creating`, {
			url: urlString.substring(0, 80) + (urlString.length > 80 ? "..." : ""),
			protocols: finalProtocols,
			isDeepgram,
			protocolSet: !!finalProtocols,
		});

		const ws = new _WS(url, finalProtocols as any);

		ws.addEventListener("open", () =>
			console.log(`✅ [WebSocket #${wsCount}] open`, {
				protocol: ws.protocol,
				url: ws.url.substring(0, 80),
			})
		);

		ws.addEventListener("error", (e) =>
			console.log(`❌ [WebSocket #${wsCount}] error`, e)
		);

		ws.addEventListener("close", (e) =>
			console.log(`🔌 [WebSocket #${wsCount}] close`, {
				code: e.code,
				reason: e.reason,
			})
		);

		// Log protocol after creation
		setTimeout(() => {
			if (isDeepgram) {
				console.log(`🔍 [WebSocket #${wsCount}] Protocol:`, ws.protocol || "NONE (AUTH WILL FAIL)");
			}
		}, 10);

		return ws;
	} as any;

	console.log("✅ Early WebSocket patch installed");
}

