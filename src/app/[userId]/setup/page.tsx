"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SetupPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  // Basic info
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");

  // New profile fields
  const [dietaryStr, setDietaryStr] = useState("");
  const [allergiesStr, setAllergiesStr] = useState("");
  const [cuisinesStr, setCuisinesStr] = useState("");
  const [frequency, setFrequency] = useState(5);
  const [intensity, setIntensity] = useState(5);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const dietary = dietaryStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const allergies = allergiesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cuisines = cuisinesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      router.push(`/${userId}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create your profile</h1>
      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <input
          className="input w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Persona */}
        <select
          className="select w-full"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          required
        >
          <option value="" disabled>
            Select persona
          </option>
          <option value="Athlete">Athlete</option>
          <option value="Vegetarian">Vegetarian</option>
          <option value="Default">Something else</option>
        </select>

        {/* Dietary restrictions */}
        <input
          className="input w-full"
          placeholder="Dietary restrictions (comma separated)"
          value={dietaryStr}
          onChange={(e) => setDietaryStr(e.target.value)}
        />

        {/* Allergies */}
        <input
          className="input w-full"
          placeholder="Allergies (comma separated)"
          value={allergiesStr}
          onChange={(e) => setAllergiesStr(e.target.value)}
        />

        {/* Cuisine preferences */}
        <input
          className="input w-full"
          placeholder="Cuisine preferences (comma separated)"
          value={cuisinesStr}
          onChange={(e) => setCuisinesStr(e.target.value)}
        />

        {/* Workout frequency */}
        <div>
          <label className="block text-sm">Workout frequency (1–10)</label>
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

        {/* Workout intensity */}
        <div>
          <label className="block text-sm">Workout intensity (1–10)</label>
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
