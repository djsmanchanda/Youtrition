import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";

const RecipeSchema = z.object({
  title: z.string(),
  cuisine: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  cook_time: z.number(),
  dietary_info: z.string(),
});

export async function POST(req: NextRequest) {
  const { cuisine } = await req.json();      // e.g. "Mexican"

  /** 1 – Ask GPT for a single JSON recipe */
  const gpt = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Return ONE easy, student‑friendly recipe as pure JSON following this exact schema: " +
          RecipeSchema.toString(),
      },
      { role: "user", content: `Cuisine: ${cuisine}` },
    ],
    response_format: { type: "json_object" },
  });

  /** 2 – Validate */
  const parsed = RecipeSchema.parse(JSON.parse(gpt.choices[0].message.content));

  /** 3 – Persist */
  const recipe = await db.recipe.create({
    data: {
      title: parsed.title,
      cuisine: parsed.cuisine,
      source: "gpt",
      instructions: parsed.instructions.join("\n"),
      cookTime: parsed.cook_time,
      dietaryInfo: parsed.dietary_info,
      ingredients: {
        create: parsed.ingredients.map((name) => ({ name })),
      },
    },
    include: { ingredients: true },
  });

  return NextResponse.json(recipe);
}
