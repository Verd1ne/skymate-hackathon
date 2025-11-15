# Debugging Door Number Scanning

## ✅ Enhanced Debugging Added

I've added comprehensive logging to help diagnose why door numbers aren't being detected.

---

## 🔍 How to Debug

### Step 1: Open Browser Console

1. Open the app in your browser
2. Press **F12** (or **Cmd+Option+I** on Mac) to open DevTools
3. Go to the **Console** tab
4. Click "Start Scan" button

---

## 📊 Console Output to Watch For

### Expected Flow (Success)

When door scanning works correctly, you'll see:

```
🔑 Starting OAuth2 authentication...
📝 JWT Claim Set: {iss: "skymate-service@...", scope: "...", ...}
🔐 Importing private key...
✍️ Signing JWT...
🌐 Exchanging JWT for access token...
✅ Access token obtained successfully!

🚪 Starting door number detection...
📸 Image size: 123 KB
🔑 Getting access token...
✅ Access token obtained successfully!
📤 Sending request to Google Cloud Vision API...
📥 Response status: 200 OK
📊 Full API response: {...}
✅ Text annotations found: 1
📝 Detected text: "2"
🔢 Extracted numbers: ["2"]
🎯 Result - Door number: 2 Confidence: 0.95
```

---

## 🐛 Common Issues & Solutions

### Issue 1: OAuth2 Authentication Failure

**Console shows:**
```
❌ OAuth2 error: {error: "invalid_grant", ...}
❌ OAuth2 authentication failed: Error: OAuth2 failed: invalid_grant
```

**Causes:**
- Service account credentials are incorrect
- Private key format is wrong
- Time is out of sync (JWT exp/iat)

**Solutions:**
1. Verify service account email: `skymate-service@skymate-477913.iam.gserviceaccount.com`
2. Check private key starts with `-----BEGIN PRIVATE KEY-----`
3. Check system time is correct
4. Regenerate service account key if needed

---

### Issue 2: API Not Enabled

**Console shows:**
```
❌ API error: {
  error: {
    code: 403,
    message: "Cloud Vision API has not been used in project...",
    status: "PERMISSION_DENIED"
  }
}
```

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `skymate-477913`
3. Go to **APIs & Services** → **Library**
4. Search for **"Cloud Vision API"**
5. Click **"Enable"**
6. Wait 1-2 minutes for activation

---

### Issue 3: No Text Detected

**Console shows:**
```
⚠️ No text detected in image
```

**Causes:**
- Image quality too poor
- Number too small or blurry
- Lighting is bad
- No actual number in frame

**Solutions:**
1. **Hold camera steady** - reduce motion blur
2. **Get closer** - make number larger in frame
3. **Improve lighting** - use flashlight or move to bright area
4. **Focus on number** - ensure door number is centered
5. **Try different angle** - avoid glare/reflections

---

### Issue 4: Wrong Number Detected

**Console shows:**
```
📝 Detected text: "12"  (when door is actually "2")
🔢 Extracted numbers: ["12"]
```

**Causes:**
- Text near the actual door number
- Poor framing (capturing extra text)
- Similar-looking numbers nearby

**Solutions:**
1. **Frame only the door number** - avoid surrounding text
2. **Get closer** - isolate the number
3. **Cover other text** - with your hand if needed

---

### Issue 5: Image Not Captured

**Console shows:**
```
❌ No base64 image data found
```

**Causes:**
- Camera not initialized
- Canvas not ready
- Image capture failed

**Solutions:**
1. **Retry** - Click retry button
2. **Check permissions** - Allow camera access
3. **Reload app** - Refresh the page

---

### Issue 6: Network/CORS Issues

**Console shows:**
```
Failed to fetch
CORS policy: No 'Access-Control-Allow-Origin'
```

**Causes:**
- Network connectivity issues
- Firewall blocking requests
- CORS misconfiguration

**Solutions:**
1. **Check internet connection**
2. **Try different network** (switch from WiFi to mobile data)
3. **Disable VPN** if using one
4. **Check firewall settings**

