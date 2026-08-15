import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const getSecret = () => new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  console.log("[Middleware]", path, "Token present:", !!token);

  const isAuthPage = path === "/login" || path === "/register";
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/admin");

  let isValid = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      isValid = true;
      console.log("[Middleware] Token VALID");
    } catch (err: any) {
      console.log("[Middleware] Token INVALID:", err.message);
      isValid = false;
    }
  }

  // Block protected routes if not logged in
  if (!isValid && isProtected) {
    console.log("[Middleware] Redirecting to /login (no valid token)");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users away from auth pages
  if (isValid && isAuthPage) {
    console.log("[Middleware] Redirecting to /dashboard (already logged in)");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
