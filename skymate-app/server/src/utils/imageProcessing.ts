import sharp from 'sharp';

export interface PreprocessedImage {
  data: Float32Array;
  originalWidth: number;
  originalHeight: number;
  modelWidth: number;
  modelHeight: number;
}

/**
 * Preprocess image for YOLOv8 inference
 * Resizes to 640x640, normalizes pixel values to 0-1, and converts to CHW format
 */
export async function preprocessImage(
  imageBuffer: Buffer,
  modelSize: number = 640
): Promise<PreprocessedImage> {
  // Get original image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 640;
  const originalHeight = metadata.height || 640;

  // Resize image to model input size with letterboxing (gray padding)
  const resized = await sharp(imageBuffer)
    .resize(modelSize, modelSize, {
      fit: 'contain',
      background: { r: 114, g: 114, b: 114, alpha: 1 }
    })
    .removeAlpha() // Ensure RGB only
    .raw()
    .toBuffer();

  // Convert to Float32Array and normalize to [0, 1]
  const pixels = new Uint8Array(resized);
  const float32Data = new Float32Array(3 * modelSize * modelSize);

  // Convert from HWC (Height, Width, Channels) to CHW (Channels, Height, Width)
  // and normalize pixels from [0, 255] to [0, 1]
  for (let i = 0; i < pixels.length; i += 3) {
    const pixelIndex = i / 3;
    const y = Math.floor(pixelIndex / modelSize);
    const x = pixelIndex % modelSize;

    // R channel
    float32Data[0 * modelSize * modelSize + y * modelSize + x] = pixels[i] / 255;
    // G channel
    float32Data[1 * modelSize * modelSize + y * modelSize + x] = pixels[i + 1] / 255;
    // B channel
    float32Data[2 * modelSize * modelSize + y * modelSize + x] = pixels[i + 2] / 255;
  }

  return {
    data: float32Data,
    originalWidth,
    originalHeight,
    modelWidth: modelSize,
    modelHeight: modelSize,
  };
}

