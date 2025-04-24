// src/app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiModel } from "@/lib/gemini.server";
import { db } from "@/lib/db";
import fs from 'fs';
import path from 'path';

// Define interfaces for our data structures
interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
}

interface RecipeData {
  title: string;
  cuisine: string;
  instructions: string[];
  cook_time: number;
  dietary_info: string;
  ingredients: RecipeIngredient[];
  nutrition?: RecipeNutrition;
}

interface UserProfile {
  id: string;
  name: string;
  persona?: string;
  dietaryRestrictions?: string | string[];
  allergies?: string | string[];
  workoutFrequency?: number;
}

interface MealPlan {
  mealType: string;
  cuisine: string;
  calories: number;
  macroType: string;
  todayWorkout?: number;
}

interface RecipeVariation {
  focus: string;
  time: string;
}

// Schema for the recipe response from Gemini
const RecipeSchema = z.object({
  title: z.string(),
  cuisine: z.string(),
  instructions: z.array(z.string()),
  cook_time: z.number(),
  dietary_info: z.string(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
  })),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).optional(),
});

// Modified route to handle both generation and selection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if this is a recipe generation or selection request
    if (body.action === 'select') {
      // Handle recipe selection
      const { recipeId } = body;
      // Fetch the selected recipe from the database
      const recipe = await db.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: true }
      });
      
      if (!recipe) {
        return NextResponse.json({ 
          success: false, 
          error: "Recipe not found" 
        }, { status: 404 });
      }
      
      // If needed, you could update the recipe here (mark as selected, etc.)
      
      return NextResponse.json({ 
        success: true, 
        result: recipe
      });
    } else {
      // Handle recipe generation
      const { profile, plan } = body as { profile: UserProfile, plan: MealPlan };
      console.log("Received request:", { profile: { id: profile.id, name: profile.name }, plan });
      
      // Check if Google API key is configured
      if (!process.env.GOOGLE_API_KEY) {
        console.warn("Google API key is missing");
        return generateMockRecipes(profile, plan);
      }
      
      try {
        // Generate multiple recipes
        const recipes = await generateRecipes(profile, plan);
        
        // Save recipes to database
        const savedRecipes = await Promise.all(
          recipes.map(recipe => createRecipeInDb(recipe, profile.id))
        );
        
        return NextResponse.json({ 
          success: true, 
          results: savedRecipes
        });
      } catch (error) {
        console.error("Recipe generation failed:", error);
        // Fall back to mock data if generation fails
        return generateMockRecipes(profile, plan);
      }
    }
  } catch (error: unknown) {
    console.error("API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    const errorName = error instanceof Error ? error.name : "Unknown";
    const errorStack = error instanceof Error && process.env.NODE_ENV === 'development' 
      ? error.stack 
      : undefined;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        errorType: errorName,
        stack: errorStack
      },
      { status: 500 }
    );
  }
}

// Generate three recipes using Gemini
async function generateRecipes(profile: UserProfile, plan: MealPlan): Promise<RecipeData[]> {
  const recipes: RecipeData[] = [];
  const uniqueVariations: RecipeVariation[] = [
    { focus: "Quick & Easy", time: "under 30 minutes" },
    { focus: "Nutritionally Balanced", time: "standard preparation" },
    { focus: "Gourmet", time: "more elaborate" }
  ];
  
  for (let i = 0; i < 3; i++) {
    const variation = uniqueVariations[i];
    const recipe = await generateSingleRecipe(profile, plan, variation);
    recipes.push(recipe);
  }
  
  return recipes;
}

