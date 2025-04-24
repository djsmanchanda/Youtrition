
// 1. First, let's fix the MealPage component:

// src/app/[userId]/meal/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MealClient from "./MealClient";
import { Suspense } from "react";
import { unstable_noStore as noStore } from 'next/cache';

// Import the ProfileData type from MealClient to ensure type compatibility
import { ProfileData as MealClientProfileData } from "@/components/MealPlanner";

// Local type for database profile data
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

type PageProps = {
  params: { userId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function MealPage({ params }: PageProps) {
  noStore();
  
  const id = Number(params.userId);
  if (isNaN(id)) return notFound();

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return notFound();

  // Transform and parse JSON fields properly
  const profileData: MealClientProfileData = {
    id: profile.id,
    name: profile.name,
    persona: profile.persona || "Regular",
    // Parse JSON fields or provide empty arrays
    dietaryRestrictions: profile.dietaryRestrictions ? 
      (typeof profile.dietaryRestrictions === 'string' 
        ? JSON.parse(profile.dietaryRestrictions) 
        : profile.dietaryRestrictions) || [] : [],
    allergies: profile.allergies ? 
      (typeof profile.allergies === 'string' 
        ? JSON.parse(profile.allergies) 
        : profile.allergies) || [] : [],
    cuisinePreferences: profile.cuisinePreferences ? 
      (typeof profile.cuisinePreferences === 'string' 
        ? JSON.parse(profile.cuisinePreferences) 
        : profile.cuisinePreferences) || [] : [],
    // Convert null to undefined
    workoutFrequency: profile.workoutFrequency ?? undefined,
    workoutIntensity: profile.workoutIntensity ?? undefined
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Suspense fallback={<div>Loading meal planner...</div>}>
        <MealClient key={Date.now()} profile={profileData} />
      </Suspense>
    </main>
  );
}