/**
 * Item Name Mapping Configuration
 * 
 * Maps voice request item names to inventory item names for stock checking
 * and inventory management integration.
 */

export const ITEM_TO_INVENTORY_MAP: Record<string, string> = {
  // Voice request name -> Inventory name (must match Firebase exactly)
  'chicken': 'Chicken Meals',
  'beef': 'Beef Meals',
  'fish': 'Fish Meals',
  'vegetarian': 'Vegetarian Meals',
  'vegan': 'Vegan Meals',
  'water': 'Water Bottles',
  'coffee': 'Coffee',
  'tea': 'Tea',
  'juice': 'Juice',
  'coke': 'Coke',
  'cola': 'Coke',
  'pepsi': 'Pepsi',
  'sprite': 'Sprite',
  'soft drink': 'Soft Drinks',
  'soda': 'Soft Drinks',
  'wine': 'Wine',
  'beer': 'Beer',
  'blanket': 'Blankets',
  'pillow': 'Pillows',
  'headphones': 'Headphones',
  'headset': 'Headphones',
  'ice cream': 'Ice Cream',
  'towel': 'Towels',
  // Add more mappings as needed
};

/**
 * Maps a task item name to its corresponding inventory item name
 * 
 * @param taskItem - The item name from the voice request/task
 * @returns The corresponding inventory item name, or null if no mapping exists
 */
export function mapTaskItemToInventory(taskItem: string): string | null {
  const normalized = taskItem.toLowerCase().trim();
  return ITEM_TO_INVENTORY_MAP[normalized] || null;
}

