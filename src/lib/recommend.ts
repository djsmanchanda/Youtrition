// src/lib/recommend.ts
import type { Ingredient } from "@prisma/client";

/**
 * Returns 0‑100 (percentage of recipe ingredients already in the pantry)
 */
export function scoreRecipe(
  pantry: string[],           // e.g. ["eggs", "spinach"]
  recipeIngredients: Ingredient[],
) {
  const owned = pantry.map((s) => s.toLowerCase());
  const recipeNames = recipeIngredients.map((ing) => ing.name.toLowerCase());

  const matches = recipeNames.filter((recipeIng) =>
    owned.some((own) => recipeIng.startsWith(own)),
  );

  return (matches.length / recipeNames.length) * 100;
}
