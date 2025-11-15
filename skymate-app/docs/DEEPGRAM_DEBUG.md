# Deepgram WebSocket Debug Guide

## 🔍 Current Issue

WebSocket connection fails even though API key works with curl. This suggests:

- ✅ API key is valid
- ❌ API key not loaded in browser OR
- ❌ WebSocket connection blocked OR
- ❌ SDK initialization issue

## 🔧 Step-by-Step Debugging

### Step 1: Verify API Key is Loaded

1. Open browser console (F12)
2. Click the microphone button
3. Look for these messages:
   - `🔑 Deepgram API key loaded: 4f7fa21bee...` ✅ Good
   - `⚠️ Deepgram API key not configured` ❌ Bad

**If you see "not configured":**

- Check `.env` file exists in `skymate-app/` folder
- Verify `VITE_DEEPGRAM_API_KEY=4f7fa21bee22a49b3e1b3d377aea8bfacfa820b6` (no quotes)
- **RESTART dev server** (`npm run dev`)

### Step 2: Check Connection Attempt

After clicking mic, you should see:

```
🔌 Attempting to connect to Deepgram...
🔌 Deepgram connection object created
```

If you DON'T see these, the connection isn't being created.

### Step 3: Check WebSocket Error Details

In browser console, look for:

```
❌ Deepgram error: Event {...}
Error details: { readyState: 3, ... }
```

**readyState meanings:**

- `0` = CONNECTING
- `1` = OPEN ✅
- `2` = CLOSING
- `3` = CLOSED ❌ (Connection failed)

### Step 4: Verify Environment Variable

In browser console, type:

```javascript
import.meta.env.VITE_DEEPGRAM_API_KEY;
```

**Expected:** `"4f7fa21bee22a49b3e1b3d377aea8bfacfa820b6"` (your key)
**If undefined:** API key not loaded - restart dev server

### Step 5: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Click microphone button
4. Look for `wss://api.deepgram.com/v1/listen...`

**Check:**

- Is the request appearing? ✅
- What's the status? (should be 101 Switching Protocols)
- Any error messages?

### Step 6: Common Fixes

#### Fix 1: Restart Dev Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

Vite only reads `.env` on startup!

#### Fix 2: Check .env File Location

`.env` must be in `skymate-app/` folder (same level as `package.json`)

#### Fix 3: Verify .env Format

```env
# ✅ CORRECT
VITE_DEEPGRAM_API_KEY=4f7fa21bee22a49b3e1b3d377aea8bfacfa820b6

# ❌ WRONG (quotes)
VITE_DEEPGRAM_API_KEY="4f7fa21bee22a49b3e1b3d377aea8bfacfa820b6"

# ❌ WRONG (spaces)
VITE_DEEPGRAM_API_KEY = 4f7fa21bee22a49b3e1b3d377aea8bfacfa820b6
```

#### Fix 4: Clear Browser Cache

- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or try incognito/private window

#### Fix 5: Check Firewall/Network

- Try different network (mobile hotspot)
- Disable VPN if using one
- Check if corporate firewall blocks WebSockets

#### Fix 6: Try Different Browser

- Chrome/Edge work best
- Firefox sometimes has WebSocket issues

### Step 7: Test API Key Directly

In browser console, test if key works:

```javascript
// This won't work due to CORS, but shows if key format is correct
fetch("https://api.deepgram.com/v1/projects", {
  headers: {
    Authorization: `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
  },
});
```

### Step 8: Verify Deepgram SDK Version

Check `package.json`:

```json
"@deepgram/sdk": "^3.5.0"
```

If version is different, try:

```bash
npm install @deepgram/sdk@latest
```

## 🎯 Quick Checklist

- [ ] `.env` file in `skymate-app/` folder
- [ ] `VITE_DEEPGRAM_API_KEY` set (no quotes, no spaces)
- [ ] Dev server restarted after `.env` changes
- [ ] Browser console shows "🔑 Deepgram API key loaded"
- [ ] Browser console shows "🔌 Attempting to connect"
- [ ] Network tab shows WebSocket connection attempt
- [ ] No firewall blocking WebSocket connections
- [ ] Using Chrome/Edge browser

## 🚨 Still Not Working?

If after all steps it still fails:

1. **Double-check API key** - Make sure it's the exact same key that works with curl
2. **Check Deepgram console** - Verify API key status and permissions
3. **Try creating new API key** - Sometimes keys can have issues
4. **Check browser console** - Share the full error message
5. **Network inspection** - Share what you see in Network tab for WebSocket

## 📝 Expected Console Output (Success)

```
🔑 Deepgram API key loaded: 4f7fa21bee...
✅ Deepgram client initialized
🔌 Attempting to connect to Deepgram...
🔌 Deepgram connection object created
Deepgram connection opened
```

If you see all of these, connection should work!
