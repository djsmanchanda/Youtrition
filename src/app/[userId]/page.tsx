// src/app/[userId]/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";                    // ← add this
import { db } from "@/lib/db";
import { recommendRecipes, Filter } from "@/lib/recipes";
import { Button } from "@/components/ui/button"; 

export const dynamic = "force-dynamic";

type PageProps = {
  params: { userId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function UserHome({ params }: PageProps) {
  const id = Number(params.userId);
  if (Number.isNaN(id)) return notFound();

  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) return redirect(`/${id}/setup`);

  // Fetch user's favorite recipes
  const recs = await db.recipe.findMany({
    where: { profileId: id, favorite: true },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {profile.name}!</h1>
      <p className="text-sm text-muted-foreground">
        Persona: {profile.persona ?? "Unspecified"}
      </p>

      {/* I'm hungry button */}
      <div>
        <Link href={`/${id}/meal`}>
          <Button>I'm hungry</Button>
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Favourites</h2>
        {recs.length === 0 ? (
          <p>No favorite recipes yet.</p>
        ) : (
          <ul className="space-y-4">
            {recs.map((r) => (
              <li key={r.id} className="border rounded p-4">
                <span className="font-medium">{r.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
