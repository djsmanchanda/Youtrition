// src/lib/getMatchingRecipes.ts (or in an API route)
import { db } from "@/lib/db";
import { scoreRecipe } from "@/lib/recommend";

export async function getMatchingRecipes(userId: number) {
  const pantryItems = await db.ingredient.findMany({
    where: { profileId: userId, recipeId: null },
  });
  const pantryNames = pantryItems.map((i) => i.name);

  const recipes = await db.recipe.findMany({
    include: { ingredients: true },
  });

  return recipes
    .map((r) => ({
      ...r,
      match: scoreRecipe(pantryNames, r.ingredients),
    }))
    .sort((a, b) => b.match - a.match)        // best first
    .slice(0, 10);                            // top 10
}
