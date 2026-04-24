import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { joinClassByCodeViaGo } from "@/server/integrations/go-backend/classroom-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let joinCode: string;
  try {
    const body = await req.json();
    joinCode = String(body.joinCode ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!joinCode) {
    return NextResponse.json({ error: "Сынып коды міндетті" }, { status: 400 });
  }

  try {
    const data = await joinClassByCodeViaGo(user.id, joinCode);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
