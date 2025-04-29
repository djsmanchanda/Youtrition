// src/app/[userId]/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import NavButtons from "@/components/NavButtons";

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

  const recs = await db.recipe.findMany({
    where: { profileId: id, favorite: true },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <NavButtons />

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
        <h1 className="text-3xl font-bold">Welcome, {profile.name}!</h1>
        <p className="text-sm text-muted-foreground">
          Persona: {profile.persona ?? "Unspecified"}
        </p>
      </div>

    {/* “I’m hungry” + placeholder for upcoming features */}
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
      <div className="flex justify-center items-center space-x-4">
        <Link href={`/${id}/meal`}>
          <Button className="bg-black text-white px-4 py-2 text-sm">
            I’m hungry
          </Button>
        </Link>
        <Button className="bg-black text-white px-4 py-2 text-sm italic" disabled>
          More features coming soon
        </Button>
      </div>
    </div>


      {/* Favourites card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold">Favourites</h2>
        {recs.length === 0 ? (
          <p>No favorite recipes yet.</p>
        ) : (
          <ul className="space-y-3">
            {recs.map((r) => (
              <li key={r.id} className="border rounded-lg p-4">
                <span className="font-medium">{r.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
