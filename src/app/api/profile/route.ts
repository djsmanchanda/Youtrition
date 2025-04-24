//src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const {
    id,
    name,
    persona,
    dietaryRestrictions,
    allergies,
    cuisinePreferences,
    workoutFrequency,
    workoutIntensity,
  } = await req.json();

  await db.profile.create({
    data: {
      id,
      name,
      persona,
      dietaryRestrictions,
      allergies,
      cuisinePreferences,
      workoutFrequency,
      workoutIntensity,
    },
  });

  return NextResponse.json({ ok: true });
}
