/**
 * Mock meal ingredient data for in-flight meals
 * Used for "skymate describe [meal]" voice commands
 */

export interface MealIngredients {
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  calories: number;
  dietaryInfo: string[];
}

export const MEAL_INGREDIENTS: Record<string, MealIngredients> = {
  // Chicken meals
  "chicken meal": {
    name: "Grilled Chicken Breast",
    description: "Chicken with butter and vegetables",
    ingredients: [
      "Chicken",
      "Butter",
      "Vegetables"
    ],
    allergens: ["Dairy (butter)"],
    calories: 520,
    dietaryInfo: ["High protein"]
  },
  
  "chicken": {
    name: "Grilled Chicken Breast",
    description: "Chicken with butter and vegetables",
    ingredients: [
      "Chicken",
      "Butter",
      "Vegetables"
    ],
    allergens: ["Dairy (butter)"],
    calories: 520,
    dietaryInfo: ["High protein"]
  },

  // Beef meals
  "beef meal": {
    name: "Braised Beef Tenderloin",
    description: "Beef with butter, onions, and nuts",
    ingredients: [
      "Beef",
      "Butter",
      "Onions",
      "Almonds"
    ],
    allergens: ["Dairy (butter)", "Tree nuts (almonds)"],
    calories: 680,
    dietaryInfo: ["High protein"]
  },

  "beef": {
    name: "Braised Beef Tenderloin",
    description: "Beef with butter, onions, and nuts",
    ingredients: [
      "Beef",
      "Butter",
      "Onions",
      "Almonds"
    ],
    allergens: ["Dairy (butter)", "Tree nuts (almonds)"],
    calories: 680,
    dietaryInfo: ["High protein"]
  },

  // Fish meals
  "fish meal": {
    name: "Pan-Seared Salmon",
    description: "Salmon with butter",
    ingredients: [
      "Salmon",
      "Butter"
    ],
    allergens: ["Fish (salmon)", "Dairy (butter)"],
    calories: 590,
    dietaryInfo: ["High protein"]
  },

  "fish": {
    name: "Pan-Seared Salmon",
    description: "Salmon with butter",
    ingredients: [
      "Salmon",
      "Butter"
    ],
    allergens: ["Fish (salmon)", "Dairy (butter)"],
    calories: 590,
    dietaryInfo: ["High protein"]
  },

  // Vegetarian meals
  "vegetarian meal": {
    name: "Mediterranean Vegetable Lasagna",
    description: "Pasta with cheese and vegetables",
    ingredients: [
      "Pasta",
      "Cheese",
      "Vegetables",
      "Eggs"
    ],
    allergens: ["Dairy (cheese)", "Gluten (pasta)", "Eggs"],
    calories: 540,
    dietaryInfo: ["Vegetarian"]
  },

  "vegetarian": {
    name: "Mediterranean Vegetable Lasagna",
    description: "Pasta with cheese and vegetables",
    ingredients: [
      "Pasta",
      "Cheese",
      "Vegetables",
      "Eggs"
    ],
    allergens: ["Dairy (cheese)", "Gluten (pasta)", "Eggs"],
    calories: 540,
    dietaryInfo: ["Vegetarian"]
  },

  // Vegan meals
  "vegan meal": {
    name: "Thai Vegetable Curry",
    description: "Tofu with coconut and vegetables",
    ingredients: [
      "Tofu",
      "Coconut",
      "Vegetables",
      "Soy sauce"
    ],
    allergens: ["Soy (tofu, soy sauce)", "Tree nuts (coconut)"],
    calories: 480,
    dietaryInfo: ["Vegan"]
  },

  "vegan": {
    name: "Thai Vegetable Curry",
    description: "Tofu with coconut and vegetables",
    ingredients: [
      "Tofu",
      "Coconut",
      "Vegetables",
      "Soy sauce"
    ],
    allergens: ["Soy (tofu, soy sauce)", "Tree nuts (coconut)"],
    calories: 480,
    dietaryInfo: ["Vegan"]
  }
};

/**
 * Get meal ingredients by name (case-insensitive)
 */
export function getMealIngredients(mealName: string): MealIngredients | null {
  const normalized = mealName.toLowerCase().trim();
  return MEAL_INGREDIENTS[normalized] || null;
}

/**
 * Format meal description for TTS
 */
export function formatMealDescription(meal: MealIngredients): string {
  const ingredientsList = meal.ingredients.join(", ");
  const allergensList = meal.allergens.join(", ");
  
  return `${meal.name} contains ${ingredientsList}. Allergens: ${allergensList}`;
}

/**
 * Get all available meal names
 */
export function getAvailableMeals(): string[] {
  return Object.keys(MEAL_INGREDIENTS).filter(key => key.includes("meal"));
}

