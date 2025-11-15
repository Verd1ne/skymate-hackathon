# Deepgram WebSocket Integration - Developer Guide

## Overview

This app uses Deepgram SDK v4.11.2 for live audio transcription via WebSocket. The implementation follows strict ordering to ensure reliable connections.

## Architecture

### SDK Usage
- Uses `@deepgram/sdk` (v4.11.2) - automatically detects browser environment
- SDK handles WebSocket connection internally - **never call `.connect()` manually**

### Connection Flow (Exact Order)

1. **Microphone Access** - Request `getUserMedia()` first
2. **Create Connection** - Call `listen.live()` with options
3. **Attach Handlers** - Register all event handlers immediately
4. **Create MediaRecorder** - After handlers are attached
5. **Start Recording** - Only after `Open` event fires
6. **Send Audio** - Only after `Open` event fires

## Key Files

- `src/lib/voice.ts` - Main VoiceService implementation
- `src/lib/dgSmoke.ts` - Raw WebSocket smoke test utility
- `src/earlyPatch.ts` - Optional WebSocket visibility patch

## Testing

### 1. Network Tab Inspection

Open DevTools → Network → Filter by "WS" (WebSocket)

**Expected:**
- Request to `wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&...`
- Status: `101 Switching Protocols`
- Request Headers include: `Sec-WebSocket-Protocol: token, <API_KEY>`

**If missing:**
- Protocol header not set → Authentication will fail
- Request doesn't appear → Connection never established

### 2. Raw WebSocket Smoke Test

In dev mode, click the "Test Raw WebSocket" button in VoiceInput.

**If PASS:**
- Browser/network/CSP is OK
- Issue is in SDK usage/order/context

**If FAIL:**
- Browser/network/CSP blocking
- Check CSP, firewall, network restrictions

### 3. Console Logs

**Expected sequence:**
```
🎤 Requesting microphone access...
✅ Microphone access granted
🔌 Creating DG live connection...
✅ DG: live connection created
🔍 DG conn class: ListenLiveClient
✅ DG: WS opened ✅
🎙️ MediaRecorder started
🎵 DG: sending audio chunk
📝 DG transcript: <text>
```

**Error indicators:**
- `❌ DG: WS error` → Connection failed
- `🔌 DG: WS closed` → Connection closed unexpectedly
- Missing `✅ DG: WS opened` → Connection never opened

## CSP (Content Security Policy)

Ensure your CSP allows WebSocket connections:

```html
<meta http-equiv="Content-Security-Policy" content="
  connect-src 'self' wss://api.deepgram.com https://api.deepgram.com;
">
```

Or in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "connect-src 'self' wss://api.deepgram.com https://api.deepgram.com;"
    }
  }
})
```

## Troubleshooting

### WebSocket doesn't appear in Network tab

**Possible causes:**
1. SDK cached `window.WebSocket` before patch
2. Connection fails before handshake completes
3. SDK uses different context (Worker/iframe)

**Solutions:**
- Check early patch logs: `🔍 [WebSocket #1] Creating`
- Run raw smoke test to isolate issue
- Check browser console for errors

### Missing `Sec-WebSocket-Protocol` header

**Symptoms:**
- WebSocket appears but `protocol: NONE`
- Connection closes with code 1006 (abnormal closure)

**Solutions:**
- Verify SDK is properly initialized with API key
- Check early patch is intercepting WebSocket creation
- Verify API key is passed correctly to SDK
- Run raw smoke test to isolate browser/network issues

### Connection closes immediately

**Possible causes:**
1. Missing protocol header (authentication failure)
2. Network/firewall blocking WebSocket
3. Invalid API key
4. CSP blocking connection

**Solutions:**
1. Run raw smoke test
2. Check Network tab for CSP errors
3. Verify API key in Deepgram Console
4. Try incognito mode (extensions off)
5. Try different browser/network

### Handlers not firing

**Possible causes:**
1. Handlers attached too late (after connection opens)
2. SDK version incompatibility
3. Event names changed

**Solutions:**
- Ensure handlers are attached BEFORE MediaRecorder starts
- Check SDK version matches docs
- Verify event names: `LiveTranscriptionEvents.Open`, etc.

## Environment Variables

```env
VITE_DEEPGRAM_API_KEY=your_api_key_here
```

**Important:**
- No quotes around the key
- No spaces before/after `=`
- Restart dev server after changes
- Key must be 40+ characters

## Browser Compatibility

**Recommended:**
- Chrome/Edge (latest)
- Firefox (latest)

**Known Issues:**
- Safari may have WebSocket restrictions
- Older browsers may not support required WebSocket features

## Testing Checklist

- [ ] Network tab shows WebSocket request
- [ ] Request headers include `Sec-WebSocket-Protocol`
- [ ] Console shows `✅ DG: WS opened`
- [ ] Audio chunks are sent after Open
- [ ] Transcript events fire with text
- [ ] Raw smoke test passes (dev mode)
- [ ] Works in incognito mode
- [ ] Works on different network

## Additional Resources

- [Deepgram WebSocket API Docs](https://developers.deepgram.com/docs/using-the-sec-websocket-protocol)
- [Deepgram SDK Browser Guide](https://github.com/deepgram/deepgram-js-sdk)
- [WebSocket Protocol Spec](https://tools.ietf.org/html/rfc6455)

