import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, userId, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!userId;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  if (pathname === "/login") {
    if (isAuthenticated && isAdmin) {
      return NextResponse.redirect(new URL("/admin/teachers", request.url));
    }
    if (isAuthenticated && isTeacher) {
      return NextResponse.redirect(new URL("/teacher/schedule", request.url));
    }
    return supabaseResponse;
  }

  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin/teachers", request.url));
    }
    if (isTeacher) {
      return NextResponse.redirect(new URL("/teacher/schedule", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isAdmin) {
      if (isTeacher) {
        return NextResponse.redirect(new URL("/teacher/schedule", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/teacher")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isTeacher) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin/teachers", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
