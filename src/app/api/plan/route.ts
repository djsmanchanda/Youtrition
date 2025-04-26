// src/app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiModel } from "@/lib/gemini.server"; // Ensure this path is correct
import { db } from "@/lib/db"; // Ensure this path is correct
import { Prisma, Recipe as PrismaRecipe, Ingredient as PrismaIngredient } from '@/generated/prisma'; // Import Prisma

// --- Data interfaces (keep as they are or as previously refined) ---
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
  id?: number; // Add optional ID field for database results
  title: string;
  cuisine: string;
  instructions: string[] | string; // Allow string for DB format, array for generation
  cookTime?: number; // Keep consistent name from MealPlanner (camelCase)
  cook_time?: number; // Keep snake_case for generation schema/parsing
  dietaryInfo?: string; // Keep consistent name from MealPlanner (camelCase)
  dietary_info?: string; // Keep snake_case for generation schema/parsing
  ingredients: RecipeIngredient[];
  nutrition?: RecipeNutrition | string; // Allow string for DB format
  favorite?: boolean;
}


interface UserProfile {
  id: string | number; // Allow number from DB profile
  name: string;
  persona?: string;
  dietaryRestrictions?: string | string[] | Prisma.JsonValue;
  allergies?: string | string[] | Prisma.JsonValue;
  cuisinePreferences?: string | string[] | Prisma.JsonValue;
  workoutFrequency?: number;
  workoutIntensity?: number;
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
  // Removed time/description to simplify prompt slightly if needed
}

// Type for Prisma Recipe with Ingredients relation
type RecipeWithIngredients = Prisma.RecipeGetPayload<{
  include: { ingredients: true };
}>;

// --- Zod schema for validation (keep as is) ---
const RecipeSchema = z.object({
  title: z.string(),
  cuisine: z.string(),
  instructions: z.array(z.string()),
  cook_time: z.number(),
  dietary_info: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
    })
  ),
  nutrition: z
    .object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })
    .optional(),
});


