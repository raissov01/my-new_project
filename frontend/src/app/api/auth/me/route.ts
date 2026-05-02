import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentProfile, getCurrentBackendUser } from "@/server/auth";

/**
 * GET /api/auth/me
 *
 * Client-side proxy for auth state. The JWT lives in an httpOnly cookie
 * that JavaScript cannot read, so the client calls this Next.js API route
 * instead. This route reads the cookie server-side, calls the Go backend,
 * and returns the user data.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const profile = await getCurrentProfile(user);
    const backend = await getCurrentBackendUser();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
        username: profile?.username ?? user.user_metadata?.username ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? user.user_metadata?.role ?? "student",
        plan: user.plan ?? "free",
        isSuperadmin: backend?.isSuperadmin ?? false,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
