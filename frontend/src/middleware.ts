import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // RSC navigation requests must pass through untouched.
  if (request.nextUrl.searchParams.has("_rsc")) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  // Exclude static assets, Next.js internals, and API routes from middleware.
  matcher: ["/((?!_next/static|_next/image|_rsc|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot|css|js)).*)"],
};