// --- Main POST Handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // — NEW: Handle favorite action —
    if (body.action === "favorite") {
      const { recipeId, favorite } = body;
      
      if (!recipeId) {
        return NextResponse.json(
          { success: false, error: "Missing recipeId" },
          { status: 400 }
        );
      }

      const recipeIdNum = parseInt(recipeId, 10);
      if (isNaN(recipeIdNum)) {
        return NextResponse.json(
          { success: false, error: "Invalid recipeId" },
          { status: 400 }
        );
      }

      try {
        // Update the recipe's favorite status
        const updatedRecipe = await db.recipe.update({
          where: {
            id: recipeIdNum,
          },
          data: {
            favorite: favorite,
          },
        });

        return NextResponse.json(updatedRecipe);
      } catch (error) {
        console.error("Error updating recipe favorite status:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update recipe favorite status" },
          { status: 500 }
        );
      }
    }

    // — Ingredient substitution branch —
    if (body.action === "substitute") {
        const {
             selectedRecipe,
             substitutions,
             profile,
             plan,
        }: {
            selectedRecipe: RecipeData;
            substitutions: { ingredient: RecipeIngredient; note: string }[];
            profile: UserProfile;
            plan: MealPlan;
        } = body;

        const substitutionGenerationConfig = {
            temperature: 0.35,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
        };

        const originalInstructionsString = typeof selectedRecipe.instructions === 'string'
            ? selectedRecipe.instructions
            : Array.isArray(selectedRecipe.instructions) 
              ? selectedRecipe.instructions.join('\n') 
              : "";

        const prompt = createSubstitutionPrompt(
            { ...selectedRecipe, instructions: originalInstructionsString },
            substitutions,
            profile,
            plan
        );

        const model = getGeminiModel("gemini-2.0-flash-lite-001");
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: substitutionGenerationConfig,
        });

        const responseText = await result.response.text();

        let aiRecipeResult: any;
        try {
            aiRecipeResult = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse substitution response:", e, responseText);
            throw new Error("Failed to get valid recipe update from AI.");
        }

        // Validate AI response structure
        const validatedAiRecipe = RecipeSchema.parse(aiRecipeResult);

        // Construct the RecipeData to send back to client
        const recipeForClient: RecipeData = {
             id: selectedRecipe.id,
             title: validatedAiRecipe.title,
             cuisine: validatedAiRecipe.cuisine,
             instructions: validatedAiRecipe.instructions.join('\n'),
             cookTime: validatedAiRecipe.cook_time,
             dietaryInfo: validatedAiRecipe.dietary_info,
             ingredients: validatedAiRecipe.ingredients,
             nutrition: validatedAiRecipe.nutrition,
             favorite: selectedRecipe.favorite
        };
      
        return NextResponse.json({ 
            success: true, 
            result: recipeForClient,
            substitutionInfo: substitutions
                .map((s) => `Substituted ${s.ingredient.name}`)
                .join(", "),
        });
    }

    // — Recipe selection branch —
    if (body.action === "select") {
        const recipeIdNum = parseInt(body.recipeId, 10);
        if (isNaN(recipeIdNum)) {
          return NextResponse.json(
            { success: false, error: "Invalid recipeId" },
            { status: 400 }
          );
        }
        const recipe = await db.recipe.findUnique({
          where: { id: recipeIdNum },
          include: { ingredients: true },
        });
        if (!recipe) {
          return NextResponse.json(
            { success: false, error: "Recipe not found" },
            { status: 404 }
          );
        }
        
        // Map DB fields to RecipeData structure
        const resultRecipe: RecipeData = {
          id: recipe.id,
          title: recipe.title,
          cuisine: recipe.cuisine || "",
          instructions: recipe.instructions || "",
          cookTime: recipe.cookTime || undefined,
          dietaryInfo: recipe.dietaryInfo || undefined,
          ingredients: recipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity || undefined,
            unit: ing.unit || undefined
          })),
          nutrition: recipe.nutrition 
            ? JSON.parse(JSON.stringify(recipe.nutrition)) 
            : undefined,
          favorite: recipe.favorite
        };
        
        return NextResponse.json({ success: true, result: resultRecipe });
    }

    // — New recipe generation branch —
    const { profile, plan }: { profile: UserProfile; plan: MealPlan } = body;

    if (!process.env.GOOGLE_API_KEY) {
      console.warn("GOOGLE_API_KEY missing, generating mock recipes.");
      return generateMockRecipes(profile, plan);
    }

    // --- Generate Recipes ---
    const recipes = await generateRecipes(profile, plan);
        
    // --- Save Recipes to DB ---
    const saved = await Promise.all(
      recipes.map((r) => createRecipeInDb(r, profile.id))
    );

    // Map DB results back to RecipeData structure for consistency
    const resultsForClient: RecipeData[] = saved.map(dbRecipe => ({
        id: dbRecipe.id,
        title: dbRecipe.title,
        cuisine: dbRecipe.cuisine || "",
        instructions: dbRecipe.instructions || "",
        cookTime: dbRecipe.cookTime || undefined,
        dietaryInfo: dbRecipe.dietaryInfo || undefined,
        ingredients: dbRecipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity || undefined,
            unit: ing.unit || undefined
        })),
        nutrition: dbRecipe.nutrition 
            ? JSON.parse(JSON.stringify(dbRecipe.nutrition)) 
            : undefined,
        favorite: dbRecipe.favorite
    }));

    return NextResponse.json({ success: true, results: resultsForClient });

  } catch (err: any) {
    console.error("API error in /api/plan:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error occurred during recipe planning.",
        // Stack trace only in development
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// — Helper: build the substitution prompt —
function createSubstitutionPrompt(
  selectedRecipe: RecipeData,
  substitutions: { ingredient: RecipeIngredient; note: string }[],
  profile: UserProfile,
  plan: MealPlan
): string {
  const dr = Array.isArray(profile.dietaryRestrictions)
    ? profile.dietaryRestrictions.join(", ")
    : profile.dietaryRestrictions || "None";
  const al = Array.isArray(profile.allergies)
    ? profile.allergies.join(", ")
    : profile.allergies || "None";

  const instructionsString = typeof selectedRecipe.instructions === 'string'
      ? selectedRecipe.instructions
      : Array.isArray(selectedRecipe.instructions) 
        ? selectedRecipe.instructions.join('\n') 
        : "";

  return `
You are updating an existing recipe based on substitutions.
Keep the original style and adjust instructions/nutrition minimally but accurately.

USER PROFILE:
- Diet: ${dr}
- Allergies: ${al}
- Meal: ${plan.mealType}, Cuisine: ${plan.cuisine}, Calories: ~${plan.calories}, Macro: ${plan.macroType}

ORIGINAL RECIPE:
- Title: ${selectedRecipe.title}
- Ingredients: ${selectedRecipe.ingredients.map((ing) => ing.name).join(", ")}
- Instructions: ${instructionsString}

SUBSTITUTIONS:
${substitutions
  .map((s) => `- Replace: ${s.ingredient.name} (Note: ${s.note || "none"})`)
  .join("\n")}

REQUIREMENTS:
- Modify only based on requested substitutions.
- Maintain calorie & nutrition targets as close as possible.
- Respond ONLY with valid JSON matching the required format.

RESPONSE FORMAT:
{
  "title": "...",
  "cuisine": "${selectedRecipe.cuisine}",
  "instructions": ["...", "..."],
  "cook_time": number,
  "dietary_info": "...",
  "ingredients": [{ "name":"...", "quantity":number?, "unit":"string?" }, ...],
  "nutrition": { "calories":number, "protein":number, "carbs":number, "fat":number }
}

Update the recipe JSON now.
`;
}

// — Generate three recipe variations —
async function generateRecipes(
  profile: UserProfile,
  plan: MealPlan
): Promise<RecipeData[]> {
  const variations: RecipeVariation[] = [
    { focus: "Quick & Easy" },
    { focus: "Standard Balanced" },
    { focus: "Flavor Focused" },
  ];
  const generationPromises: Promise<RecipeData>[] = [];
  for (const variation of variations) {
    generationPromises.push(generateSingleRecipe(profile, plan, variation));
  }
  const results = await Promise.all(generationPromises);
  return results;
}

async function generateSingleRecipe(
  profile: UserProfile, 
  plan: MealPlan, 
  variation: RecipeVariation
): Promise<RecipeData> {
  const prompt = createPrompt(profile, plan, variation);

  const model = getGeminiModel("gemini-2.0-flash-lite-001");
  
  const generationConfig = {
      temperature: 0.4,
      topP: 0.85,
      topK: 45,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
  };

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
      attempt++;
      try {
          const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: generationConfig,
          });

          const responseText = await result.response.text();
          const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();

          const jsonResult = JSON.parse(cleanedText);
          RecipeSchema.parse(jsonResult);

          const recipeData: RecipeData = {
            ...jsonResult,
            cookTime: jsonResult.cook_time,
            dietaryInfo: jsonResult.dietary_info,
          };
          delete (recipeData as any).cook_time;
          delete (recipeData as any).dietary_info;

          return recipeData;

      } catch (error: any) {
          console.error(`Error generating/parsing recipe for "${variation.focus}", Attempt ${attempt}:`, error.message);
          if (attempt >= maxAttempts) {
              console.error(`Failed to generate valid recipe for "${variation.focus}" after ${maxAttempts} attempts. Falling back to mock.`);
              return createVariationMock(plan, variation);
          }
      }
  }
  return createVariationMock(plan, variation);
}

