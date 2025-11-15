/**
 * Google Cloud Vision API Service
 * 
 * Uses service account authentication for OCR and image analysis
 */

// Service account credentials
const GOOGLE_CREDENTIALS = {
  "type": "service_account",
  "project_id": "skymate-477913",
  "private_key_id": "62a198d63246141d66ea14b77ee7623b4fa862e4",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhUV2OHC1udaXL\nMwU2BE9ZFGE/gs8ONMDEvdvXF61NPxB8URZf/kT4aG7bzinMPHLsawf37CJlcUD2\nVMVk7z2DxOj8cw0PYwARhQT/7kXkhD1fIRiegOA2sTYYxRG8X1bcAZLi3+2yof3h\nYKOqFq6RyVEnrjtBsKcKs/Xm/qDb258tX2RJJAjFrZ/nTYehxEwShQnQShfxFPKy\n0mPmE6u8ue2ds9IXruipAxGDRFsEWLWXoRaqXVxOxwese5dhFDSuk7TRvniIMMQb\nCKw4KxLC8mhyUj+v7SO4Psv6mN1G6KTlrMjxE9TKzQmLMnH/DCvC/Yg9LEBSyC/Y\nPlh2L6+HAgMBAAECgf9VUj4bGb2h+FRXcNxqLqEKofhPfe35VQ+qJWgpOFWU6sUX\nISUbrQ9h8oREe68cAiJVgm5y+vgpj+aRJNP1KIT1nSKc0HvlV7X6N7AldlE9ZJnY\n1YJe+5uRktTLQSAq6ZUJup3ktQVNrqCS9AVgJvpsdoQmoKZmV8naYdK8PL7LNnwS\nnk26/Fu0/xUfnf09VqWxOcJrZurLBJGokGjoiiXhWQE8PHdOwvGQnLMgbHc0NJ1K\nI4FQji4Y0jMH+tu4WB0sXsPzUsi6BLdQOG9fSs2HZtOx4LPvnSMKD0upFOlBzR3D\nSAoPzEAG2IS5entQlyPr1pHXmqPP9H89ZBI9lwECgYEA9TYEBoK7Kho+mtJjP/pp\nXfw0+/ifx+1GFE0pVAYTKjn6hJ3HcSgpoaMktU1SEUV/9ik8mJ1PcI8flF0vhMRS\n82Pfo9kGFuAEQCDQHT6q28Z/0gslCilzzYtMeyqW0+ojM6T5daNe3VfvjZ6LUZ9U\nkFgMmdxGML3GQXJjGHs5SvkCgYEA6ztHa8Q/ULlBIQlvutQBIbvuFZ1MEG6K9hY9\nsoLGueCpgAD+4EavzF/lba1jNZpHNUTyjIsHzILpxlc2Tm8ELcAawJc+NWiKQlMW\nbUEOWrh9dCD3V+GZTK8RbnHO0XpExGxjYcauPYEO/uxZsExriAwV2SoSJaDLrWrQ\nBU2Q7n8CgYEAvnfYpJ4Dd+6u1l+5jEacdc6j8Vzr78XUe4x8H7IgTNqAR2avNqw1\nukIZD2Mh7hyICtN5KCp5PDtQElRXxs8gh8H6QzEeU8JqSs2yGiVFXjVPr/3MJZqR\nQwWCwOESC0WBVmo9Ay2FUHUvtFeEbEBQ1VYvY4wAUXf3eXq6kpeUpzECgYEA6M/3\nxQorXBquAiOTyIYRRLD6V7whz1WJBTxH/gh+5PMc70qM964eShlTOjTULvYtqeQ+\nZqkno9qhwyMH5aLssNcj4x8Ne9CmnjQbyzALI/DagXgrNXhbwFC44OWUuzDXJMzd\no6T/SHIWRGnp7poEB1dmvFNuOH2neFBx5/24BsMCgYEAuctOa4rFRUVUZ25iZrkY\nYltC5rNERvvJ9ZBu3Wr8m2pgcCUwTd+EkXGoWHcR/zdgqJI+Wp6BWuSxSKsMGn7n\ni/dCS4wViM9ZnzVEnjn5B7eq1J3wn08JtDsq5KN2UxmZ+KlRWK9sOdbQDCjPbzFg\nN+iCpf9ytE90o7Qk6xoenQA=\n-----END PRIVATE KEY-----\n",
  "client_email": "skymate-service@skymate-477913.iam.gserviceaccount.com",
  "client_id": "111574368221297915741",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/skymate-service%40skymate-477913.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


export interface VisionOCRResult {
  text: string;
  doorNumber: number | null;
  confidence: number;
}

export interface HandGestureResult {
  hasItem: boolean; // true if holding an item
  direction: 'in' | 'out' | 'unknown'; // hand moving into or out of galley
  confidence: number;
  description: string;
}

/**
 * Get OAuth2 access token for Google Cloud Vision API
 */
async function getAccessToken(): Promise<string> {
  try {
    console.log('🔑 Starting OAuth2 authentication...');
    
    // Create JWT header
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT'
    };
    const encodedHeader = btoa(JSON.stringify(jwtHeader))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: GOOGLE_CREDENTIALS.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-vision',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    
    console.log('📝 JWT Claim Set:', jwtClaimSet);
    
    const encodedPayload = btoa(JSON.stringify(jwtClaimSet))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    console.log('🔐 Importing private key...');
    
    // Import private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(GOOGLE_CREDENTIALS.private_key),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    console.log('✍️ Signing JWT...');
    
    // Sign JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );
    
    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature);
    let signatureBase64 = '';
    for (let i = 0; i < signatureArray.length; i++) {
      signatureBase64 += String.fromCharCode(signatureArray[i]);
    }
    
    const encodedSignature = btoa(signatureBase64)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const jwt = `${signatureInput}.${encodedSignature}`;
    
    console.log('🌐 Exchanging JWT for access token...');
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ OAuth2 error:', data);
      throw new Error(`OAuth2 failed: ${data.error || 'Unknown error'}`);
    }
    
    if (!data.access_token) {
      console.error('❌ No access token in response:', data);
      throw new Error('No access token received');
    }
    
    console.log('✅ Access token obtained successfully!');
    return data.access_token;
  } catch (error) {
    console.error('❌ OAuth2 authentication failed:', error);
    throw error;
  }
}

