import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { phone?: string; dateOfBirth?: string };
    await db.update(user)
      .set({ phone: body.phone, dateOfBirth: body.dateOfBirth, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}