import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import {
  fetchBackendJson,
  fetchBackendRaw,
} from "@/server/integrations/go-backend/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminRouteProps = {
  params: Promise<{ path: string[] }>;
};

type AdminMethod = "GET" | "POST" | "PUT" | "DELETE";

async function proxyAdminRequest(
  req: NextRequest,
  { params }: AdminRouteProps,
  method: AdminMethod
) {
  const auth = await requireAdmin();
  if (auth.redirectTo || !auth.user) {
    return NextResponse.json(
      { error: auth.redirectTo === "/login" ? "Unauthorized" : "Admin access required" },
      { status: auth.redirectTo === "/login" ? 401 : 403 }
    );
  }

  const { path } = await params;
  const safePath = path.map((part) => encodeURIComponent(part)).join("/");
  const search = req.nextUrl.search;
  const body = method === "GET" ? null : await req.text();
  const contentType = req.headers.get("content-type");

  // CSV / file downloads are routed straight through. The backend writes its
  // own Content-Type / Content-Disposition headers; we just relay the bytes
  // so the browser triggers a download instead of trying to parse JSON.
  const wantsRaw = req.nextUrl.searchParams.get("format") === "csv";

  try {
    if (wantsRaw && method === "GET") {
      const upstream = await fetchBackendRaw({
        path: `/api/v1/admin/${safePath}${search}`,
        userId: auth.user.id,
        method,
      });
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: upstream.headers,
      });
    }

    const data = await fetchBackendJson<unknown>({
      path: `/api/v1/admin/${safePath}${search}`,
      userId: auth.user.id,
      method,
      body,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Admin request failed";
    console.error("[admin-api] proxy error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest, props: AdminRouteProps) {
  return proxyAdminRequest(req, props, "GET");
}

export async function POST(req: NextRequest, props: AdminRouteProps) {
  return proxyAdminRequest(req, props, "POST");
}

export async function PUT(req: NextRequest, props: AdminRouteProps) {
  return proxyAdminRequest(req, props, "PUT");
}

export async function DELETE(req: NextRequest, props: AdminRouteProps) {
  return proxyAdminRequest(req, props, "DELETE");
}
