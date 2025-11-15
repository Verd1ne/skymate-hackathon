/**
 * Item Identification Service
 * Extracts frame from video and uses Google Cloud Vision to identify items
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';

// Service account credentials (same as other services)
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
};

// Initialize Vision API client
const visionClient = new ImageAnnotatorClient({
  projectId: GOOGLE_CREDENTIALS.project_id,
  credentials: {
    client_email: GOOGLE_CREDENTIALS.client_email,
    private_key: GOOGLE_CREDENTIALS.private_key,
  },
});

/**
 * Extract a frame from video at specified timestamp
 * @param videoPath - Path to video file
 * @param timestamp - Timestamp in seconds (default: 2.5s - middle of 5s video)
 * @returns Path to extracted frame image
 */
export async function extractFrameFromVideo(
  videoPath: string,
  timestamp: number = 2.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      path.dirname(videoPath),
      `frame_${Date.now()}.jpg`
    );

    console.log(`🎬 Extracting frame from video at ${timestamp}s...`);

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?', // 640px width, maintain aspect ratio
      })
      .on('end', () => {
        console.log(`✅ Frame extracted: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Error extracting frame:', err);
        reject(new Error(`Frame extraction failed: ${err.message}`));
      });
  });
}

/**
 * Identify item in image using Google Cloud Vision API
 * @param imagePath - Path to image file
 * @returns Identified item name
 */
export async function identifyItemInImage(imagePath: string): Promise<{
  item: string;
  confidence: number;
}> {
  try {
    console.log(`🔍 Identifying item in image: ${imagePath}`);

    // Read image file
    const imageBuffer = await fs.readFile(imagePath);

    // Call Vision API for label detection and object localization
    const [labelResult] = await visionClient.labelDetection({
      image: { content: imageBuffer },
    });

    const [objectResult] = await visionClient.objectLocalization({
      image: { content: imageBuffer },
    });

    const labels = labelResult.labelAnnotations || [];
    const objects = objectResult.localizedObjectAnnotations || [];

    console.log(`📊 Found ${labels.length} labels and ${objects.length} objects`);

    // Priority 1: Check for specific objects (more accurate)
    if (objects.length > 0) {
      // Filter out generic objects like "Person", "Hand"
      const relevantObjects = objects.filter(obj => {
        const name = obj.name?.toLowerCase() || '';
        return !['person', 'hand', 'arm', 'finger'].includes(name);
      });

      if (relevantObjects.length > 0) {
        const topObject = relevantObjects[0];
        const itemName = topObject.name || 'Unknown item';
        const confidence = topObject.score || 0;
        
        console.log(`✅ Identified object: ${itemName} (${(confidence * 100).toFixed(1)}%)`);
        return {
          item: itemName,
          confidence,
        };
      }
    }

    // Priority 2: Use labels (less specific but still useful)
    if (labels.length > 0) {
      // Filter out generic labels
      const relevantLabels = labels.filter(label => {
        const desc = label.description?.toLowerCase() || '';
        return !['person', 'hand', 'arm', 'finger', 'gesture', 'thumb'].includes(desc);
      });

      if (relevantLabels.length > 0) {
        const topLabel = relevantLabels[0];
        const itemName = topLabel.description || 'Unknown item';
        const confidence = topLabel.score || 0;
        
        console.log(`✅ Identified from label: ${itemName} (${(confidence * 100).toFixed(1)}%)`);
        return {
          item: itemName,
          confidence,
        };
      }
    }

    // Fallback: No specific item identified
    console.warn('⚠️ No specific item identified');
    return {
      item: 'Unknown item',
      confidence: 0.5,
    };

  } catch (error: any) {
    console.error('❌ Error identifying item:', error);
    throw new Error(`Item identification failed: ${error.message}`);
  }
}

/**
 * Delete temporary frame file
 * @param framePath - Path to frame file
 */
export async function deleteFrame(framePath: string): Promise<void> {
  try {
    await fs.unlink(framePath);
    console.log(`🗑️ Deleted frame: ${framePath}`);
  } catch (error) {
    console.warn(`⚠️ Could not delete frame: ${framePath}`, error);
  }
}

