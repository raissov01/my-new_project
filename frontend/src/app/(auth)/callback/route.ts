import { NextResponse } from "next/server";

// OAuth callback — Supabase removed. Redirects to login.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
