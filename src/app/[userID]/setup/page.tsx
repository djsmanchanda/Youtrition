"use client";  // MUST be first

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SetupPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  // State hooks
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [dietaryStr, setDietaryStr] = useState("");
  const [allergiesStr, setAllergiesStr] = useState("");
  const [cuisineStr, setCuisineStr] = useState("");
  const [frequency, setFrequency] = useState(5);
  const [intensity, setIntensity] = useState(5);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Submitting form for userId=", userId);

    const dietary = dietaryStr.split(",").map((s) => s.trim()).filter(Boolean);
    const allergies = allergiesStr.split(",").map((s) => s.trim()).filter(Boolean);
    const cuisines = cuisineStr.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(userId),
          name,
          persona,
          dietaryRestrictions: dietary,
          allergies,
          cuisinePreferences: cuisines,
          workoutFrequency: frequency,
          workoutIntensity: intensity,
        }),
      });
      console.log("API response:", res.status, await res.text());

      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }

      router.push(`/${userId}`);
    } catch (err: any) {
      console.error("Fetch failed:", err);
      setError(err.message ?? "Unknown error");
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create your profile</h1>
      {error && <p className="text-red-500">Error: {error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="input w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select
          className="select w-full"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          required
        >
          <option value="" disabled>Select persona</option>
          <option value="Athlete">Athlete</option>
          <option value="Vegetarian">Vegetarian</option>
        </select>

        <input
          className="input w-full"
          placeholder="Dietary restrictions (comma separated)"
          value={dietaryStr}
          onChange={(e) => setDietaryStr(e.target.value)}
        />
        <input
          className="input w-full"
          placeholder="Allergies (comma separated)"
          value={allergiesStr}
          onChange={(e) => setAllergiesStr(e.target.value)}
        />
        <input
          className="input w-full"
          placeholder="Cuisine preferences (comma separated)"
          value={cuisineStr}
          onChange={(e) => setCuisineStr(e.target.value)}
        />

        <div>
          <label className="block text-sm">Workout frequency (1‑10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-center">{frequency}</div>
        </div>

        <div>
          <label className="block text-sm">Workout intensity (1‑10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-center">{intensity}</div>
        </div>

        <button type="submit" className="btn w-full">
          Create profile
        </button>
      </form>
    </main>
  );
}
