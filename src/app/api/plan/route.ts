import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
// import { openai } from "@/lib/openai.server"; // Commented for now

export async function POST(req: NextRequest) {
  try {
    const { profile, plan } = await req.json();
    
    // Use a mock response instead of calling OpenAI
    const mockGptResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Test Recipe",
              cuisine: "Italian",
              instructions: ["Step 1: Boil water", "Step 2: Cook pasta"],
              cook_time: 30,
              dietary_info: "Vegetarian",
              ingredients: [
                { name: "Pasta", quantity: 100, unit: "g" },
                { name: "Tomato sauce", quantity: 50, unit: "ml" }
              ],
              nutrition: {
                calories: 400,
                protein: 10,
                carbs: 70,
                fat: 5
              }
            })
          }
        }
      ]
    };
    
    // Create a recipe with the mock data
    const recipe = await db.recipe.create({
      data: {
        title: "Test Recipe",
        cuisine: "Italian",
        source: "gpt",
        instructions: "Step 1: Boil water\nStep 2: Cook pasta",
        cookTime: 30,
        dietaryInfo: "Vegetarian",
        nutrition: {
          calories: 400,
          protein: 10,
          carbs: 70,
          fat: 5
        },
        profileId: profile.id,
        ingredients: {
          create: [
            {
              name: "Pasta",
              quantity: 100,
              unit: "g",
              profileId: profile.id,
            },
            {
              name: "Tomato sauce",
              quantity: 50,
              unit: "ml",
              profileId: profile.id,
            }
          ],
        },
      },
      include: { 
        ingredients: true 
      },
    });
    
    return NextResponse.json({ success: true, result: recipe });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}