import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose"; // ← Use jose instead of jsonwebtoken
import { auth } from "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const getSecret = () => new TextEncoder().encode(JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "ID token required" }, { status: 400 });
    }

    const decoded = await auth.verifyIdToken(idToken);

    // Sign with jose (same as middleware verification)
    const token = await new SignJWT({
      email: decoded.email,
      uid: decoded.uid,
      role: "user",
      name: decoded.name || decoded.email?.split("@")[0] || "User",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getSecret());

    const response = NextResponse.json({ success: true });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    console.log("[Login API] Cookie set for:", decoded.email);
    return response;
  } catch (err: any) {
    console.error("[Login API] Error:", err.message);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
