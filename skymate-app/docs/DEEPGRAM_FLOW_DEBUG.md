# Deepgram WebSocket Connection Flow - Complete Breakdown

## 📋 Overview

This document explains the **complete flow** of how the Deepgram WebSocket connection works, from button click to audio transcription, so we can debug why the WebSocket isn't appearing in the Network tab.

---

## 🔄 Complete Flow Diagram

```
User clicks mic button
    ↓
VoiceInput.startListening()
    ↓
VoiceService.startListening()
    ↓
1. Get microphone permission
2. Create Deepgram connection object
3. Call .connect() to establish WebSocket ← **WE ARE HERE**
4. Set up event handlers
5. Start MediaRecorder
6. Wait for WebSocket Open event
7. Send audio chunks
8. Receive transcriptions
```

---

## 📝 Step-by-Step Code Flow

### **STEP 1: Component Initialization** (On Page Load)

**File:** `src/components/crew/VoiceInput.tsx`

```typescript
// Lines 16-22: Component mounts
useEffect(() => {
	console.log("🎤 VoiceInput component mounted - initializing VoiceService");
	voiceServiceRef.current = new VoiceService(); // ← Creates VoiceService instance
	return () => {
		voiceServiceRef.current?.stopListening();
	};
}, []);
```

**What happens:**

1. Component mounts → `useEffect` runs
2. Creates `new VoiceService()` → Goes to STEP 2

---

### **STEP 2: VoiceService Constructor** (On Component Mount)

**File:** `src/lib/voice.ts`

```typescript
// Lines 11-54: Constructor
constructor() {
  console.log('🔧 VoiceService constructor called');
  const apiKey = config.deepgram;  // From import.meta.env.VITE_DEEPGRAM_API_KEY

  // Check if API key exists
  if (!apiKey || apiKey === 'your_deepgram_key_here' || apiKey === 'undefined') {
    console.warn('⚠️ Deepgram API key not configured.');
    return;  // ← Stops here if no key
  }

  // Validate API key format
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length < 20) {
    console.error('❌ Deepgram API key appears to be invalid (too short)');
    return;  // ← Stops here if invalid
  }

  console.log('🔑 Deepgram API key loaded:', trimmedKey.substring(0, 10) + '...');

  // Create Deepgram client
  try {
    this.deepgram = createClient(trimmedKey);  // ← Creates SDK client
    console.log('✅ Deepgram client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Deepgram client:', error);
    this.deepgram = null;
  }
}
```

**What happens:**

1. Reads API key from `config.deepgram` (which reads from `.env` file)
2. Validates API key exists and has correct format
3. Creates Deepgram SDK client with `createClient(apiKey)`
4. Stores client in `this.deepgram`

**Current Status:** ✅ Working - API key is loaded correctly

---

### **STEP 3: User Clicks Microphone Button**

**File:** `src/components/crew/VoiceInput.tsx`

```typescript
// Lines 24-53: Button click handler
const startListening = async () => {
	console.log("🎤 Microphone button clicked - starting to listen");

	if (!voiceServiceRef.current) {
		alert("Voice service not available...");
		return;
	}

	setIsListening(true);
	setTranscript("");
	setParsedIntent(null);

	// Call VoiceService.startListening()
	await voiceServiceRef.current.startListening(async (text) => {
		// This callback runs when transcription is received
		setTranscript(text);
		setIsListening(false);
		voiceServiceRef.current?.stopListening();
		// ... parse with AI
	});
};
```

**What happens:**

1. User clicks button → `startListening()` is called
2. Calls `voiceServiceRef.current.startListening()` → Goes to STEP 4

---

### **STEP 4: Start Voice Recognition** (Main Flow)

**File:** `src/lib/voice.ts`

```typescript
// Lines 56-464: startListening method
async startListening(onTranscript: (text: string) => void) {
  if (this.isListening) return;

  if (!this.deepgram) {
    alert('Deepgram API key not configured...');
    return;
  }

  // STEP 4A: Get microphone permission
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  this.stream = stream;

  // STEP 4B: Create Deepgram connection
  this.connection = this.deepgram.listen.live({
    model: 'nova-2',
    language: 'en-US',
    smart_format: true,
    interim_results: false,
    utterance_end_ms: 1000,
    sample_rate: 48000,
    channels: 1,
    punctuate: true,
  });

  // STEP 4C: Try to connect WebSocket
  if (typeof (this.connection as any).connect === 'function') {
    (this.connection as any).connect();  // ← THIS SHOULD CREATE WEBSOCKET
  }

  // STEP 4D: Set up event handlers
  this.connection.on(LiveTranscriptionEvents.Open, (data) => {
    // WebSocket opened successfully
  });

  this.connection.on(LiveTranscriptionEvents.Error, (error) => {
    // WebSocket error occurred
  });

  // STEP 4E: Set up MediaRecorder
  this.mediaRecorder = new MediaRecorder(stream);
  // ... audio handling
}
```

