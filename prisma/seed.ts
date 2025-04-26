// prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma";
const db = new PrismaClient();

async function main() {
  // 1 — Clear existing data
  await db.ingredient.deleteMany();
  await db.recipe.deleteMany();
  await db.profile.deleteMany();

  // 2 — Re-insert demo profiles
  const pablo = await db.profile.create({
    data: {
      name: "Pablo",
      persona: "Athlete",
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: ["Mexican", "Italian"],
      workoutFrequency: 5,
      workoutIntensity: 7,
    },
  });

  const divjot = await db.profile.create({
    data: {
      name: "Divjot",
      persona: "Vegetarian",
      dietaryRestrictions: ["vegetarian"],
      allergies: [],
      cuisinePreferences: ["Indian", "Thai"],
      workoutFrequency: 3,
      workoutIntensity: 4,
    },
  });

  console.log(`🌱 Seed created profiles: Pablo (ID ${pablo.id}), Divjot (ID ${divjot.id})`);

  // 3 — Seed demo recipes
  const pabloRecipe = await db.recipe.create({
    data: {
      title: "Protein Smoothie",
      cuisine: "American",
      source: "seed",
      instructions: "Combine all ingredients and blend until smooth.",
      cookTime: 5,
      dietaryInfo: "High protein",
      nutrition: { calories: 350, protein: 25, carbs: 40, fat: 5 },
      favorite: true,
      profile: { connect: { id: pablo.id } },
      ingredients: {
        create: [
          { name: "Banana", quantity: 1, unit: "unit", profile: { connect: { id: pablo.id } } },
          { name: "Protein Powder", quantity: 30, unit: "g", profile: { connect: { id: pablo.id } } },
          { name: "Milk", quantity: 250, unit: "ml", profile: { connect: { id: pablo.id } } },
        ],
      },
    },
  });

  // 3.b — Seed demo recipe for Divjot
  const divjotRecipe = await db.recipe.create({
    data: {
      title: "Thai Green Curry",
      cuisine: "Thai",
      source: "seed",
      instructions: "Heat oil\nAdd curry paste\nAdd coconut milk and vegetables\nSimmer and serve with rice.",
      cookTime: 30,
      dietaryInfo: "Vegetarian",
      nutrition: { calories: 500, protein: 10, carbs: 60, fat: 20 },
      favorite: false,
      profile: { connect: { id: divjot.id } },
      ingredients: {
        create: [
          { name: "Green Curry Paste", quantity: 2, unit: "tbsp", profile: { connect: { id: divjot.id } } },
          { name: "Coconut Milk", quantity: 400, unit: "ml", profile: { connect: { id: divjot.id } } },
          { name: "Vegetables", quantity: 300, unit: "g", profile: { connect: { id: divjot.id } } },
        ],
      },
    },
  });

  console.log(`🌱 Seed created recipes: PabloRecipe (ID ${pabloRecipe.id}), DivjotRecipe (ID ${divjotRecipe.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
