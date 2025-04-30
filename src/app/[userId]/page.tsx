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
    <main
      className="max-w-4xl mx-auto px-6 py-10 space-y-6"
      style={{ backgroundColor: "#eaf1e4", minHeight: "100vh" }}
    >
      <NavButtons />

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
        <h1 className="text-3xl font-bold text-[#496028]">Welcome, {profile.name}!</h1>
      </div>

      {/* Main Actions */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href={`/${id}/meal`}>
            <Button className="bg-[#496028] text-white px-4 py-2 text-sm hover:bg-[#3b4f21]">
              I’m hungry
            </Button>
          </Link>
          <Link href={`/${id}/fridge`}>
            <Button className="bg-[#496028] text-white px-4 py-2 text-sm hover:bg-[#3b4f21]">
              What's in my fridge?
            </Button>
          </Link>
          <Button
            className="bg-gray-200 text-gray-600 italic px-4 py-2 text-sm"
            disabled
          >
            More features coming soon
          </Button>
        </div>
      </div>

      {/* Favorites */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-[#496028]">Favourites</h2>
        {recs.length === 0 ? (
          <p className="text-gray-500">No favorite recipes yet.</p>
        ) : (
          <ul className="space-y-3">
            {recs.map((r) => (
              <li key={r.id} className="border rounded-lg p-4 bg-gray-50">
                <span className="font-medium text-black">{r.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
