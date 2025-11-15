# Google Cloud Vision API - Service Account Setup Guide

## Quick Answer: Yes, Service Accounts are Perfect! ✅

**Service accounts are the recommended and most common way to use Google Cloud Vision API.** They're secure, easy to manage, and don't require user login.

---

## What is a Service Account?

A service account is a special type of Google account that belongs to your application (not a person). Think of it as:
- An "app password" for Google Cloud services
- No username/password needed
- Perfect for backend/server applications
- Secure and easy to revoke if compromised

---

## Setup Guide (5 Minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `skymate-vision`
4. Click **"Create"**

### Step 2: Enable Cloud Vision API

1. In the search bar, type **"Cloud Vision API"**
2. Click on **"Cloud Vision API"** in results
3. Click **"Enable"** button
4. Wait ~30 seconds for activation

### Step 3: Create Service Account

1. Go to **"IAM & Admin"** → **"Service Accounts"** (left sidebar)
2. Click **"+ Create Service Account"** (top of page)
3. Fill in:
   ```
   Service account name: skymate-vision-api
   Service account ID: skymate-vision-api (auto-filled)
   Description: Service account for Skymate door number OCR
   ```
4. Click **"Create and Continue"**

### Step 4: Grant Permissions

1. In "Grant this service account access to project":
   - Click the **"Select a role"** dropdown
   - Search for: **"Cloud Vision AI"**
   - Select: **"Cloud Vision AI Service Agent"**
   - (Alternative: Select **"Cloud Vision API User"** for more restrictive permissions)
2. Click **"Continue"**
3. Click **"Done"**

### Step 5: Create and Download Key

1. Find your service account in the list
2. Click on it to open details
3. Go to **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. **Key file downloads automatically** - Save it somewhere safe!

### Step 6: Secure the Key File

```bash
# Create a secure directory (outside your project)
mkdir -p ~/secrets

# Move the downloaded key there
mv ~/Downloads/skymate-vision-api-*.json ~/secrets/skymate-vision-key.json

# Set restrictive permissions (macOS/Linux)
chmod 600 ~/secrets/skymate-vision-key.json
```

### Step 7: Configure Your App

Add to your `.env` file:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/Users/yourname/secrets/skymate-vision-key.json
```

Or use absolute path from home:
```bash
GOOGLE_APPLICATION_CREDENTIALS=$HOME/secrets/skymate-vision-key.json
```

### Step 8: Install SDK

```bash
cd skymate-app
npm install @google-cloud/vision
```

---

## Using Service Account in Code

### Basic Implementation

```typescript
import vision from '@google-cloud/vision';

// Automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
const client = new vision.ImageAnnotatorClient();

export async function detectDoorNumber(imageBase64: string): Promise<number | null> {
  const [result] = await client.textDetection({
    image: { content: imageBase64 },
  });
  
  const text = result.textAnnotations?.[0]?.description || '';
  const numbers = text.match(/\d+/g);
  
  return numbers ? parseInt(numbers[0], 10) : null;
}
```

### Explicit Key File Path

```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Use client same as above
```

### For Cloud Deployment (Vercel, Netlify, etc.)

Instead of uploading the JSON file, use environment variables:

```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GCP_PROJECT_ID,
});
```

Then in your deployment platform, set these environment variables:
```
GCP_PROJECT_ID=skymate-vision
GCP_CLIENT_EMAIL=skymate-vision-api@skymate-vision.iam.gserviceaccount.com
GCP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
```

---

## Security Best Practices

### ✅ DO:
- Store key file **outside** your project directory
- Add `*.json` to `.gitignore`
- Use environment variables for paths
- Create separate service accounts for dev/staging/prod
- Rotate keys every 90 days
- Use minimal permissions ("Cloud Vision API User" role)

### ❌ DON'T:
- **Never** commit key files to Git
- **Never** share key files via email/Slack
- **Never** hardcode paths in code
- **Never** store keys in client-side code
- **Never** use personal Google account credentials

### Add to .gitignore:
```
# Google Cloud Service Account Keys
*.json
!package.json
!tsconfig.json
config/service-account-*.json
secrets/
.env
.env.local
```

---

## Testing Your Setup

```typescript
// test-vision.ts
import vision from '@google-cloud/vision';
import fs from 'fs';

const client = new vision.ImageAnnotatorClient();

async function testVision() {
  // Test with a simple text image
  const imageBuffer = fs.readFileSync('./test-image.jpg');
  const [result] = await client.textDetection(imageBuffer);
  
  console.log('Detected text:', result.textAnnotations?.[0]?.description);
  console.log('✅ Google Cloud Vision API is working!');
}

testVision().catch(console.error);
```

Run it:
```bash
npx ts-node test-vision.ts
```

---

## Troubleshooting

### Error: "Cannot find service account key file"
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure file exists: `ls -la $GOOGLE_APPLICATION_CREDENTIALS`
- Use absolute path, not relative

### Error: "Permission denied"
- Go to IAM & Admin → Service Accounts
- Verify "Cloud Vision API User" role is assigned
- Make sure API is enabled

### Error: "API has not been used in project..."
- Enable Cloud Vision API in your project
- Wait 1-2 minutes for propagation
- Try again

### Error: "Invalid authentication credentials"
- Key file might be corrupted
- Re-download key from Google Cloud Console
- Check JSON file is valid: `cat keyfile.json | jq`

---

## Cost Management

### Free Tier (Monthly):
- **1,000 text detection requests** - FREE
- Perfect for development and testing

### After Free Tier:
- **$1.50 per 1,000 images** (Text Detection)
- Example: 10,000 door scans/month = $13.50

### Cost Saving Tips:
1. Cache results (don't re-scan same door)
2. Resize images before sending (smaller = faster = cheaper)
3. Use lower resolution for door numbers (1024px width sufficient)
4. Set up budget alerts in Google Cloud Console

---

## Comparison: Service Account vs Other Auth Methods

| Method | Use Case | Security | Ease of Use |
|--------|----------|----------|-------------|
| **Service Account** ✅ | Server/backend apps | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| API Key | Simple public apps | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| OAuth 2.0 | User-facing apps | ⭐⭐⭐⭐ | ⭐⭐ |
| Application Default | Google Cloud hosted | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Service accounts are the best choice for Skymate** because:
- No user login flow needed
- Secure credential storage
- Easy to revoke if compromised
- Works everywhere (local, cloud, containers)

---

## Next Steps

1. ✅ Create service account (done!)
2. ✅ Download key file (done!)
3. ✅ Secure key file (done!)
4. 🔄 Update `ocrService.ts` to use Google Cloud Vision
5. 🔄 Test with real door images
6. 🔄 Deploy to production

---

## Summary

**Yes, service accounts are perfect for Google Cloud Vision API!** They're:
- ✅ Secure (better than API keys)
- ✅ Easy to set up (5 minutes)
- ✅ Recommended by Google
- ✅ Perfect for Skymate's use case
- ✅ Work in development and production

Your service account gives your app permission to use Vision API without requiring any user to log in. It's the standard way to authenticate server-side applications with Google Cloud services.

**You're all set!** 🎉

