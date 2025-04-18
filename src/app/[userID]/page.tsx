import { redirect, notFound } from "next/navigation";
import {db} from "@/lib/db";                 // thin wrapper that exports new PrismaClient()

export const dynamic = "force-dynamic";    // no static cache; always hit DB

type Props = { params: { userId: string } };

export default async function UserPage({ params }: Props) {
  const id = Number(params.userId);
  if (Number.isNaN(id)) notFound();

  const profile = await db.profile.findUnique({ where: { id } });

  // If this ID has no profile → send them to the setup wizard
  if (!profile) redirect(`/${id}/setup`);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome, {profile.name}!</h1>
      <p className="text-muted-foreground">
        Persona:&nbsp;{profile.persona ?? "Unspecified"}
      </p>
      {/* render pantry, recommendations, etc. */}
    </main>
  );
}