// Generate a single recipe with a specific variation
async function generateSingleRecipe(
  profile: UserProfile, 
  plan: MealPlan, 
  variation: RecipeVariation
): Promise<RecipeData> {
  // Create the prompt with the variation
  const promptText = createPrompt(profile, plan, variation);
  console.log(`Generated prompt for Gemini (${variation.focus})`);
  
  // Enhanced prompt with more explicit JSON formatting instructions
  const enhancedPrompt = `${promptText}
  
IMPORTANT FORMATTING INSTRUCTIONS:
1. Respond ONLY with valid JSON.
2. Do not include any text, explanations, or markdown outside the JSON.
3. Make sure all property names and string values use DOUBLE QUOTES, not single quotes.
4. Do not include any trailing commas in objects or arrays.
5. All numbers should be numeric values without quotes.
6. Do not include undefined, NaN, or Infinity values.
7. Format the JSON as a single compact object without line breaks or extra whitespace.`;
  
  // Initialize the Gemini model
  const model = getGeminiModel("gemini-2.0-flash-lite-001");
  
  // Set Gemini generation parameters for better structured output
  const generationConfig = {
    temperature: 0.3, // Lower temperature for more predictable outputs
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  };
  
  // Call Gemini model with the enhanced prompt and generation config
  console.log(`Calling Gemini API for ${variation.focus} recipe...`);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
    generationConfig,
  });
  
  const response = await result.response;
  const text = response.text();
  console.log(`Gemini API response received for ${variation.focus} recipe`);
  
  // Save the API response to a file in the public folder
  try {
    // Create a timestamp in the format HHMMDDMMYYYY
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}${
      now.getMinutes().toString().padStart(2, '0')}${
      now.getDate().toString().padStart(2, '0')}${
      (now.getMonth() + 1).toString().padStart(2, '0')}${
      now.getFullYear()}`;
    
    // Create the filename
    const filename = `Gemini_${variation.focus.replace(/\s+/g, '')}_${timestamp}.txt`;
    
    // Ensure the public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Create the full file path
    const filePath = path.join(publicDir, filename);
    
    // Prepare the content to save
    const fileContent = `
=== GEMINI API CALL ===
Timestamp: ${now.toISOString()}
Model: gemini-2.0-flash-lite-001
Variation: ${variation.focus} (${variation.time})
Profile: ${profile.name} (ID: ${profile.id})
Plan: ${plan.mealType} - ${plan.cuisine} - ${plan.calories}kcal - ${plan.macroType}

=== PROMPT ===
${enhancedPrompt}

=== RAW RESPONSE ===
${text}
`;
    
    // Write the file
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Gemini API response saved to: ${filePath}`);
  } catch (fileError) {
    console.error("Error saving Gemini response to file:", fileError);
    // Continue execution even if file saving fails
  }
  
  // Parse and validate the response with error handling
  let content: RecipeData;
  try {
    // Print the raw text for debugging
    console.log("Raw Gemini response:", text.substring(0, 150) + "..." + 
               (text.length > 300 ? text.substring(text.length - 150) : ""));
    
    // Clean up the response text to handle common JSON formatting issues
    let cleanedText = text;
    
    // Remove any markdown code block markers
    cleanedText = cleanedText.replace(/```json/g, "").replace(/```/g, "");
    
    // Remove any non-JSON text before the first { and after the last }
    const startBrace = cleanedText.indexOf('{');
    const endBrace = cleanedText.lastIndexOf('}');
    
    if (startBrace >= 0 && endBrace >= 0 && endBrace > startBrace) {
      cleanedText = cleanedText.substring(startBrace, endBrace + 1);
    } else {
      throw new Error("Cannot find valid JSON object markers in response");
    }
    
    // Handle potential trailing commas in objects and arrays (common JSON error)
    cleanedText = cleanedText
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    // Fix potential problems with JSON and double quotes
    cleanedText = cleanedText
      .replace(/(\w+)(?=:)/g, '"$1"')  // Add quotes around keys without quotes
      .replace(/:\s*'([^']*)'/g, ': "$1"');  // Convert single quotes to double quotes
    
    console.log("Cleaned JSON:", cleanedText.substring(0, 100) + "...");
    
    // Now try to parse the cleaned JSON
    content = JSON.parse(cleanedText) as RecipeData;
    console.log("Parsed Gemini response successfully");
  } catch (parseError: unknown) {
    console.error("JSON parse error:", parseError);
    if (parseError instanceof Error) {
      console.error("Error position:", parseError.message);
      
      // More details for debugging
      if (parseError.message.includes("position")) {
        const posMatch = parseError.message.match(/position (\d+)/);
        if (posMatch && posMatch[1]) {
          const pos = parseInt(posMatch[1]);
          const errorContext = text.substring(Math.max(0, pos - 30), Math.min(text.length, pos + 30));
          console.error(`Context around error: "${errorContext}"`);
        }
      }
    }
    
    // Use a variation-specific mock instead of failing
    content = createVariationMock(plan, variation);
  }
  
  // Validate against schema with better error handling
  let parsed: RecipeData;
  try {
    parsed = RecipeSchema.parse(content);
    console.log("Zod validation passed");
  } catch (zodError) {
    console.error("Schema validation error:", zodError);
    
    // Create a fixed version with the variation
    parsed = createVariationMock(plan, variation);
  }
  
  return parsed;
}

