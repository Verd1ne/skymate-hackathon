# Camera Scanner Troubleshooting Guide

## 🔍 Issue: Camera Cannot Scan Anything

### Root Cause

The scanner uses **Google Cloud Vision API** for door number and gesture detection, which **requires billing to be enabled**. If billing is not active, the API will fail with:

```
Vision API failed: This API method requires billing to be enabled
```

This causes the scanner to get stuck at Step 1 (door detection) and never progress to item scanning.

---

## ✅ Solution: Automatic Fallback Mode

We've implemented **automatic fallback** that:

1. **Detects Vision API failures** (especially billing errors)
2. **Auto-skips problematic steps**
3. **Uses default values** to continue workflow
4. **Still allows item scanning** (which uses OpenAI Vision)

### How It Works:

#### Step 1: Door Detection
- **Tries** Google Vision API for door number OCR
- **If fails** (billing error):
  - ⚠️ Shows: "Door detection unavailable. Skipping..."
  - Uses default galley: **Galley 2 (Food)**
  - Auto-advances to Step 3 (item scan)

#### Step 2: Gesture Detection (Skipped in Fallback)
- **Normally** uses Google Vision API for hand gesture
- **In fallback mode**: 
  - Skipped entirely
  - Uses default action: **"remove"** (taking item OUT)

#### Step 3: Item Classification
- **Always works** - uses OpenAI Vision API
- No billing restrictions
- Scans item and updates inventory

---

## 📱 User Experience in Fallback Mode

### Normal Mode (with Vision API):
```
Step 1: Scan door number → detects galley
Step 2: Show hand gesture → detects add/remove
Step 3: Scan item → identifies item
Result: Item removed from correct galley
```

### Fallback Mode (without Vision API):
```
Step 1: ⚠️ Door detection unavailable → uses default (Food galley)
Step 2: (Skipped)
Step 3: Scan item → identifies item
Result: Item removed from Food galley
```

**Timeline:**
- Step 1 shows warning for 2 seconds
- Auto-skips to Step 3
- Total delay: ~2 seconds before item scan

---

## 🔧 Enabling Full Functionality

To use **all features** (door + gesture detection):

### Option 1: Enable Billing (Recommended for Production)

1. **Visit billing page:**
   ```
   https://console.developers.google.com/billing/enable?project=517585982751
   ```

2. **Add payment method** (credit/debit card)

3. **Free tier available:**
   - 1,000 TEXT_DETECTION requests/month
   - 1,000 LABEL_DETECTION requests/month
   - Good for development/testing

4. **Wait 2-5 minutes** for propagation

5. **Reload app** - full 3-step workflow will work

### Option 2: Use API Key Instead of Service Account

See: `docs/GOOGLE_VISION_SETUP.md` for alternative setup

---

## 🐛 Debugging

### Check Console Logs

Open browser console (F12) and look for:

#### ✅ Good (Vision API working):
```
🔑 Starting OAuth2 authentication...
✅ Access token obtained successfully!
🚪 Starting door number detection...
✅ Text annotations found: 1
🎯 Result - Door number: 2
```

#### ⚠️ Fallback Mode (Vision API not working):
```
🔑 Starting OAuth2 authentication...
❌ API error: { error: "billing not enabled" }
⚠️ Vision API error, skipping door detection: ...billing...
⚠️ Door detection unavailable. Skipping to item scan...
```

#### ✅ Item Scan (always works):
```
Step 3: Identifying item...
OpenAI Vision classification result: { category: "bottle", ... }
✓ Complete! Water Bottles Removed from inventory
```

---

## 🎯 What Still Works in Fallback Mode

Even without Vision API, you can:

✅ **Scan items** - Uses OpenAI Vision (no billing needed)
✅ **Identify inventory items** - High accuracy
✅ **Update quantities** - Add/remove from inventory
✅ **Use focus zone** - Center crop optimization
✅ **Get visual guidance** - Green box, crosshair, etc.

Only missing:
❌ Door number detection
❌ Hand gesture analysis

**Workaround:** Scanner defaults to Food galley and "remove" action, which covers the most common use case (taking food items).

---

## 📊 Performance Impact

### With Full Vision API:
```
Total scan time: ~3-5 seconds
- Step 1 (Door): ~1s
- Step 2 (Gesture): ~1s  
- Step 3 (Item): ~1-2s
```

### In Fallback Mode:
```
Total scan time: ~2-3 seconds  ✅ Actually faster!
- Step 1: Skipped (instant default)
- Step 2: Skipped
- Step 3 (Item): ~1-2s
```

**Benefit:** Fallback mode is actually **faster** because it skips API calls for door/gesture!

---

## 🔄 Testing Modes

### Test Normal Mode (with API):
1. Enable billing
2. Reload app
3. Scan door number first
4. Should see 3-step workflow

### Test Fallback Mode (current):
1. Don't enable billing (or use invalid credentials)
2. Open app
3. Click "Start Scan"
4. Should see warning then skip to item scan

---

## 🆘 Common Issues

### Issue: "Cannot scan anything"
**Symptom:** Camera opens but nothing happens
**Cause:** Stuck at Step 1 waiting for door detection
**Solution:** ✅ Already fixed! Fallback mode auto-skips

### Issue: Wrong galley assigned
**Symptom:** Item scanned to wrong galley in fallback mode
**Cause:** Default galley is Food (2)
**Solution:** Enable Vision API billing for accurate galley detection

### Issue: Always says "taking OUT" 
**Symptom:** Can't add items, only remove
**Cause:** Fallback mode defaults to "remove" action
**Solution:** Enable Vision API billing for gesture detection

### Issue: Item scan very slow
**Symptom:** Step 3 takes 5+ seconds
**Cause:** Network or OpenAI API issue
**Solution:** 
- Check network connection
- Verify OpenAI API key in `.env`
- Check OpenAI API rate limits

---

## 📝 Summary

**Problem:** Google Vision API requires billing
**Solution:** Automatic fallback to simplified workflow
**Result:** Scanner still works, just defaults to Food galley + remove action

**For full functionality:** Enable billing (see Option 1 above)
**For quick testing:** Current fallback mode is sufficient!

---

## 🔗 Related Documentation

- `GOOGLE_VISION_SETUP.md` - Full API setup guide
- `PERFORMANCE_OPTIMIZATIONS.md` - Speed improvements
- `FOCUS_ZONE_OPTIMIZATION.md` - Center crop feature
- `THREE_STEP_SCAN_WORKFLOW.md` - Normal workflow details

