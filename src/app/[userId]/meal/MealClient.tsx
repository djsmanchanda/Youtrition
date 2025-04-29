// src/app/[userId]/meal/MealClient.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MealPlanner, { ProfileData } from "@/components/MealPlanner";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function MealClient({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading meal planner...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/">
          <Button variant="outline" aria-label="Home">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
        <Button
          variant="outline"
          aria-label="Back"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <MealPlanner profile={profile} />
    </div>
  );
}
