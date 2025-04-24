// src/app/[userId]/meal/MealClient.tsx
"use client";
import { useEffect, useState } from "react";
import MealPlanner, { ProfileData } from "@/components/MealPlanner";

// Don't memoize since we want to allow re-renders with new random cuisines
export default function MealClient({ profile }: { profile: ProfileData }) {
  // Use state to enforce client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  // This effect runs once after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Don't render on server to avoid hydration mismatch with random values
  if (!isClient) {
    return <div>Loading meal planner...</div>;
  }
  
  return <MealPlanner profile={profile} />;
}