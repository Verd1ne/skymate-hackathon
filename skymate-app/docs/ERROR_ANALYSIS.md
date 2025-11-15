# Deepgram WebSocket Error Analysis

## 🔍 Current Error
- **Error Code:** 1006 (Abnormal Closure)
- **Symptom:** WebSocket closes immediately after creation, before handshake completes
- **Protocol Header:** Missing (`protocol: NONE`)
- **Network Tab:** WebSocket request doesn't appear (closes too fast)

---

## ✅ RULED OUT (Confirmed Not the Issue)

### 1. ✅ API Key Not Loaded
**Status:** RULED OUT
- **Evidence:** Console shows `🔑 Deepgram API key loaded: 3cd5a3f28d...7c21`
- **Evidence:** API key length validated (40 characters)
- **Evidence:** API key format is correct (no quotes, no spaces)
- **Evidence:** API key works with curl command

### 2. ✅ API Key Invalid Format
**Status:** RULED OUT
- **Evidence:** Key is 40 characters (valid Deepgram key length)
- **Evidence:** Key format matches expected pattern
- **Evidence:** Same key works with curl, confirming validity

### 3. ✅ SDK Client Not Initialized
**Status:** RULED OUT
- **Evidence:** Console shows `✅ Deepgram client initialized successfully`
- **Evidence:** `this.deepgram.listen.live()` call succeeds
- **Evidence:** Connection object is created without errors

### 4. ✅ Connection Object Creation Fails
**Status:** RULED OUT
- **Evidence:** `listen.live()` returns connection object
- **Evidence:** Connection object has required methods (`send`, `on`, `connect`)
- **Evidence:** No exceptions thrown during connection creation

### 5. ✅ Event Handlers Not Set Up
**Status:** RULED OUT
- **Evidence:** Event handlers are set up BEFORE calling `.connect()`
- **Evidence:** Error event handler catches the 1006 error
- **Evidence:** All required event handlers are registered

### 6. ✅ Microphone Permission Issues
**Status:** RULED OUT
- **Evidence:** `getUserMedia()` succeeds
- **Evidence:** MediaRecorder is created successfully
- **Evidence:** Audio stream is available

---

## ⚠️ PARTIALLY TESTED (Need More Verification)

### 1. ⚠️ WebSocket Monkey-Patch Not Intercepting
**Status:** PARTIALLY TESTED - NEEDS VERIFICATION
- **What We Did:** Moved patch to module level (before SDK initialization)
- **What We Need:** Verify patch logs appear in console
  - Should see: `🔍 [WebSocket #1] Creating WebSocket:` with Deepgram URL
  - Should see: `✅ [WebSocket #1] Setting protocol header:`
- **If Not Working:** SDK might be:
  - Using a cached reference to original WebSocket
  - Creating WebSocket in a different context (Worker, iframe)
  - Using a different method to create WebSocket

### 2. ⚠️ SDK Call Pattern Incorrect
**Status:** PARTIALLY TESTED
- **What We Did:** 
  - Tried calling `.connect()` explicitly
  - Tried setting handlers before `.connect()`
  - Verified `.connect()` method exists and is called
- **What We Need:** Verify if SDK requires different call pattern
  - Maybe connection is lazy (only connects when sending data)
  - Maybe need to call `.start()` instead of `.connect()`
  - Maybe need to pass API key differently

### 3. ⚠️ Protocol Header Format
**Status:** PARTIALLY TESTED
- **What We Did:** Patch tries to set `["token", API_KEY]`
- **What We Need:** Verify if format is correct
  - Should be: `"token, YOUR_API_KEY"` (comma-separated string)
  - Or should be: `["token", "YOUR_API_KEY"]` (array)
  - Check Deepgram SDK documentation for exact format

---

## ❌ NOT RULED OUT (Still Potential Causes)

### 1. ❌ SDK Cached WebSocket Before Patch
**Status:** NOT RULED OUT
- **Theory:** SDK stores reference to `window.WebSocket` when module is imported
- **Evidence Against:** We moved patch to module level (runs before class instantiation)
- **Evidence For:** Patch logs don't appear, suggesting SDK isn't using our patched version
- **How to Test:**
  1. Check if patch logs appear when clicking mic
  2. If no logs → SDK is using cached reference
  3. Solution: Patch even earlier, or patch SDK's internal reference

### 2. ❌ SDK Creates WebSocket in Different Context
**Status:** NOT TESTED
- **Theory:** SDK might create WebSocket in:
  - Web Worker (separate thread)
  - iframe (different window context)
  - Service Worker
- **How to Test:**
  1. Check browser DevTools → Application → Service Workers
  2. Check browser DevTools → Sources → Workers
  3. Check if WebSocket is created in main window or sub-context
- **Solution:** Patch WebSocket in all contexts (main + workers)

### 3. ❌ Network/Firewall Blocking WebSocket
**Status:** NOT TESTED
- **Theory:** Corporate firewall, antivirus, or network blocks WebSocket to `api.deepgram.com`
- **Symptoms Match:** Connection closes immediately (1006) before handshake
- **How to Test:**
  1. Try different network (mobile hotspot)
  2. Try incognito/private mode
  3. Check browser console → Network tab for blocked requests
  4. Try from different location/VPN
  5. Test with curl from same machine (already works)