---

## 🔬 Detailed Debugging Steps

### 1. Check Authentication

Look for these console messages:

**Good:**
```
✅ Access token obtained successfully!
```

**Bad:**
```
❌ OAuth2 error: {error: "invalid_grant"}
```

If authentication fails, the service account credentials might be wrong.

---

### 2. Check API Response

Look for the full API response:

**Good (Text Found):**
```json
{
  "responses": [
    {
      "textAnnotations": [
        {
          "description": "2",
          "boundingPoly": {...},
          "confidence": 0.95
        }
      ]
    }
  ]
}
```

**Bad (No Text):**
```json
{
  "responses": [{}]
}
```

**Bad (API Error):**
```json
{
  "error": {
    "code": 403,
    "message": "Cloud Vision API has not been used...",
    "status": "PERMISSION_DENIED"
  }
}
```

---

### 3. Check Image Quality

Check these logs:
```
📸 Image size: XXX KB
```

- **Too small** (< 20 KB): Image quality might be poor
- **Good range** (50-500 KB): Ideal for scanning
- **Too large** (> 2 MB): Might timeout

---

### 4. Check Number Extraction

Look for:
```
🔢 Extracted numbers: ["2"]
🎯 Result - Door number: 2 Confidence: 0.95
```

If numbers array is empty `[]`, the API didn't find any digits.

---

## 🎯 Quick Checklist

Before reporting issues, verify:

- [ ] Browser console is open (F12)
- [ ] Internet connection is working
- [ ] Camera permissions are granted
- [ ] Cloud Vision API is enabled in Google Cloud Console
- [ ] Service account email is correct: `skymate-service@skymate-477913.iam.gserviceaccount.com`
- [ ] Door number is clearly visible in camera
- [ ] Lighting is adequate
- [ ] Camera is held steady

---

## 📝 Reporting Issues

If scanning still doesn't work, share these details:

1. **Full console output** (copy all logs)
2. **Photo of what you're scanning** (if possible)
3. **Browser** (Chrome, Firefox, Safari)
4. **Device** (iPhone, Android, Desktop)
5. **Network** (WiFi, mobile data)
6. **Error message** (exact text)

---

## 🔧 Advanced: Test API Directly

To test if Google Cloud Vision API is working independently:

### Using curl:

```bash
# Get your access token from console logs, then:

curl -X POST \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  https://vision.googleapis.com/v1/images:annotate \
  -d '{
    "requests": [{
      "image": {"content": "BASE64_IMAGE_HERE"},
      "features": [{"type": "TEXT_DETECTION"}]
    }]
  }'
```

If this returns text, the API works and the issue is in the app.

---

## 🎉 Success Indicators

You know it's working when you see:

1. ✅ **Green checkmark** in step progress
2. ✅ **"Door X detected"** message
3. ✅ **Galley name** shown (Beverages/Food/Towels)
4. ✅ **Auto-advance** to step 2 after 2 seconds

---

## 💡 Pro Tips

### For Best Results:

1. **Good lighting** - Use natural light or turn on room lights
2. **Steady hands** - Rest phone on something if needed
3. **Center the number** - Fill frame with door number
4. **Clean lens** - Wipe camera lens before scanning
5. **Avoid glare** - Angle camera to avoid reflections
6. **Wait for focus** - Let camera auto-focus before scanning

### Common Mistakes:

❌ Moving camera while scanning  
❌ Too far from door number  
❌ Scanning in dark environment  
❌ Capturing extra text around number  
❌ Not waiting for API response  

✅ Hold steady  
✅ Get close (6-12 inches)  
✅ Use good lighting  
✅ Frame only the number  
✅ Wait for detection  

---

## 🆘 Still Not Working?

If you've tried everything and it still doesn't work:

1. **Check console** for any red errors
2. **Copy full console output**
3. **Take screenshot** of what you're scanning
4. **Share details** with developer

The detailed logging will help identify exactly where the process is failing!

---

**Remember: The console logs will tell you exactly what's happening at each step!** 🔍

