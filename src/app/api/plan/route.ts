// src/app/api/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiModel } from "@/lib/gemini.server"; // Ensure this path is correct
import { db } from "@/lib/db"; // Ensure this path is correct
import { Prisma, Recipe as PrismaRecipe, Ingredient as PrismaIngredient } from '@/generated/prisma'; // Import Prisma

// --- Data interfaces (Mostly unchanged, ensure consistency) ---
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
  goals?: string[] | Prisma.JsonValue;
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
  cook_time: z.number().optional(), // Make optional as sometimes AI might omit
  dietary_info: z.string().optional(), // Make optional
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
    .optional(), // Keep optional
});


// --- Main POST Handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // Get action type

    // --- Favorite Action ---
    if (action === "favorite") {
      const { recipeId, favorite } = body;

      if (recipeId === undefined || favorite === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing recipeId or favorite status" },
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
        const updatedRecipe = await db.recipe.update({
          where: { id: recipeIdNum },
          data: { favorite: !!favorite }, // Ensure boolean
        });

        // Map DB fields back to RecipeData before sending
        const resultRecipe: RecipeData = {
            id: updatedRecipe.id,
            title: updatedRecipe.title,
            cuisine: updatedRecipe.cuisine || "",
            instructions: updatedRecipe.instructions || "", // Keep as string from DB
            cookTime: updatedRecipe.cookTime || undefined,
            dietaryInfo: updatedRecipe.dietaryInfo || undefined,
            // Fetch ingredients separately if needed or include them in the update return
            ingredients: [], // Placeholder - Ideally, fetch ingredients if needed
            nutrition: updatedRecipe.nutrition
              ? JSON.parse(JSON.stringify(updatedRecipe.nutrition))
              : undefined,
            favorite: updatedRecipe.favorite
        };

        // Fetch ingredients separately as update doesn't return relations by default
        const ingredients = await db.ingredient.findMany({
            where: { recipeId: updatedRecipe.id },
        });
        resultRecipe.ingredients = ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity ?? undefined,
            unit: ing.unit ?? undefined
        }));


        return NextResponse.json({ success: true, result: resultRecipe }); // Return the updated recipe data
      } catch (error) {
        console.error("Error updating recipe favorite status:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update recipe favorite status" },
          { status: 500 }
        );
      }
    }

    // --- Ingredient Substitution Action ---
    if (action === "substitute") {
        const {
             selectedRecipe,
             substitutions, // Expecting: { ingredientToReplace: RecipeIngredient; note: string }[]
             profile,
             plan,
        }: {
            selectedRecipe: RecipeData;
            substitutions: { ingredientToReplace: RecipeIngredient; note: string }[];
            profile: UserProfile;
            plan: MealPlan;
        } = body;

        // Basic validation
        if (!selectedRecipe || !substitutions || !profile || !plan || substitutions.length === 0) {
             return NextResponse.json({ success: false, error: "Missing data for substitution." }, { status: 400 });
        }

        const substitutionGenerationConfig = {
            temperature: 0.35, // Slightly lower for more deterministic changes
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
        };

        // Ensure instructions are a single string for the prompt
        const originalInstructionsString = typeof selectedRecipe.instructions === 'string'
            ? selectedRecipe.instructions
            : Array.isArray(selectedRecipe.instructions)
              ? selectedRecipe.instructions.join('\n')
              : "";

        const prompt = createSubstitutionPrompt(
            { ...selectedRecipe, instructions: originalInstructionsString }, // Pass instructions as string
            substitutions,
            profile,
            plan
        );

        console.log("--- Substitution Prompt ---");
        console.log(prompt);
        console.log("---------------------------");

        const model = getGeminiModel("gemini-2.0-flash-lite-001"); // Use a capable model
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: substitutionGenerationConfig,
        });

        const responseText = await result.response.text();
        const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim(); // Clean markdown ```json

        let aiRecipeResult: any;
        try {
            aiRecipeResult = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse substitution response:", e, responseText);
            return NextResponse.json({ success: false, error: "Failed to parse AI response for substitution." }, { status: 500 });
        }

        // Validate AI response structure
        const validatedAiRecipe = RecipeSchema.parse(aiRecipeResult);

        // Construct the RecipeData to send back to client
        const recipeForClient: RecipeData = {
             id: selectedRecipe.id, // Keep original ID
             title: validatedAiRecipe.title,
             cuisine: validatedAiRecipe.cuisine,
             instructions: Array.isArray(validatedAiRecipe.instructions) ? validatedAiRecipe.instructions.join('\n') : "", // Convert back to string
             cookTime: validatedAiRecipe.cook_time,
             dietaryInfo: validatedAiRecipe.dietary_info,
             ingredients: validatedAiRecipe.ingredients,
             nutrition: validatedAiRecipe.nutrition,
             favorite: selectedRecipe.favorite // Keep original favorite status
        };

        const subInfo = substitutions.map(s => `Substituted ${s.ingredientToReplace.name}`).join(", ");
        console.log("Substitution successful:", subInfo);

        return NextResponse.json({
            success: true,
            result: recipeForClient,
            substitutionInfo: subInfo,
        });
    }

    // --- NEW: Ingredient Removal Action ---
    if (action === "remove") {
        const {
             selectedRecipe,
             ingredientToRemove,
             profile,
             plan,
        }: {
            selectedRecipe: RecipeData;
            ingredientToRemove: RecipeIngredient;
            profile: UserProfile;
            plan: MealPlan;
        } = body;

        // Basic validation
        if (!selectedRecipe || !ingredientToRemove || !profile || !plan) {
             return NextResponse.json({ success: false, error: "Missing data for ingredient removal." }, { status: 400 });
        }

        const removalGenerationConfig = {
            temperature: 0.35, // Keep it focused
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
        };

        // Ensure instructions are a single string for the prompt
        const originalInstructionsString = typeof selectedRecipe.instructions === 'string'
            ? selectedRecipe.instructions
            : Array.isArray(selectedRecipe.instructions)
              ? selectedRecipe.instructions.join('\n')
              : "";

        const prompt = createRemovalPrompt(
            { ...selectedRecipe, instructions: originalInstructionsString }, // Pass instructions as string
            ingredientToRemove,
            profile,
            plan
        );

        console.log("--- Removal Prompt ---");
        console.log(prompt);
        console.log("----------------------");

        const model = getGeminiModel("gemini-2.0-flash-lite-001"); // Use a capable model
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: removalGenerationConfig,
        });

        const responseText = await result.response.text();
        const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim(); // Clean markdown ```json

        let aiRecipeResult: any;
        try {
            aiRecipeResult = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse removal response:", e, responseText);
            return NextResponse.json({ success: false, error: "Failed to parse AI response for removal." }, { status: 500 });
        }

        // Validate AI response structure
        const validatedAiRecipe = RecipeSchema.parse(aiRecipeResult);

        // Construct the RecipeData to send back to client
        const recipeForClient: RecipeData = {
             id: selectedRecipe.id, // Keep original ID
             title: validatedAiRecipe.title, // AI might slightly adjust title (e.g., "Chicken Stir-fry without Peanuts")
             cuisine: validatedAiRecipe.cuisine,
             instructions: Array.isArray(validatedAiRecipe.instructions) ? validatedAiRecipe.instructions.join('\n') : "", // Convert back to string
             cookTime: validatedAiRecipe.cook_time,
             dietaryInfo: validatedAiRecipe.dietary_info,
             ingredients: validatedAiRecipe.ingredients, // Should not contain the removed one
             nutrition: validatedAiRecipe.nutrition,
             favorite: selectedRecipe.favorite // Keep original favorite status
        };

        // Verify removal (optional but good sanity check)
        const removedIngredientFound = recipeForClient.ingredients.some(
            (ing) => ing.name.toLowerCase() === ingredientToRemove.name.toLowerCase()
        );
        if (removedIngredientFound) {
             console.warn(`AI failed to remove ${ingredientToRemove.name} completely from ingredients list.`);
             // Decide if you want to return an error or the potentially incorrect recipe
        }

        const removalInfo = `Removed ${ingredientToRemove.name}`;
        console.log("Removal successful:", removalInfo);

        return NextResponse.json({
            success: true,
            result: recipeForClient,
            removalInfo: removalInfo,
        });
    }

    // --- Recipe Selection Action ---
    if (action === "select") {
        const recipeId = body.recipeId;
        if (recipeId === undefined) {
             return NextResponse.json({ success: false, error: "Missing recipeId" }, { status: 400 });
        }
        const recipeIdNum = parseInt(recipeId, 10);
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
          instructions: recipe.instructions || "", // Keep as string from DB
          cookTime: recipe.cookTime || undefined,
          dietaryInfo: recipe.dietaryInfo || undefined,
          ingredients: recipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity ?? undefined, // Use nullish coalescing
            unit: ing.unit ?? undefined
          })),
          nutrition: recipe.nutrition
            ? JSON.parse(JSON.stringify(recipe.nutrition)) // Ensure deep copy if needed
            : undefined,
          favorite: recipe.favorite ?? false // Default to false if null
        };

        return NextResponse.json({ success: true, result: resultRecipe });
    }

    // --- Default: New Recipe Generation ---
    // This part assumes if no specific action is provided, it's a request for new recipes.
    // You might want to make this explicit with `action === "generate"`
    if (!action || action === "generate") {
        const { profile, plan }: { profile: UserProfile; plan: MealPlan } = body;

        if (!profile || !plan) {
             return NextResponse.json({ success: false, error: "Missing profile or plan for generation." }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
          console.warn("GOOGLE_API_KEY missing, generating mock recipes.");
          return generateMockRecipes(profile, plan);
        }

        // Generate Recipes
        const recipes = await generateRecipes(profile, plan); // Returns RecipeData[]

        // Save Recipes to DB
        const saved = await Promise.all(
          recipes.map((r) => createRecipeInDb(r, profile.id)) // createRecipeInDb expects RecipeData
        );

        // Map DB results back to RecipeData structure for consistency
        const resultsForClient: RecipeData[] = saved.map(dbRecipe => ({
            id: dbRecipe.id,
            title: dbRecipe.title,
            cuisine: dbRecipe.cuisine || "",
            instructions: dbRecipe.instructions || "", // Keep as string from DB
            cookTime: dbRecipe.cookTime || undefined,
            dietaryInfo: dbRecipe.dietaryInfo || undefined,
            ingredients: dbRecipe.ingredients.map(ing => ({
                name: ing.name,
                quantity: ing.quantity ?? undefined,
                unit: ing.unit ?? undefined
            })),
            nutrition: dbRecipe.nutrition
                ? JSON.parse(JSON.stringify(dbRecipe.nutrition))
                : undefined,
            favorite: dbRecipe.favorite ?? false
        }));

        return NextResponse.json({ success: true, results: resultsForClient });
    }

    // --- Fallback for unknown actions ---
    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });


  } catch (err: any) {
    console.error("API error in /api/plan:", err);
    // Improved error reporting for Zod errors
    if (err instanceof z.ZodError) {
         return NextResponse.json(
            {
                success: false,
                error: "Validation failed for AI response.",
                details: err.format(),
            },
            { status: 400 }
         );
    }
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error occurred during recipe processing.",
        // Stack trace only in development
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// --- Helper: Build the SUBSTITUTION prompt (Revised) ---
function createSubstitutionPrompt(
  selectedRecipe: RecipeData, // Expect instructions as string here
  substitutions: { ingredientToReplace: RecipeIngredient; note: string }[],
  profile: UserProfile,
  plan: MealPlan
): string {
  const dr = Array.isArray(profile.dietaryRestrictions)
    ? profile.dietaryRestrictions.join(", ")
    : profile.dietaryRestrictions?.toString() || "None"; // Handle potential non-array Prisma.JsonValue
  const al = Array.isArray(profile.allergies)
    ? profile.allergies.join(", ")
    : profile.allergies?.toString() || "None";

  const subRequests = substitutions
      .map((s) => `- MUST REPLACE: '${s.ingredientToReplace.name}'. Find a suitable alternative. User Note: '${s.note || "Consider profile/recipe context"}'`)
      .join("\n");

  const originalIngredientsList = selectedRecipe.ingredients
      .map(ing => `${ing.quantity ?? ''} ${ing.unit ?? ''} ${ing.name}`.trim())
      .join(", ");

  // Ensure instructions are a string for the prompt
  const instructionsString = typeof selectedRecipe.instructions === 'string'
      ? selectedRecipe.instructions
      : Array.isArray(selectedRecipe.instructions)
        ? selectedRecipe.instructions.join('\n')
        : "";

  return `You are an expert chef modifying an existing recipe based on specific ingredient substitutions.
You MUST follow the substitution requests precisely.

USER PROFILE:
- Diet: ${dr}
- Allergies: ${al}
- Meal Target: ${plan.mealType}, Cuisine: ${plan.cuisine}, Calories: ~${plan.calories}, Macro Focus: ${plan.macroType}

ORIGINAL RECIPE:
- Title: ${selectedRecipe.title}
- Cuisine: ${selectedRecipe.cuisine}
- Original Ingredients: ${originalIngredientsList}
- Original Instructions:
${instructionsString}

SUBSTITUTION REQUESTS:
${subRequests}

REQUIREMENTS:
1.  **Mandatory Substitution:** You ABSOLUTELY MUST replace the specified ingredient(s) ('${substitutions.map(s => s.ingredientToReplace.name).join("', '")}') with suitable alternatives. The final ingredients list MUST NOT contain the original ingredient(s) being replaced.
2.  **Contextual Replacement:** Choose replacements that fit the recipe's cuisine (${selectedRecipe.cuisine}), the user's profile (diet: ${dr}, allergies: ${al}), and any user notes provided.
3.  **Minimal Impact:** Keep the core character and style of the recipe. Adjust instructions and other ingredients ONLY AS NECESSARY to accommodate the substitution logically (e.g., cooking time changes, liquid adjustments).
4.  **Nutrition:** Recalculate nutrition based on the new ingredients, keeping as close as possible to the original targets (~${plan.calories} kcal, ${plan.macroType}).
5.  **JSON Output ONLY:** Respond ONLY with a valid JSON object matching the specified format. No explanations or other text outside the JSON.

RESPONSE JSON FORMAT:
{
  "title": "string (Adjust title slightly if substitution is significant, e.g., 'Chicken Stir-fry with Almonds')",
  "cuisine": "${selectedRecipe.cuisine}",
  "instructions": ["string (Updated step-by-step instructions)", "..."],
  "cook_time": number (Updated total cook time in minutes, if changed),
  "dietary_info": "string (Updated dietary info based on changes)",
  "ingredients": [{ "name": "string", "quantity": number?, "unit": "string?" }, ...], // MUST reflect the substitutions
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number } // MUST be recalculated
}

Update the recipe JSON now, ensuring the substitutions are made.`;
}


// --- Helper: Build the REMOVAL prompt (NEW) ---
function createRemovalPrompt(
  selectedRecipe: RecipeData, // Expect instructions as string here
  ingredientToRemove: RecipeIngredient,
  profile: UserProfile,
  plan: MealPlan
): string {
  const dr = Array.isArray(profile.dietaryRestrictions)
    ? profile.dietaryRestrictions.join(", ")
    : profile.dietaryRestrictions?.toString() || "None";
  const al = Array.isArray(profile.allergies)
    ? profile.allergies.join(", ")
    : profile.allergies?.toString() || "None";

  const originalIngredientsList = selectedRecipe.ingredients
      .map(ing => `${ing.quantity ?? ''} ${ing.unit ?? ''} ${ing.name}`.trim())
      .join(", ");

  // Ensure instructions are a string for the prompt
  const instructionsString = typeof selectedRecipe.instructions === 'string'
      ? selectedRecipe.instructions
      : Array.isArray(selectedRecipe.instructions)
        ? selectedRecipe.instructions.join('\n')
        : "";

  return `You are an expert chef modifying an existing recipe to remove a specific ingredient.
You MUST follow the removal request precisely.

USER PROFILE:
- Diet: ${dr}
- Allergies: ${al}
- Meal Target: ${plan.mealType}, Cuisine: ${plan.cuisine}, Calories: ~${plan.calories}, Macro Focus: ${plan.macroType}

ORIGINAL RECIPE:
- Title: ${selectedRecipe.title}
- Cuisine: ${selectedRecipe.cuisine}
- Original Ingredients: ${originalIngredientsList}
- Original Instructions:
${instructionsString}

REMOVAL REQUEST:
- **MUST REMOVE:** '${ingredientToRemove.name}'

REQUIREMENTS:
1.  **Mandatory Removal:** You ABSOLUTELY MUST remove the specified ingredient ('${ingredientToRemove.name}') from the recipe. The final ingredients list MUST NOT contain it.
2.  **Recipe Adjustment:** Modify the recipe instructions and potentially other ingredient quantities ONLY AS NECESSARY to logically account for the removal. Maintain the recipe's core character and cuisine (${selectedRecipe.cuisine}) as much as possible. For example, if removing a liquid, consider if less cooking time or a slight increase in another liquid is needed. If removing a core component, the recipe might need significant adjustment or simplification.
3.  **Nutrition:** Recalculate nutrition based on the remaining ingredients, reflecting the removal. The calorie count (~${plan.calories} kcal) and macro focus (${plan.macroType}) should still be targeted but will likely change due to the removal.
4.  **JSON Output ONLY:** Respond ONLY with a valid JSON object matching the specified format. No explanations or other text outside the JSON.

RESPONSE JSON FORMAT:
{
  "title": "string (Adjust title slightly if removal is significant, e.g., 'Vegetable Curry without Coconut Milk')",
  "cuisine": "${selectedRecipe.cuisine}",
  "instructions": ["string (Updated step-by-step instructions reflecting the removal)", "..."],
  "cook_time": number (Updated total cook time in minutes, if changed),
  "dietary_info": "string (Updated dietary info based on changes)",
  "ingredients": [{ "name": "string", "quantity": number?, "unit": "string?" }, ...], // MUST NOT contain the removed ingredient
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number } // MUST be recalculated
}

Update the recipe JSON now, ensuring the ingredient '${ingredientToRemove.name}' is removed and the recipe is adjusted logically.`;
}


// --- Generate Recipe Variations (Unchanged) ---
async function generateRecipes(
  profile: UserProfile,
  plan: MealPlan
): Promise<RecipeData[]> {
  const variations: RecipeVariation[] = [
    { focus: "Quick & Easy" },
    { focus: "Standard Balanced" },
    { focus: "Flavor Focused" },
  ];
  // Use a more capable model for generation too
  const modelName = "gemini-2.0-flash-lite-001";
  const generationPromises: Promise<RecipeData>[] = [];
  for (const variation of variations) {
    generationPromises.push(generateSingleRecipe(profile, plan, variation, modelName));
  }
  const results = await Promise.all(generationPromises);
  return results;
}

// --- Generate Single Recipe (Accept model name) ---
async function generateSingleRecipe(
  profile: UserProfile,
  plan: MealPlan,
  variation: RecipeVariation,
  modelName: string // Added parameter
): Promise<RecipeData> {
  const prompt = createGenerationPrompt(profile, plan, variation); // Changed name for clarity

  const model = getGeminiModel(modelName); // Use specified model

  const generationConfig = {
      temperature: 0.45, // Slightly increased creativity
      topP: 0.9,      // Wider range
      topK: 50,      // Wider range
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
  };

  let attempt = 0;
  const maxAttempts = 3; // Allow one more retry

  while (attempt < maxAttempts) {
      attempt++;
      try {
          console.log(`Generating recipe for: ${variation.focus}, Attempt: ${attempt}`);
          const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: generationConfig,
          });

          const responseText = await result.response.text();
          const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim(); // Clean markdown ```json

          if (!cleanedText) {
              throw new Error("Received empty response from AI.");
          }

          const jsonResult = JSON.parse(cleanedText);
          const validatedResult = RecipeSchema.parse(jsonResult); // Validate structure AND types

          // Map from Zod/AI structure (snake_case) to RecipeData (camelCase where needed)
          const recipeData: RecipeData = {
             id: undefined, // No ID yet
             title: validatedResult.title,
             cuisine: validatedResult.cuisine,
             instructions: validatedResult.instructions, // Keep as array for now, convert before DB save
             cookTime: validatedResult.cook_time, // Use optional field directly
             dietaryInfo: validatedResult.dietary_info, // Use optional field directly
             ingredients: validatedResult.ingredients,
             nutrition: validatedResult.nutrition, // Use optional field directly
             favorite: false, // Default for new recipes
          };
          console.log(`Successfully generated recipe for: ${variation.focus}`);
          return recipeData; // Return RecipeData structure

      } catch (error: any) {
          console.error(`Error generating/parsing recipe for "${variation.focus}", Attempt ${attempt}:`, error.message);
          if (error instanceof z.ZodError) {
              console.error("Zod Validation Errors:", error.format());
          }
           if (error instanceof Error && error.message.includes("SAFETY")) {
              console.error("Generation failed due to safety settings.");
              // Optionally retry with different parameters or handle specifically
           }
          if (attempt >= maxAttempts) {
              console.error(`Failed to generate valid recipe for "${variation.focus}" after ${maxAttempts} attempts. Falling back to mock.`);
              return createVariationMock(plan, variation); // Ensure mock matches RecipeData
          }
          // Optional: Add a small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
      }
  }
  // Should not be reached if maxAttempts > 0, but satisfies TypeScript
  console.error(`Exhausted attempts, returning mock for ${variation.focus}`);
  return createVariationMock(plan, variation);
}

