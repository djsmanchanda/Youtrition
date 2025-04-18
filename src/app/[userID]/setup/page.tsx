// src/app/[userId]/setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  // New 🆕  — unwrap params with the hook
  const { userId } = useParams<{ userId: string }>();
  // If you kept the folder name [userID], change the generic accordingly

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/profile", {
      method: "POST",
      body: JSON.stringify({
        id: Number(userId),          // ← now safe
        name,
        persona,
      }),
    });

    router.push(`/${userId}`);       // back to dashboard
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="border rounded px-3 py-2 w-full"
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

        <button className="border rounded px-3 py-2 w-full">
          Create profile
        </button>
      </form>
    </main>
  );
}
