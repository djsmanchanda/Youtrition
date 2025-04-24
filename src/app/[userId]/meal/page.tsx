// src/app/[userId]/meal/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MealClient from "./MealClient";
import { Suspense } from "react";
import { unstable_noStore as noStore } from 'next/cache';

type Props = { params: { userId: string } };

export default async function MealPage({ params }: Props) {
  // Opt out of static rendering and caching to ensure 
  // we always get fresh data and random options
  noStore();
  
  const id = Number(params.userId);
  if (isNaN(id)) return notFound();

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return notFound();

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Wrap in Suspense to manage loading states */}
      <Suspense fallback={<div>Loading meal planner...</div>}>
        {/* Add a key with current timestamp to force re-render on refresh */}
        <MealClient key={Date.now()} profile={profile} />
      </Suspense>
    </main>
  );
}