// --- Helper: Create GENERATION Prompt (Renamed) ---
function createGenerationPrompt( // Renamed from createPrompt
  profile: UserProfile,
  plan: MealPlan,
  variation: RecipeVariation
): string {
  const dr = Array.isArray(profile.dietaryRestrictions)
    ? profile.dietaryRestrictions.join(", ")
    : profile.dietaryRestrictions?.toString() || "None";
  const al = Array.isArray(profile.allergies)
    ? profile.allergies.join(", ")
    : profile.allergies?.toString() || "None";
  const gl = Array.isArray(profile.goals)
    ? profile.goals.join(", ")
    : profile.goals?.toString() || "None";


  const varietyInstruction = `Generate a suitable ${plan.mealType} recipe for the specified cuisine. Be creative and provide interesting options, not just the most basic ones.`;
  const focusInstruction = variation.focus === 'Quick & Easy' ? '(Prioritize simplicity and speed, aim for under 30-35 minutes total time)' : variation.focus === 'Flavor Focused' ? '(Emphasize depth of flavor, interesting ingredients, or techniques)' : '(Provide a standard, balanced approach to the recipe)';

  return `You are a creative chef AI generating a single, complete recipe suggestion.

USER PROFILE:
- Dietary Restrictions: ${dr}
- Allergies: ${al}
- Goals: ${gl}
- Persona: ${profile.persona || "Regular Food Enthusiast"}

RECIPE REQUEST:
- Meal Type: ${plan.mealType}
- Cuisine: ${plan.cuisine} (Strictly adhere to this cuisine)
- Target Calories: ~${plan.calories} kcal
- Macro Emphasis: ${plan.macroType}
- Recipe Style Focus: "${variation.focus}" ${focusInstruction}

${varietyInstruction}

OUTPUT REQUIREMENTS:
- Respond ONLY with a valid JSON object matching the schema below.
- Ensure all fields are populated accurately based on the generated recipe.
- Provide realistic ingredient quantities.
- Instructions should be clear, step-by-step.
- Calculate nutrition as accurately as possible.
- Do NOT include any explanatory text, markdown formatting (like \`\`\`json), or anything outside the single JSON object.

JSON SCHEMA:
{
  "title": "string (Creative and descriptive recipe title)",
  "cuisine": "${plan.cuisine}",
  "instructions": ["string (Step 1)", "string (Step 2)", ...],
  "cook_time": number (Estimated total cooking/prep time in minutes),
  "dietary_info": "string (e.g., 'Vegan, Gluten-Free', 'High-Protein')",
  "ingredients": [{ "name": "string", "quantity": number?, "unit": "string?" }, ...],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
}

Generate the recipe JSON now.`;
}

