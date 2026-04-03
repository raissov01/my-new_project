import { type NextRequest } from "next/server";
import { updateSession } from "@/server/auth-middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/classes/:path*",
    "/collections/:path*",
    "/dashboard/:path*",
    "/flashcards/:path*",
    "/ielts/:path*",
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
