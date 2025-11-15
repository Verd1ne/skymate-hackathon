/**
 * YOLOv8 + Tesseract.js OCR Service
 * 
 * Hybrid approach for door number detection:
 * 1. Use YOLOv8 to detect regions of interest (optional)
 * 2. Use Tesseract.js for OCR on the full image or detected regions
 */

import Tesseract from 'tesseract.js';
// import yolov8Service from './yolov8Service'; // TODO: Use for region detection
import { mapDoorNumberToGalley } from './ocrService';

export interface OCRResult {
  text: string;
  doorNumber: number | null;
  confidence: number;
  galley?: number;
  galleryName?: string;
}

let tesseractWorker: Tesseract.Worker | null = null;

/**
 * Initialize Tesseract worker
 */
async function initializeTesseract(): Promise<Tesseract.Worker> {
  if (tesseractWorker) {
    return tesseractWorker;
  }
  
  console.log('🔄 Initializing Tesseract.js...');
  const startTime = Date.now();
  
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`📝 OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });
  
  // Configure for number detection
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });
  
  const loadTime = Date.now() - startTime;
  console.log(`✅ Tesseract.js initialized in ${loadTime}ms`);
  
  tesseractWorker = worker;
  return worker;
}

/**
 * Detect door number using hybrid YOLOv8 + Tesseract approach
 * 
 * @param imageData - ImageData from canvas
 * @returns OCR result with door number and galley information
 */
export async function detectDoorNumber(
  imageData: ImageData
): Promise<OCRResult> {
  try {
    console.log('🚪 Starting door number detection...');
    const startTime = Date.now();
    
    // Initialize Tesseract if not already done
    const worker = await initializeTesseract();
    
    // Convert ImageData to canvas for Tesseract
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    // Enhance image for better OCR
    // Increase contrast and brightness
    const imageDataEnhanced = ctx.getImageData(0, 0, canvas.width, canvas.height);
    enhanceImageForOCR(imageDataEnhanced);
    ctx.putImageData(imageDataEnhanced, 0, 0);
    
    // Run OCR
    console.log('📝 Running OCR...');
    const { data } = await worker.recognize(canvas);
    
    const ocrTime = Date.now() - startTime;
    console.log(`✅ OCR complete in ${ocrTime}ms`);
    console.log(`📄 Detected text: "${data.text}"`);
    console.log(`🎯 Confidence: ${(data.confidence || 0).toFixed(1)}%`);
    
    // Extract door number from text
    const text = data.text.trim();
    const numbers = text.match(/\d+/g);
    
    let doorNumber: number | null = null;
    if (numbers && numbers.length > 0) {
      // Take the first number found
      doorNumber = parseInt(numbers[0], 10);
      console.log(`🔢 Extracted door number: ${doorNumber}`);
    } else {
      console.warn('⚠️ No door number found in text');
    }
    
    // Map to galley
    let galley: number | undefined;
    let galleryName: string | undefined;
    if (doorNumber !== null) {
      const galleyInfo = mapDoorNumberToGalley(doorNumber);
      galley = galleyInfo.galley;
      galleryName = galleyInfo.name;
      console.log(`📦 Mapped to galley ${galley}: ${galleryName}`);
    }
    
    return {
      text,
      doorNumber,
      confidence: (data.confidence || 0) / 100, // Convert to 0-1 scale
      galley,
      galleryName,
    };
    
  } catch (error: any) {
    console.error('❌ Door number detection error:', error);
    return {
      text: '',
      doorNumber: null,
      confidence: 0,
    };
  }
}

/**
 * Enhance image for better OCR results
 * Increases contrast and sharpness
 */
function enhanceImageForOCR(imageData: ImageData): void {
  const data = imageData.data;
  const contrast = 1.5;
  const brightness = 20;
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness to RGB channels
    data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness)); // R
    data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // G
    data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // B
    // Alpha channel unchanged
  }
}

/**
 * Detect door number using YOLOv8 to find text regions first, then OCR
 * (More advanced approach - can be used if simple OCR fails)
 */
export async function detectDoorNumberWithYolo(
  imageData: ImageData
): Promise<OCRResult> {
  try {
    console.log('🚪🤖 Starting YOLOv8-assisted door number detection...');
    
    // Step 1: Use YOLOv8 to detect potential text/number regions
    // TODO: Use yoloResult to crop to detected text regions for better accuracy
    // const yoloResult = await yolov8Service.detectObjects(imageData, 0.3, 0.45);
    
    // For now, we'll just run OCR on the full image
    // In a more advanced implementation, we could crop to detected regions
    return await detectDoorNumber(imageData);
    
  } catch (error: any) {
    console.error('❌ YOLOv8-assisted detection error:', error);
    // Fallback to simple OCR
    return await detectDoorNumber(imageData);
  }
}

/**
 * Cleanup Tesseract worker
 */
export async function disposeTesseract(): Promise<void> {
  if (tesseractWorker) {
    console.log('🗑️ Disposing Tesseract worker...');
    await tesseractWorker.terminate();
    tesseractWorker = null;
    console.log('✅ Tesseract worker disposed');
  }
}

// Export for compatibility with existing code
export { mapDoorNumberToGalley };