// --- Mock Recipe Generation (Ensure matches RecipeData) ---
function createVariationMock(
  plan: MealPlan,
  variation: RecipeVariation
): RecipeData { // Return type is RecipeData
  const baseCalories = plan.calories || 500; // Default calories
  let protein = 25, carbs = 55, fat = 15; // Default macros

  if (plan.macroType === "Protein-Intensive") {
      protein = Math.round(baseCalories * 0.35 / 4);
      carbs = Math.round(baseCalories * 0.40 / 4);
      fat = Math.round(baseCalories * 0.25 / 9);
  } else if (plan.macroType === "Carb-Intensive") {
      protein = Math.round(baseCalories * 0.15 / 4);
      carbs = Math.round(baseCalories * 0.55 / 4);
      fat = Math.round(baseCalories * 0.30 / 9);
  } else { // Balanced
       protein = Math.round(baseCalories * 0.25 / 4);
       carbs = Math.round(baseCalories * 0.45 / 4);
       fat = Math.round(baseCalories * 0.30 / 9);
  }
  // Ensure minimums
  protein = Math.max(15, protein);
  carbs = Math.max(30, carbs);
  fat = Math.max(10, fat);

  // Recalculate calories based on adjusted macros
  const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  const adjustedCalories = variation.focus === "Flavor Focused" ? calculatedCalories + 30 : variation.focus === "Quick & Easy" ? Math.max(250, calculatedCalories - 30) : calculatedCalories;


  return {
    // id: undefined, // No ID for mocks initially
    title: `Mock ${variation.focus} ${plan.cuisine} ${plan.mealType}`,
    cuisine: plan.cuisine,
    instructions: ["Mock Step 1: Prepare mock ingredients.", "Mock Step 2: Combine mock things.", "Mock Step 3: Cook mock style.", "Mock Step 4: Serve immediately."], // Array of strings
    cookTime:
      variation.focus === "Quick & Easy"
        ? 20
        : variation.focus === "Flavor Focused"
        ? 45
        : 35,
    dietaryInfo: `Mock Dietary Info (${plan.macroType})`,
    ingredients: [
      { name: `Mock ${plan.cuisine} Protein`, quantity: 150, unit: "g" },
      { name: `Mock ${plan.cuisine} Vegetable`, quantity: 1, unit: "cup" },
      { name: "Mock Carb Source", quantity: 100, unit: "g" },
      { name: "Mock Sauce Ingredient", quantity: 2, unit: "tbsp"},
    ],
    nutrition: {
      calories: Math.round(adjustedCalories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    },
    favorite: false
  };
}

// --- Generate Mock Response (Adjusted) ---
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

  // Add temporary IDs and convert instructions to string for client consistency IF NEEDED
  // Usually better to keep instructions as array internally and let client join if needed
  const resultsForClient = mocks.map((mock, index) => ({
      ...mock,
      id: Date.now() + index, // Temporary ID for client-side key prop
      instructions: Array.isArray(mock.instructions) ? mock.instructions.join('\n') : "", // Convert to string for client
  }));

  return NextResponse.json({
      success: true,
      results: resultsForClient,
      note: "Using mock data - GOOGLE_API_KEY not set."
  });
}