/**
 * Convert PEM private key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Detect door number using Google Cloud Vision API Text Detection
 */
export async function detectDoorNumberWithVision(
  imageDataUrl: string
): Promise<VisionOCRResult> {
  try {
    console.log('🚪 Starting door number detection...');
    
    const base64Image = imageDataUrl.split(',')[1];
    
    if (!base64Image) {
      console.error('❌ No base64 image data found');
      throw new Error('Invalid image data');
    }
    
    console.log('📸 Image size:', Math.round(base64Image.length / 1024), 'KB');
    
    console.log('🔑 Getting access token...');
    const accessToken = await getAccessToken();
    
    console.log('📤 Sending request to Google Cloud Vision API...');
    
    const requestBody = {
      requests: [{
        image: { content: base64Image },
        features: [{
          type: 'TEXT_DETECTION',
          maxResults: 5,
        }],
      }],
    };
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📊 Full API response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ API error:', data);
      throw new Error(`Vision API failed: ${data.error?.message || 'Unknown error'}`);
    }
    
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      console.warn('⚠️ No text detected in image');
      
      // Check if there's an error in the response
      if (data.responses?.[0]?.error) {
        console.error('❌ API returned error:', data.responses[0].error);
        throw new Error(data.responses[0].error.message);
      }
      
      return { text: '', doorNumber: null, confidence: 0 };
    }
    
    console.log('✅ Text annotations found:', textAnnotations.length);
    console.log('📝 Detected text:', textAnnotations[0].description);
    
    const detectedText = textAnnotations[0].description;
    const numbers = detectedText.match(/\d+/g);
    
    console.log('🔢 Extracted numbers:', numbers);
    
    const doorNumber = numbers ? parseInt(numbers[0], 10) : null;
    const confidence = textAnnotations[0].confidence || 0.95;
    
    console.log('🎯 Result - Door number:', doorNumber, 'Confidence:', confidence);
    
    return { text: detectedText, doorNumber, confidence };
  } catch (error: any) {
    console.error('❌ Door number detection error:', error);
    console.error('❌ Error stack:', error.stack);
    throw new Error(`Failed to detect door number: ${error.message}`);
  }
}

/**
 * Analyze hand gesture and determine action (putting in or taking out)
 * Uses Google Cloud Vision API with detailed image analysis
 */
export async function analyzeHandGesture(
  imageDataUrl: string
): Promise<HandGestureResult> {
  try {
    const base64Image = imageDataUrl.split(',')[1];
    const accessToken = await getAccessToken();
    
    // Use Image Properties and Label Detection
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
            ],
          }],
        }),
      }
    );
    
    const data = await response.json();
    const labels = data.responses?.[0]?.labelAnnotations || [];
    const objects = data.responses?.[0]?.localizedObjectAnnotations || [];
    
    // Check for hands and objects
    const handLabels = labels.filter((l: any) => 
      l.description.toLowerCase().includes('hand') ||
      l.description.toLowerCase().includes('finger') ||
      l.description.toLowerCase().includes('gesture')
    );
    
    const objectLabels = labels.filter((l: any) => 
      l.description.toLowerCase().includes('bottle') ||
      l.description.toLowerCase().includes('container') ||
      l.description.toLowerCase().includes('package') ||
      l.description.toLowerCase().includes('food')
    );
    
    const hasHand = handLabels.length > 0;
    const hasObject = objectLabels.length > 0 || objects.length > 0;
    
    // Determine if holding item based on detected objects near hand
    const hasItem = hasHand && hasObject;
    
    // Analyze position for direction (simplified heuristic)
    let direction: 'in' | 'out' | 'unknown' = 'unknown';
    if (objects.length > 0) {
      const avgY = objects.reduce((sum: number, obj: any) => 
        sum + (obj.boundingPoly?.normalizedVertices?.[0]?.y || 0.5), 0
      ) / objects.length;
      
      // If object is in upper half, likely going in; lower half, likely coming out
      direction = avgY < 0.5 ? 'in' : 'out';
    }
    
    const confidence = hasHand ? 
      (handLabels[0]?.score || 0.7) : 0.3;
    
    const description = hasItem ? 
      (direction === 'in' ? 'Hand holding item, moving into galley' : 'Hand holding item, taking from galley') :
      'Empty hand or no clear action detected';
    
    return {
      hasItem,
      direction,
      confidence,
      description,
    };
  } catch (error) {
    console.error('Hand gesture analysis error:', error);
    return {
      hasItem: false,
      direction: 'unknown',
      confidence: 0,
      description: 'Unable to analyze gesture',
    };
  }
}