---

### **STEP 4A: Get Microphone Access**

**Code Location:** `src/lib/voice.ts:73`

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
this.stream = stream;
```

**What happens:**

1. Browser prompts user for microphone permission
2. If granted, returns `MediaStream` object
3. Stores in `this.stream` for later use

**Current Status:** ✅ Working - User can grant permission

---

### **STEP 4B: Create Deepgram Connection Object**

**Code Location:** `src/lib/voice.ts:106-115`

```typescript
this.connection = this.deepgram.listen.live({
	model: "nova-2",
	language: "en-US",
	smart_format: true,
	interim_results: false,
	utterance_end_ms: 1000,
	sample_rate: 48000,
	channels: 1,
	punctuate: true,
});
```

**What happens:**

1. Calls `this.deepgram.listen.live(options)`
2. SDK creates a `ListenLiveClient` object
3. **IMPORTANT:** This creates the connection OBJECT, but **does NOT create the WebSocket yet**
4. Connection object is stored in `this.connection`

**Current Status:** ✅ Working - Connection object is created

**What we see in console:**

```
✅ listen.live() call completed without throwing
🔌 Deepgram connection object created: { hasConnect: true, ... }
```

---

### **STEP 4C: Call .connect() to Establish WebSocket** ⚠️ **THE ISSUE**

**Code Location:** `src/lib/voice.ts:131-139`

```typescript
if (typeof (this.connection as any).connect === "function") {
	console.log(
		"✅ Found .connect() method - calling it to establish WebSocket..."
	);
	try {
		(this.connection as any).connect();
		console.log(
			"✅ .connect() called successfully - WebSocket should be connecting now"
		);
	} catch (error) {
		console.error("❌ Error calling .connect():", error);
	}
}
```

**What SHOULD happen:**

1. `.connect()` method is called
2. SDK internally creates a WebSocket connection
3. WebSocket URL should be: `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&...`
4. WebSocket should appear in Network tab
5. WebSocket should send `Sec-WebSocket-Protocol: token, YOUR_API_KEY` header

**What's ACTUALLY happening:**

- ✅ `.connect()` method exists and is called
- ✅ No error is thrown
- ❌ **WebSocket does NOT appear in Network tab**
- ❌ **No WebSocket connection is created**

**This is the problem!** The SDK's `.connect()` method is being called, but it's not actually creating the WebSocket connection.

---

### **STEP 4D: Set Up Event Handlers**

**Code Location:** `src/lib/voice.ts:260-448`

```typescript
// Open event - fires when WebSocket connects
this.connection.on(LiveTranscriptionEvents.Open, (data: any) => {
	console.log("✅ Deepgram WebSocket opened - connection established!");
	connectionEstablished = true;
	isConnectionReady = true;
	// Start MediaRecorder
	this.mediaRecorder.start(100);
});

// Error event - fires when WebSocket fails
this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
	console.error("❌ Deepgram WebSocket error details:", error);
	// Shows error message to user
});

// Close event - fires when WebSocket closes
this.connection.on(LiveTranscriptionEvents.Close, (event: any) => {
	console.error("🔌 Deepgram connection closed:", event);
	// Shows close code (1006 = abnormal closure)
});
```

**What happens:**

1. Event handlers are registered
2. They wait for SDK to emit events
3. If WebSocket opens → `Open` event fires
4. If WebSocket fails → `Error` event fires
5. If WebSocket closes → `Close` event fires

**Current Status:** ⚠️ Event handlers are set up, but `Error` event fires immediately because WebSocket never connects

---

### **STEP 4E: Set Up MediaRecorder**

**Code Location:** `src/lib/voice.ts:221-255`

```typescript
this.mediaRecorder = new MediaRecorder(stream, chosenType);