// --- Helper: Create Recipe in DB (Revised) ---
async function createRecipeInDb(
  recipeData: RecipeData, // Expect RecipeData structure
  profileId: string | number
): Promise<RecipeWithIngredients> {
  const numericProfileId = typeof profileId === 'string' ? parseInt(profileId, 10) : profileId;
  if (isNaN(numericProfileId)) {
    throw new Error(`Invalid profileId: ${profileId}`);
  }

  // Convert instructions array to string before saving
  const instructionsString = Array.isArray(recipeData.instructions)
      ? recipeData.instructions.join("\n")
      : typeof recipeData.instructions === 'string'
          ? recipeData.instructions
          : ""; // Handle potentially undefined/empty instructions

  // Handle nutrition JSON appropriately
  let nutritionJson: Prisma.InputJsonValue | undefined = undefined;
  if (recipeData.nutrition && typeof recipeData.nutrition === 'object') {
      // Basic check to ensure it's a plain object-like structure
      if (recipeData.nutrition !== null && !Array.isArray(recipeData.nutrition)) {
         // Attempt to ensure it's Prisma-compatible JSON
         try {
            // Convert to string and back to validate/clean (handles potential complex objects)
            const validJson = JSON.parse(JSON.stringify(recipeData.nutrition));
             if (typeof validJson === 'object' && validJson !== null) {
                nutritionJson = validJson as Prisma.InputJsonValue;
             }
         } catch (e) {
             console.error("Failed to stringify/parse nutrition object for DB:", recipeData.nutrition, e);
             // Decide how to handle - save as null/undefined or throw?
             nutritionJson = undefined;
         }
      }
  } else if (typeof recipeData.nutrition === 'string') {
      // If it's already a string, try parsing to ensure it's valid JSON object
      try {
          const parsed = JSON.parse(recipeData.nutrition);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              nutritionJson = parsed as Prisma.InputJsonValue;
          }
      } catch {
           console.warn("Could not parse nutrition string for DB:", recipeData.nutrition);
           nutritionJson = undefined;
      }
  }


  try {
      const createdRecipe = await db.recipe.create({
        data: {
          title: recipeData.title,
          cuisine: recipeData.cuisine,
          source: "gemini", // Or determine dynamically
          instructions: instructionsString,
          // Use nullish coalescing to explicitly pass undefined if null/undefined
          cookTime: recipeData.cookTime ?? undefined,
          dietaryInfo: recipeData.dietaryInfo ?? undefined,
          nutrition: nutritionJson ?? Prisma.DbNull, // Use Prisma.DbNull if undefined/null
          favorite: recipeData.favorite ?? false, // Default favorite to false
          profile: {
              connect: { id: numericProfileId }
          },
          ingredients: {
            create: recipeData.ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity ?? undefined,
              unit: ing.unit ?? undefined,
              // Connect ingredient to profile as well (as per original code)
              profile: {
                  connect: { id: numericProfileId }
              }
            })),
          },
        },
        include: { ingredients: true }, // Include ingredients in the returned object
      });
      return createdRecipe;
  } catch (error) {
       console.error("Error creating recipe in DB:", error);
       // Add more specific error handling if needed (e.g., foreign key constraint)
       throw new Error(`Failed to save recipe "${recipeData.title}" to database.`);
  }
}