// Updated function to create prompt with variations
function createPrompt(
  profile: UserProfile, 
  plan: MealPlan, 
  variation: RecipeVariation
): string {
  // Create structured user profile data
  let dietaryRestrictions = "";
  if (profile.dietaryRestrictions) {
    // Handle SQLite JSON storage (stored as string)
    const restrictions = typeof profile.dietaryRestrictions === 'string' 
      ? JSON.parse(profile.dietaryRestrictions) 
      : profile.dietaryRestrictions;
      
    if (Array.isArray(restrictions) && restrictions.length > 0) {
      dietaryRestrictions = `Dietary Restrictions: ${restrictions.join(", ")}`;
    }
  }
  
  let allergies = "";
  if (profile.allergies) {
    // Handle SQLite JSON storage (stored as string)
    const allergyList = typeof profile.allergies === 'string'
      ? JSON.parse(profile.allergies)
      : profile.allergies;
      
    if (Array.isArray(allergyList) && allergyList.length > 0) {
      allergies = `Allergies: ${allergyList.join(", ")}`;
    }
  }
  
  let workoutDetails = "";
  if (profile.persona === "Athlete") {
    workoutDetails = `
      Workout Frequency: ${profile.workoutFrequency || "N/A"} times per week
      Today's Workout Intensity: ${plan.todayWorkout ?? "N/A"}/10
    `;
  }
  
  // Add the variation-specific request
  const variationRequest = `
RECIPE VARIATION:
- Style: ${variation.focus}
- Preparation Time: ${variation.time}
- Make this recipe ${variation.focus.toLowerCase()} while maintaining the core requirements.
`;
  
  // Create the basic request
  const basicRequest = `
Create a ${plan.mealType} recipe that matches these requirements:

USER PROFILE:
- Name: ${profile.name}
- Persona: ${profile.persona || "Regular"}
- ${dietaryRestrictions}
- ${allergies}
${workoutDetails}

RECIPE REQUIREMENTS:
- Cuisine: ${plan.cuisine}
- Meal Type: ${plan.mealType}
- Target Calories: ${plan.calories} kcal
- Macro Focus: ${plan.macroType}
${variationRequest}

${plan.mealType === "Pre-Workout" ? "This is a pre-workout meal, so optimize for quick energy and proper digestion before exercise." : ""}
  `;

  // Create the JSON instructions part
  const jsonInstructions = `
RESPONSE FORMAT:
You must respond ONLY with a single valid JSON object exactly as shown below:

{
  "title": "Recipe Title",
  "cuisine": "${plan.cuisine}",
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction",
    "Step 3 instruction"
  ],
  "cook_time": 30,
  "dietary_info": "Brief dietary information",
  "ingredients": [
    {
      "name": "Ingredient 1",
      "quantity": 100,
      "unit": "g"
    },
    {
      "name": "Ingredient 2",
      "quantity": 1,
      "unit": "cup"
    }
  ],
  "nutrition": {
    "calories": ${plan.calories},
    "protein": 30,
    "carbs": 40,
    "fat": 15
  }
}

IMPORTANT:
1. Use ONLY double quotes for strings, not single quotes
2. Do not include any text outside the JSON object
3. Make sure all numbers are without quotes
4. Do not include any trailing commas in arrays or objects
5. The JSON must be valid and properly formatted
`;

  return basicRequest + jsonInstructions;
}