this.mediaRecorder.addEventListener("dataavailable", (event) => {
	if (event.data.size > 0) {
		if (isConnectionReady && this.connection) {
			this.connection.send(event.data); // Send audio to Deepgram
		} else {
			audioQueue.push(event.data); // Queue until connection ready
		}
	}
});
```

**What happens:**

1. Creates `MediaRecorder` to capture audio from microphone
2. Sets up event listener for audio chunks
3. Audio chunks are queued until WebSocket is ready
4. Once WebSocket opens, audio chunks are sent via `this.connection.send()`

**Current Status:** ✅ Set up correctly, but never receives audio because WebSocket never opens

---

## 🔍 Current Problem Analysis

### **The Issue:**

1. ✅ Connection object is created (`listen.live()` succeeds)
2. ✅ `.connect()` method exists and is called
3. ❌ **WebSocket connection is NOT created** (no Network tab entry)
4. ❌ `Error` event fires immediately with code 1006

### **Why This Happens:**

The SDK's `.connect()` method is being called, but it's not actually creating the underlying WebSocket. This could be because:

1. **SDK Bug:** The SDK might have a bug where `.connect()` doesn't work as expected
2. **Missing Parameter:** The SDK might need additional parameters or a different call pattern
3. **Internal Error:** The SDK might be failing silently inside `.connect()`
4. **Timing Issue:** Event handlers might need to be set up BEFORE calling `.connect()`

---

## 🐛 Debugging Steps

### **What to Check:**

1. **After calling `.connect()`, check the console for:**

   - Does `✅ .connect() called successfully` appear? ✅ YES
   - Does any error appear after calling `.connect()`? ❌ NO
   - Does `.conn` property exist after calling `.connect()`?

2. **Check the connection object after `.connect()`:**

   ```javascript
   // In browser console after clicking mic
   // Check if .conn property exists now
   console.log(voiceServiceRef.current.connection.conn);
   ```

3. **Check if event handlers need to be set up first:**

   - Maybe we need to set up `Open`, `Error`, `Close` handlers BEFORE calling `.connect()`

4. **Check SDK documentation for correct usage:**
   - Maybe `.connect()` isn't the right method
   - Maybe we need to call `.setupConnection()` instead
   - Maybe the connection happens automatically when we send data

---

## 🔧 Next Steps to Fix

1. **Try setting up event handlers BEFORE calling `.connect()`:**

   ```typescript
   // Set up handlers first
   this.connection.on(LiveTranscriptionEvents.Open, ...);
   this.connection.on(LiveTranscriptionEvents.Error, ...);

   // Then connect
   this.connection.connect();
   ```

2. **Try accessing `.conn` property directly:**

   ```typescript
   if ((this.connection as any).conn) {
   	const ws = (this.connection as any).conn;
   	console.log("WebSocket:", ws);
   }
   ```

3. **Check if connection happens automatically:**

   - Maybe try sending data first: `this.connection.send(someData)`
   - Maybe the connection is lazy and only opens when needed

4. **Check SDK source code or examples:**
   - Look at Deepgram SDK GitHub repo for correct usage
   - Check if there's a different pattern for browser usage

---

## 📊 Expected vs Actual Flow

### **Expected Flow:**

```
1. listen.live() → Creates connection object ✅
2. .connect() → Creates WebSocket → Appears in Network tab ⚠️
3. WebSocket opens → Open event fires ⚠️
4. MediaRecorder starts → Audio chunks sent ⚠️
5. Deepgram sends transcriptions → Transcript event fires ⚠️
```

### **Actual Flow:**

```
1. listen.live() → Creates connection object ✅
2. .connect() → Called but WebSocket NOT created ❌
3. Error event fires immediately ❌
4. Connection closes with code 1006 ❌
```

---

## 🎯 Key Questions to Answer

1. **Does `.connect()` actually do anything?**

   - Check if `.conn` property is created after calling `.connect()`
   - Check if any internal state changes

2. **Do event handlers need to be set up first?**

   - Try moving event handler setup BEFORE `.connect()`

3. **Is there a different method to use?**

   - Check `setupConnection()` method
   - Check if connection is automatic when sending data

4. **Is the SDK version the issue?**
   - Current: `@deepgram/sdk@3.13.0`
   - Check if there's a known bug in this version
   - Try updating to latest version

---

## 📝 Summary

The code flow is correct, but the SDK's `.connect()` method is not actually creating the WebSocket connection. The connection object exists, but the underlying WebSocket never gets created, which is why:

- ❌ No WebSocket appears in Network tab
- ❌ Error event fires immediately
- ❌ Connection closes with code 1006

**Next debugging step:** Check if `.conn` property is created after calling `.connect()`, and try setting up event handlers BEFORE calling `.connect()`.
