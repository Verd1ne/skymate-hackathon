/**
 * Google Cloud Storage Service
 * Handles video upload and deletion from GCS bucket
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

// Service account credentials from frontend (same as googleVisionService.ts)
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

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: GOOGLE_CREDENTIALS.project_id,
  credentials: {
    client_email: GOOGLE_CREDENTIALS.client_email,
    private_key: GOOGLE_CREDENTIALS.private_key,
  },
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'skymate-video-analysis';

/**
 * Upload video file to Google Cloud Storage
 * @param localFilePath - Path to local video file
 * @param destinationFilename - Filename in GCS bucket
 * @returns GCS URI (gs://bucket-name/filename)
 */
export async function uploadVideoToGCS(
  localFilePath: string,
  destinationFilename: string
): Promise<string> {
  try {
    console.log(`📤 Uploading video to GCS: ${destinationFilename}`);
    
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(destinationFilename);

    // Upload file
    await bucket.upload(localFilePath, {
      destination: destinationFilename,
      metadata: {
        contentType: 'video/webm', // Default, will be overridden if different
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'skymate-video-intelligence',
        },
      },
    });

    console.log(`✅ Video uploaded successfully: gs://${BUCKET_NAME}/${destinationFilename}`);
    
    // Return GCS URI
    return `gs://${BUCKET_NAME}/${destinationFilename}`;
  } catch (error: any) {
    console.error('❌ Error uploading video to GCS:', error);
    throw new Error(`Failed to upload video to GCS: ${error.message}`);
  }
}

/**
 * Delete video file from Google Cloud Storage
 * @param filename - Filename in GCS bucket
 */
export async function deleteVideoFromGCS(filename: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting video from GCS: ${filename}`);
    
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.file(filename).delete();
    
    console.log(`✅ Video deleted successfully: ${filename}`);
  } catch (error: any) {
    // Don't throw error if file doesn't exist
    if (error.code === 404) {
      console.warn(`⚠️ Video not found in GCS: ${filename}`);
      return;
    }
    
    console.error('❌ Error deleting video from GCS:', error);
    throw new Error(`Failed to delete video from GCS: ${error.message}`);
  }
}

/**
 * Delete local video file
 * @param localFilePath - Path to local video file
 */
export async function deleteLocalVideo(localFilePath: string): Promise<void> {
  try {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log(`✅ Local video deleted: ${localFilePath}`);
    }
  } catch (error: any) {
    console.error('❌ Error deleting local video:', error);
    // Don't throw - this is cleanup, not critical
  }
}

/**
 * Check if bucket exists and is accessible
 */
export async function checkBucketAccess(): Promise<boolean> {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.error(`❌ Bucket does not exist: ${BUCKET_NAME}`);
      return false;
    }
    
    console.log(`✅ Bucket accessible: ${BUCKET_NAME}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error checking bucket access:', error);
    return false;
  }
}

