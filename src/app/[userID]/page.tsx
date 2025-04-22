// src/app/[userId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recommendRecipes, Filter } from "@/lib/recipes";

export const dynamic = "force-dynamic";

type Props = { params: { userId: string } };

export default async function UserHome({ params }: Props) {
  const id = Number(params.userId);
  if (Number.isNaN(id)) return notFound();

  // 1. Make sure the profile exists
  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return redirect(`/${id}/setup`);

  // 2. Fetch recommendations (no filters for now)
  const filter: Filter = { diet: [], allergies: [] };
  const recs = await recommendRecipes(id, filter);

  // 3. Render
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {profile.name}!</h1>
      <p className="text-sm text-muted-foreground">
        Persona: {profile.persona ?? "Unspecified"}
      </p>

      <section>
        <h2 className="text-xl font-semibold mb-4">Tonight’s Recommendations</h2>
        {recs.length === 0 ? (
          <p>No recipes match your pantry yet.</p>
        ) : (
          <ul className="space-y-4">
            {recs.slice(0, 5).map((r) => (
              <li key={r.id} className="border rounded p-4">
                <div className="flex justify-between">
                  <span className="font-medium">{r.title}</span>
                  <span>{r.match.toFixed(0)}% match</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
