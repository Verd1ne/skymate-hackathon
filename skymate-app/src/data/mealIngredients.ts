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
    description: "Tender grilled chicken breast with herbs, served with roasted vegetables and rice pilaf",
    ingredients: [
      "Grilled chicken breast (6 oz)",
      "Basmati rice pilaf with herbs",
      "Roasted seasonal vegetables (carrots, zucchini, bell peppers)",
      "Lemon herb butter sauce",
      "Fresh rosemary and thyme",
      "Olive oil",
      "Sea salt and black pepper"
    ],
    allergens: ["Dairy (butter)"],
    calories: 520,
    dietaryInfo: ["High protein", "Gluten-free"]
  },
  
  "chicken": {
    name: "Grilled Chicken Breast",
    description: "Tender grilled chicken breast with herbs, served with roasted vegetables and rice pilaf",
    ingredients: [
      "Grilled chicken breast (6 oz)",
      "Basmati rice pilaf with herbs",
      "Roasted seasonal vegetables (carrots, zucchini, bell peppers)",
      "Lemon herb butter sauce",
      "Fresh rosemary and thyme",
      "Olive oil",
      "Sea salt and black pepper"
    ],
    allergens: ["Dairy (butter)"],
    calories: 520,
    dietaryInfo: ["High protein", "Gluten-free"]
  },

  // Beef meals
  "beef meal": {
    name: "Braised Beef Tenderloin",
    description: "Premium beef tenderloin braised in red wine sauce, served with garlic mashed potatoes and green beans",
    ingredients: [
      "Beef tenderloin (7 oz)",
      "Red wine reduction sauce with shallots",
      "Garlic mashed potatoes with butter and cream",
      "Fresh green beans with almonds",
      "Caramelized onions",
      "Fresh thyme and bay leaves",
      "Extra virgin olive oil",
      "Sea salt and cracked black pepper"
    ],
    allergens: ["Dairy (butter, cream)", "Tree nuts (almonds)", "Sulfites (wine)"],
    calories: 680,
    dietaryInfo: ["High protein", "Contains alcohol (wine sauce)"]
  },

  "beef": {
    name: "Braised Beef Tenderloin",
    description: "Premium beef tenderloin braised in red wine sauce, served with garlic mashed potatoes and green beans",
    ingredients: [
      "Beef tenderloin (7 oz)",
      "Red wine reduction sauce with shallots",
      "Garlic mashed potatoes with butter and cream",
      "Fresh green beans with almonds",
      "Caramelized onions",
      "Fresh thyme and bay leaves",
      "Extra virgin olive oil",
      "Sea salt and cracked black pepper"
    ],
    allergens: ["Dairy (butter, cream)", "Tree nuts (almonds)", "Sulfites (wine)"],
    calories: 680,
    dietaryInfo: ["High protein", "Contains alcohol (wine sauce)"]
  },

  // Fish meals
  "fish meal": {
    name: "Pan-Seared Salmon",
    description: "Atlantic salmon fillet with lemon dill sauce, served with quinoa and asparagus",
    ingredients: [
      "Atlantic salmon fillet (6 oz)",
      "Lemon dill cream sauce",
      "Tri-color quinoa",
      "Grilled asparagus with lemon zest",
      "Fresh dill and parsley",
      "White wine",
      "Butter and cream",
      "Sea salt and white pepper"
    ],
    allergens: ["Fish (salmon)", "Dairy (butter, cream)", "Sulfites (wine)"],
    calories: 590,
    dietaryInfo: ["High in Omega-3", "High protein", "Gluten-free"]
  },

  "fish": {
    name: "Pan-Seared Salmon",
    description: "Atlantic salmon fillet with lemon dill sauce, served with quinoa and asparagus",
    ingredients: [
      "Atlantic salmon fillet (6 oz)",
      "Lemon dill cream sauce",
      "Tri-color quinoa",
      "Grilled asparagus with lemon zest",
      "Fresh dill and parsley",
      "White wine",
      "Butter and cream",
      "Sea salt and white pepper"
    ],
    allergens: ["Fish (salmon)", "Dairy (butter, cream)", "Sulfites (wine)"],
    calories: 590,
    dietaryInfo: ["High in Omega-3", "High protein", "Gluten-free"]
  },

  // Vegetarian meals
  "vegetarian meal": {
    name: "Mediterranean Vegetable Lasagna",
    description: "Layered pasta with roasted vegetables, ricotta, and marinara sauce",
    ingredients: [
      "Fresh lasagna sheets",
      "Ricotta cheese",
      "Mozzarella cheese",
      "Parmesan cheese",
      "Roasted eggplant and zucchini",
      "Spinach and sun-dried tomatoes",
      "House-made marinara sauce",
      "Fresh basil and oregano",
      "Extra virgin olive oil"
    ],
    allergens: ["Dairy (cheese)", "Gluten (pasta)", "Eggs (pasta)"],
    calories: 540,
    dietaryInfo: ["Vegetarian", "High in calcium"]
  },

  "vegetarian": {
    name: "Mediterranean Vegetable Lasagna",
    description: "Layered pasta with roasted vegetables, ricotta, and marinara sauce",
    ingredients: [
      "Fresh lasagna sheets",
      "Ricotta cheese",
      "Mozzarella cheese",
      "Parmesan cheese",
      "Roasted eggplant and zucchini",
      "Spinach and sun-dried tomatoes",
      "House-made marinara sauce",
      "Fresh basil and oregano",
      "Extra virgin olive oil"
    ],
    allergens: ["Dairy (cheese)", "Gluten (pasta)", "Eggs (pasta)"],
    calories: 540,
    dietaryInfo: ["Vegetarian", "High in calcium"]
  },

  // Vegan meals
  "vegan meal": {
    name: "Thai Vegetable Curry",
    description: "Aromatic coconut curry with mixed vegetables and jasmine rice",
    ingredients: [
      "Coconut milk",
      "Red curry paste",
      "Mixed vegetables (bell peppers, broccoli, bamboo shoots, carrots)",
      "Tofu cubes",
      "Jasmine rice",
      "Thai basil",
      "Lime juice",
      "Ginger and garlic",
      "Soy sauce"
    ],
    allergens: ["Soy (tofu, soy sauce)", "Tree nuts (coconut)"],
    calories: 480,
    dietaryInfo: ["Vegan", "Dairy-free", "Gluten-free (with tamari)"]
  },

  "vegan": {
    name: "Thai Vegetable Curry",
    description: "Aromatic coconut curry with mixed vegetables and jasmine rice",
    ingredients: [
      "Coconut milk",
      "Red curry paste",
      "Mixed vegetables (bell peppers, broccoli, bamboo shoots, carrots)",
      "Tofu cubes",
      "Jasmine rice",
      "Thai basil",
      "Lime juice",
      "Ginger and garlic",
      "Soy sauce"
    ],
    allergens: ["Soy (tofu, soy sauce)", "Tree nuts (coconut)"],
    calories: 480,
    dietaryInfo: ["Vegan", "Dairy-free", "Gluten-free (with tamari)"]
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
  const parts = [
    `${meal.name}.`,
    meal.description,
    `This dish contains: ${meal.ingredients.slice(0, 5).join(", ")}`,
  ];

  if (meal.allergens.length > 0) {
    parts.push(`Please note, this contains: ${meal.allergens.join(", ")}`);
  }

  if (meal.dietaryInfo.length > 0) {
    parts.push(`Dietary information: ${meal.dietaryInfo.join(", ")}`);
  }

  parts.push(`Total calories: ${meal.calories}`);

  return parts.join(". ");
}

/**
 * Get all available meal names
 */
export function getAvailableMeals(): string[] {
  return Object.keys(MEAL_INGREDIENTS).filter(key => key.includes("meal"));
}