// Create mock data with variation
function createVariationMock(plan: MealPlan, variation: RecipeVariation): RecipeData {
  let title: string;
  let cookTime: number;
  let instructions: string[];
  let ingredients: RecipeIngredient[];
  
  // Customize based on variation
  if (variation.focus === "Quick & Easy") {
    title = `Quick ${plan.cuisine} ${plan.mealType}`;
    cookTime = 20;
    instructions = [
      "Prepare all ingredients by chopping into small pieces for quick cooking.",
      "Heat pan over medium-high heat to reduce cooking time.",
      "Cook ingredients in order of longest cooking time first.",
      "Combine and serve immediately."
    ];
    ingredients = [
      { name: "Pre-cut protein", quantity: 100, unit: "g" },
      { name: "Quick-cooking grain", quantity: 100, unit: "g" },
      { name: "Pre-washed vegetables", quantity: 150, unit: "g" },
      { name: "Sauce/seasoning", quantity: 30, unit: "ml" }
    ];
  } else if (variation.focus === "Nutritionally Balanced") {
    title = `Balanced ${plan.cuisine} ${plan.mealType}`;
    cookTime = 35;
    instructions = [
      "Prepare ingredients with focus on preserving nutrients.",
      "Cook protein to appropriate internal temperature.",
      "Steam vegetables to maintain nutritional value.",
      "Combine all components in balanced portions."
    ];
    ingredients = [
      { name: "Lean protein", quantity: 120, unit: "g" },
      { name: "Complex carbohydrates", quantity: 100, unit: "g" },
      { name: "Mixed vegetables", quantity: 200, unit: "g" },
      { name: "Healthy fats", quantity: 15, unit: "g" },
      { name: "Herbs and spices", quantity: 5, unit: "g" }
    ];
  } else {
    title = `Gourmet ${plan.cuisine} ${plan.mealType}`;
    cookTime = 50;
    instructions = [
      "Prepare mise en place with all ingredients properly measured and prepared.",
      "Focus on layering flavors throughout the cooking process.",
      "Use proper cooking techniques to enhance texture and taste.",
      "Plate with attention to presentation and garnish appropriately."
    ];
    ingredients = [
      { name: "Premium protein", quantity: 150, unit: "g" },
      { name: "Specialty grain/starch", quantity: 100, unit: "g" },
      { name: "Seasonal vegetables", quantity: 150, unit: "g" },
      { name: "Gourmet sauce components", quantity: 50, unit: "ml" },
      { name: "Garnishes", quantity: 10, unit: "g" }
    ];
  }
  
  return {
    title,
    cuisine: plan.cuisine,
    instructions,
    cook_time: cookTime,
    dietary_info: `${plan.macroType} meal designed for ${variation.focus.toLowerCase()} preparation`,
    ingredients,
    nutrition: {
      calories: plan.calories,
      protein: plan.macroType === "Protein-Intensive" ? 35 : 20,
      carbs: plan.macroType === "Carb-Intensive" ? 70 : 50,
      fat: 15
    }
  };
}

// Generate mock recipes for testing or when API key is missing
async function generateMockRecipes(profile: UserProfile, plan: MealPlan) {
  const variations: RecipeVariation[] = [
    { focus: "Quick & Easy", time: "under 30 minutes" },
    { focus: "Nutritionally Balanced", time: "standard preparation" },
    { focus: "Gourmet", time: "more elaborate" }
  ];
  
  // Create three different mock recipes
  const mockRecipes = variations.map(variation => createVariationMock(plan, variation));
  
  // Save mock recipes to database
  const savedRecipes = await Promise.all(
    mockRecipes.map(recipe => createRecipeInDb(recipe, profile.id, "mock"))
  );
  
  return NextResponse.json({
    success: true,
    results: savedRecipes,
    note: "Using mock data (GOOGLE_API_KEY not configured or generation failed)"
  });
}

// Save recipe to database
// Save recipe to database
async function createRecipeInDb(
  recipeData: RecipeData, 
  profileId: string, 
  source: string = "gemini"
) {
  // Convert string profileId to number (assuming your Prisma schema uses numeric IDs)
  const numericProfileId = parseInt(profileId, 10);
  
  // Ensure the nutrition object is properly formatted for Prisma JSON field
  const nutritionData = recipeData.nutrition 
    ? { 
        calories: recipeData.nutrition.calories,
        protein: recipeData.nutrition.protein,
        carbs: recipeData.nutrition.carbs,
        fat: recipeData.nutrition.fat
      }
    : undefined; // Use undefined instead of null for Prisma

  return await db.recipe.create({
    data: {
      title: recipeData.title,
      cuisine: recipeData.cuisine,
      source: source,
      instructions: Array.isArray(recipeData.instructions) 
        ? recipeData.instructions.join("\n") 
        : recipeData.instructions,
      cookTime: recipeData.cook_time,
      dietaryInfo: recipeData.dietary_info,
      nutrition: nutritionData, // Use the properly formatted nutrition data
      profileId: numericProfileId, // Use the numeric profile ID
      ingredients: {
        create: recipeData.ingredients.map((ing: RecipeIngredient) => ({
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          // Connect to the profile using the proper Prisma relation syntax
          profile: {
            connect: {
              id: numericProfileId
            }
          }
        })),
      },
    },
    include: { 
      ingredients: true 
    },
  });
}