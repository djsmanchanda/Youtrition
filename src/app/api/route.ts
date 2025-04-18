import { NextResponse } from "next/server";
import {db} from "@/lib/db";

export async function POST(req: Request) {
  const { id, name, persona } = await req.json();

  await db.profile.create({
    data: { id, name, persona },
  });

  return NextResponse.json({ ok: true });
}