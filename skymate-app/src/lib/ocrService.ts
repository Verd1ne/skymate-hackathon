/**
 * Galley Service - Door Number Mapping
 * 
 * NOTE: Door number detection now uses Google Cloud Vision API
 * See: src/lib/googleVisionService.ts
 */

/**
 * Map door number to galley type
 * 
 * @param doorNumber - Door/galley number
 * @returns Galley type
 */
export function mapDoorNumberToGalley(doorNumber: number): { 
  galley: number; 
  name: string 
} {
  // Map door numbers to galley categories
  // 1 = Beverages, 2 = Food, 3 = Towels/Amenities
  if (doorNumber === 1) {
    return { galley: 1, name: 'Beverages' };
  } else if (doorNumber === 2) {
    return { galley: 2, name: 'Food' };
  } else if (doorNumber === 3) {
    return { galley: 3, name: 'Towels & Amenities' };
  } else {
    // Default to food if unknown
    return { galley: 2, name: 'Food' };
  }
}