### 4. ❌ Browser Compatibility Issue
**Status:** NOT TESTED
- **Theory:** Browser doesn't support WebSocket protocol header correctly
- **How to Test:**
  1. Try different browser (Chrome, Edge, Firefox, Safari)
  2. Check browser version (should be recent)
  3. Check browser console for WebSocket errors
  4. Test in incognito mode (no extensions)

### 5. ❌ SDK Version Bug
**Status:** NOT INVESTIGATED
- **Current Version:** `@deepgram/sdk@^3.5.0` (resolves to 3.13.0)
- **Theory:** Known bug in SDK version that prevents protocol header from being set
- **How to Test:**
  1. Check Deepgram SDK GitHub issues
  2. Try latest version: `npm install @deepgram/sdk@latest`
  3. Try previous stable version
  4. Check changelog for WebSocket-related fixes

### 6. ❌ SDK Uses Different Method to Create WebSocket
**Status:** NOT VERIFIED
- **Theory:** SDK might use:
  - Native fetch API with WebSocket upgrade
  - Third-party WebSocket library
  - Custom WebSocket implementation
  - Direct TCP connection (unlikely in browser)
- **How to Test:**
  1. Inspect SDK source code in `node_modules/@deepgram/sdk`
  2. Search for "WebSocket" in SDK code
  3. Check if SDK uses `window.WebSocket` or something else
  4. Check SDK's connection creation logic

### 7. ❌ CORS/CSP Blocking WebSocket
**Status:** NOT TESTED
- **Theory:** Content Security Policy or CORS prevents WebSocket connection
- **How to Test:**
  1. Check browser console for CORS errors
  2. Check `index.html` for CSP meta tags
  3. Check Vite config for CSP settings
  4. Try adding `connect-src 'self' wss://api.deepgram.com` to CSP

### 8. ❌ Protocol Header Not Being Sent
**Status:** PARTIALLY TESTED
- **Theory:** Even if protocol is set in WebSocket constructor, it might not be sent in handshake
- **Evidence:** WebSocket shows `protocol: NONE` after creation
- **How to Test:**
  1. Verify patch is actually intercepting WebSocket creation
  2. Check Network tab → Headers → Look for `Sec-WebSocket-Protocol` in request
  3. Use browser DevTools → Network → WS filter → Inspect request headers
  4. If header is missing in request → Patch isn't working or format is wrong

### 9. ❌ API Key Permissions/Restrictions
**Status:** NOT TESTED
- **Theory:** API key might have restrictions:
  - IP whitelist (only allows specific IPs)
  - Domain restrictions
  - Feature restrictions (WebSocket not enabled)
  - Rate limiting
- **How to Test:**
  1. Check Deepgram Console → API Keys → Key settings
  2. Verify key has no IP restrictions
  3. Verify key has WebSocket permissions
  4. Try creating new API key without restrictions

### 10. ❌ SDK Internal Error Handling
**Status:** NOT INVESTIGATED
- **Theory:** SDK catches errors internally and doesn't expose them
- **Evidence:** No exceptions thrown, but connection fails silently
- **How to Test:**
  1. Add breakpoints in SDK source code
  2. Check SDK's internal error handling
  3. Look for SDK debug mode or verbose logging

---

## 🎯 Priority Testing Order

### Immediate (Test Now):
1. **Verify WebSocket patch is intercepting**
   - Click mic → Check console for patch logs
   - If no logs → Patch isn't working → Investigate SDK caching

2. **Check Network tab for WebSocket request**
   - Filter by "WS"
   - Look for Deepgram request
   - Check if request appears at all (even if failed)
   - Check request headers for `Sec-WebSocket-Protocol`

3. **Test in different browser**
   - Try Chrome, Edge, Firefox
   - Check if same error occurs

### High Priority (Test Next):
4. **Check SDK source code**
   - Inspect `node_modules/@deepgram/sdk`
   - Find where WebSocket is created
   - Verify if SDK caches `window.WebSocket`

5. **Try different SDK version**
   - Update to latest: `npm install @deepgram/sdk@latest`
   - Check if issue persists

6. **Test network/firewall**
   - Try mobile hotspot
   - Try incognito mode
   - Check for blocked requests

### Medium Priority (If Above Don't Work):
7. **Check API key restrictions**
   - Verify in Deepgram Console
   - Try creating new key

8. **Check CORS/CSP**
   - Review browser console for errors
   - Check Vite config

9. **Try alternative SDK usage**
   - Check Deepgram SDK examples
   - Try different connection pattern

---

## 📊 Summary

**Ruled Out:** 6 causes
**Partially Tested:** 3 causes (need verification)
**Not Ruled Out:** 10 potential causes

**Most Likely Causes (based on evidence):**
1. SDK cached WebSocket before patch (patch logs don't appear)
2. WebSocket patch not intercepting (SDK uses different method/context)
3. Network/firewall blocking (connection closes immediately)
4. SDK version bug (known issue with protocol header)

**Next Steps:**
1. Verify patch logs appear when clicking mic
2. Check Network tab for WebSocket request and headers
3. Test in different browser
4. Inspect SDK source code for WebSocket creation method

