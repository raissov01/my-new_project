import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, props: { params: Promise<{ materialId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId } = await props.params;
  try {
    const data = await fetchBackendJson<any>({
      path: `/api/v1/materials/${materialId}/notes`,
      userId: user.id,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ note: { notes: "", exercises: "{}", lastPage: 1 } });
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ materialId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId } = await props.params;
  const body = await req.json();

  try {
    const data = await fetchBackendJson<any>({
      path: `/api/v1/materials/${materialId}/notes`,
      userId: user.id,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