// — Helper: Create Prompt —
function createPrompt(
  profile: UserProfile, 
  plan: MealPlan, 
  variation: RecipeVariation
): string {
  const dr = Array.isArray(profile.dietaryRestrictions)
    ? profile.dietaryRestrictions.join(", ")
    : profile.dietaryRestrictions || "None";
  const al = Array.isArray(profile.allergies)
    ? profile.allergies.join(", ")
    : profile.allergies || "None";

  const varietyInstruction = `Generate a suitable ${plan.mealType} recipe. Try to provide some variety compared to very basic options.`;

  return `
You are creating a recipe suggestion based on user needs.

USER PROFILE:
- Diet: ${dr}, Allergies: ${al}
- Persona: ${profile.persona || "Regular"}

RECIPE REQUEST:
- Meal: ${plan.mealType}
- Cuisine: ${plan.cuisine} (Strict)
- Calories: ~${plan.calories} kcal
- Macro: ${plan.macroType}
- Focus: "${variation.focus}" ${variation.focus === 'Quick & Easy' ? '(simple, fast)' : variation.focus === 'Flavor Focused' ? '(emphasize taste)' : '(standard approach)'}

${varietyInstruction}

OUTPUT REQUIREMENTS:
- Respond ONLY with valid JSON object matching the schema. No extra text.
- Schema:
{
  "title": "string (Recipe title)",
  "cuisine": "${plan.cuisine}",
  "instructions": ["string", ...],
  "cook_time": number (minutes),
  "dietary_info": "string",
  "ingredients": [{ "name": "string", "quantity": number?, "unit": "string?" }, ...],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
}

Generate the JSON now.
`;
}

