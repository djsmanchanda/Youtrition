// src/app/[userId]/meal/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MealClient from "./MealClient";
import { Suspense } from "react";
import { unstable_noStore as noStore } from 'next/cache';

// Import the ProfileData type from MealClient to ensure type compatibility
// If MealClient is in a different location, adjust the import path accordingly
import { ProfileData as MealClientProfileData } from "@/components/MealPlanner";

// You can keep a local type for transforming database data if needed
type DbProfileData = {
  id: number;
  name: string;
  persona: string | null;
  dietaryRestrictions: any;
  allergies: any;
  cuisinePreferences: any;
  workoutFrequency: number | null;
  workoutIntensity: number | null;
  createdAt: Date;
};

type Props = { params: { userId: string } };

export default async function MealPage({ params }: Props) {
  // Opt out of static rendering and caching to ensure 
  // we always get fresh data and random options
  noStore();
  
  const id = Number(params.userId);
  if (isNaN(id)) return notFound();

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return notFound();

  // Transform the profile data to match what MealClient expects
  // Converting null values to undefined where needed
  const profileData: MealClientProfileData = {
    ...profile,
    persona: profile.persona || "Regular", // Provide a default value if null
    // Convert null to undefined for these properties
    workoutFrequency: profile.workoutFrequency ?? undefined,
    workoutIntensity: profile.workoutIntensity ?? undefined
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Wrap in Suspense to manage loading states */}
      <Suspense fallback={<div>Loading meal planner...</div>}>
        {/* Add a key with current timestamp to force re-render on refresh */}
        <MealClient key={Date.now()} profile={profileData} />
      </Suspense>
    </main>
  );
}