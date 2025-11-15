/**
 * Raw WebSocket smoke test for Deepgram
 * 
 * Bypasses the SDK to test if browser/network/CSP can open the socket
 * with the required subprotocol header.
 * 
 * This proves whether the issue is:
 * - Browser/network/CSP (if this fails)
 * - SDK usage/order/context (if this passes but SDK fails)
 */
export function rawDGTest(apiKey: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		if (!apiKey || apiKey.trim().length < 20) {
			reject(new Error("Invalid API key"));
			return;
		}

		const trimmedKey = apiKey.trim();
		const url =
			"wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US";

		console.log("🧪 RAW WS TEST: Creating WebSocket with subprotocol...");
		console.log("🧪 URL:", url);
		console.log("🧪 Protocol:", `["token", "${trimmedKey.substring(0, 10)}..."]`);

		const ws = new WebSocket(url, ["token", trimmedKey]); // MUST set subprotocol

		const timeout = setTimeout(() => {
			ws.close();
			reject(new Error("Raw WS test timeout after 5s"));
		}, 5000);

		ws.onopen = () => {
			console.log("✅ RAW WS open ✅");
			clearTimeout(timeout);
			ws.close();
			resolve(true);
		};

		ws.onerror = (e) => {
			console.error("❌ RAW WS error ❌", e);
			clearTimeout(timeout);
			ws.close();
			reject(e);
		};

		ws.onclose = (e) => {
			console.warn("🔌 RAW WS close", {
				code: e.code,
				reason: e.reason,
				wasClean: e.wasClean,
			});
			clearTimeout(timeout);
			if (e.code !== 1000 && e.code !== 1001) {
				// Not normal close
				reject(new Error(`Raw WS closed with code ${e.code}: ${e.reason || "No reason"}`));
			}
		};

		// Log protocol after creation
		setTimeout(() => {
			console.log("🧪 RAW WS protocol:", ws.protocol || "NONE (AUTH WILL FAIL)");
			console.log("🧪 RAW WS readyState:", ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState]);
		}, 100);
	});
}

