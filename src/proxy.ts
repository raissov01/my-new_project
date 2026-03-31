import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/classes/:path*",
    "/dashboard/:path*",
    "/guide/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/sets/:path*",
    "/settings/:path*",
    "/student/:path*",
    "/teacher/:path*",
    "/login",
    "/signup",
  ],
};
