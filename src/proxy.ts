import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/classes/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/sets/new",
    "/sets/:id/edit",
    "/sets/:id/study",
    "/settings/:path*",
    "/student/:path*",
    "/teacher/:path*",
    "/login",
    "/signup",
  ],
};
