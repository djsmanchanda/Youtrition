// src/app/[userId]/meal/page.tsx

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MealClient from "./MealClient";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { ProfileData as MealClientProfileData } from "@/components/MealPlanner";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    userId: string;
  };
};

export default async function MealPage({ params }: PageProps) {
  noStore();
  console.log("[MealPage] Received params:", params);

  const id = Number(params.userId);

  if (isNaN(id)) {
    console.error("[MealPage] Invalid userId param, not a number:", params.userId);
    return notFound();
  }

  console.log("[MealPage] Attempting to fetch profile for ID:", id);

  const profile = await db.profile.findUnique({
    where: { id: id },
  });

  if (!profile) {
    console.log("[MealPage] Profile not found for ID:", id);
    return notFound();
  }

  console.log("[MealPage] Profile found:", profile.name);

  const profileData: MealClientProfileData = {
    id: profile.id,
    name: profile.name,
    persona: profile.persona || "Regular",
    dietaryRestrictions:
      profile.dietaryRestrictions
        ? typeof profile.dietaryRestrictions === "string"
          ? JSON.parse(profile.dietaryRestrictions)
          : profile.dietaryRestrictions
        : [],
    allergies:
      profile.allergies
        ? typeof profile.allergies === "string"
          ? JSON.parse(profile.allergies)
          : profile.allergies
        : [],
    cuisinePreferences:
      profile.cuisinePreferences
        ? typeof profile.cuisinePreferences === "string"
          ? JSON.parse(profile.cuisinePreferences)
          : profile.cuisinePreferences
        : [],
    workoutFrequency: profile.workoutFrequency ?? undefined,
    workoutIntensity: profile.workoutIntensity ?? undefined,
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6" style={{ backgroundColor: "#eaf1e4", minHeight: "100vh" }}>
      <Suspense fallback={<div>Loading meal planner...</div>}>
        <MealClient profile={profileData} />
      </Suspense>
    </main>
  );
}
