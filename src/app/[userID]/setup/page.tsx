"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/profile", {
      method: "POST",
      body: JSON.stringify({
        id: Number(params.userId),
        name,
        persona,
      }),
    });

    router.push(`/${params.userId}`); // dashboard
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your profile</h1>

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
          <option value="Default">Something else</option>
        </select>

        <button className="btn w-full">Create profile</button>
      </form>
    </main>
  );
}
