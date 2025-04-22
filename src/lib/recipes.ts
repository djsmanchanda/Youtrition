// src/lib/recipes.ts
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { scoreRecipe } from "@/lib/recommend";

/* ---------- Filter type exported so callers can reuse ---------- */
export type Filter = {
  diet?: string[];
  allergies?: string[];
};

/* ---------- getFilteredRecipes (already added) ---------- */
export async function getFilteredRecipes(
  _userId: number,                // kept for future per‑user use
  filter: Filter,
) {
  const { diet = [], allergies = [] } = filter;

  const where: Prisma.RecipeWhereInput = {};

  if (diet.length) {
    where.AND = diet.map((d) => ({
      dietaryInfo: { contains: d, mode: "insensitive" },
    }));
  }

  if (allergies.length) {
    where.NOT = allergies.map((a) => ({
      ingredients: {
        some: { name: { contains: a.toLowerCase(), mode: "insensitive" } },
      },
    }));
  }

  return db.recipe.findMany({
    where,
    include: { ingredients: true },
    take: 50,
  });
}

/* ---------- NEW: recommendRecipes ---------- */
export async function recommendRecipes(
  userId: number,
  filter: Filter,
) {
  // 1. pantry names
  const pantry = await db.ingredient.findMany({
    where: { profileId: userId, recipeId: null },
  });
  const pantryNames = pantry.map((i) => i.name);

  // 2. filtered recipes
  const filtered = await getFilteredRecipes(userId, filter);

  // 3. score & sort
  return filtered
    .map((r) => ({
      ...r,
      match: scoreRecipe(pantryNames, r.ingredients),
    }))
    .sort((a, b) => b.match - a.match);
}