// — Mock Recipe Generation —
function createVariationMock(
  plan: MealPlan,
  variation: RecipeVariation
): RecipeData {
  const baseCalories = plan.calories;
  let protein = 25, carbs = 55, fat = 15;

  if (plan.macroType === "Protein-Intensive") {
      protein = Math.max(30, Math.round(baseCalories * 0.3 / 4));
      carbs = Math.max(30, Math.round(baseCalories * 0.4 / 4));
      fat = Math.max(10, Math.round(baseCalories * 0.3 / 9));
  } else if (plan.macroType === "Carb-Intensive") {
      protein = Math.max(15, Math.round(baseCalories * 0.15 / 4));
      carbs = Math.max(50, Math.round(baseCalories * 0.55 / 4));
      fat = Math.max(10, Math.round(baseCalories * 0.3 / 9));
  }
  const adjustedCalories = variation.focus === "Flavor Focused" ? baseCalories + 20 : variation.focus === "Quick & Easy" ? baseCalories - 20 : baseCalories;

  return {
    title: `Mock ${variation.focus} ${plan.cuisine} ${plan.mealType}`,
    cuisine: plan.cuisine,
    instructions: ["Mock Step 1.", "Mock Step 2.", "Mock Step 3."],
    cookTime:
      variation.focus === "Quick & Easy"
        ? 20
        : variation.focus === "Flavor Focused"
        ? 45
        : 35,
    dietaryInfo: `Mock ${plan.macroType}`,
    ingredients: [
      { name: `Mock ${plan.cuisine} Ingredient A`, quantity: 1, unit: "unit" },
      { name: "Mock Ingredient B", quantity: 100, unit: "g" },
    ],
    nutrition: {
      calories: Math.max(200, adjustedCalories),
      protein: protein,
      carbs: carbs,
      fat: fat,
    },
    favorite: false
  };
}

async function generateMockRecipes(
  profile: UserProfile,
  plan: MealPlan
): Promise<NextResponse> {
    const variations: RecipeVariation[] = [
        { focus: "Quick & Easy" },
        { focus: "Standard Balanced" },
        { focus: "Flavor Focused" },
    ];

  const mocks = variations.map(variation => createVariationMock(plan, variation));

  const resultsForClient = mocks.map((mock, index) => ({
      ...mock,
      id: Date.now() + index,
      instructions: typeof mock.instructions === 'string' 
        ? mock.instructions 
        : Array.isArray(mock.instructions) 
          ? mock.instructions.join('\n') 
          : "",
  }));

  return NextResponse.json({
      success: true,
      results: resultsForClient,
      note: "Using mock data - GOOGLE_API_KEY not set."
  });
}

// — Helper: Create Recipe in DB —
async function createRecipeInDb(
  recipeData: RecipeData,
  profileId: string | number,
  source: string = "gemini"
): Promise<RecipeWithIngredients> {
  const numericProfileId = typeof profileId === 'string' ? parseInt(profileId, 10) : profileId;
  if (isNaN(numericProfileId)) {
    throw new Error(`Invalid profileId: ${profileId}`);
  }

  // Convert instructions to string before saving
  const instructionsString = Array.isArray(recipeData.instructions)
      ? recipeData.instructions.join("\n")
      : recipeData.instructions || "";

  // Handle nutrition JSON appropriately
  let nutritionJson: Prisma.InputJsonValue | undefined = undefined;
  if (recipeData.nutrition) {
    if (typeof recipeData.nutrition === 'string') {
      try {
          const parsed = JSON.parse(recipeData.nutrition);
          if (typeof parsed === 'object' && parsed !== null) { 
            nutritionJson = parsed; 
          }
      } catch { /* Use undefined */ }
    } else if (typeof recipeData.nutrition === 'object') {
       nutritionJson = recipeData.nutrition as unknown as Prisma.InputJsonValue;
    }
  }

  return db.recipe.create({
    data: {
      title: recipeData.title,
      cuisine: recipeData.cuisine,
      source,
      instructions: instructionsString,
      cookTime: recipeData.cookTime ?? undefined,
      dietaryInfo: recipeData.dietaryInfo ?? undefined,
      nutrition: nutritionJson,
      favorite: false,
      profile: {
          connect: { id: numericProfileId }
      },
      ingredients: {
        create: recipeData.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? undefined,
          unit: ing.unit ?? undefined,
          profile: {
              connect: { id: numericProfileId }
          }
        })),
      },
    },
    include: { ingredients: true },
  });
}