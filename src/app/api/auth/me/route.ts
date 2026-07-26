import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// ─── GET: Return current user from cookie ───
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as any;

    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || null,
      role: decoded.role || "user",
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

// ─── POST: Exchange Firebase ID token for custom JWT cookie ───
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "ID token required" }, { status: 400 });
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);

    const token = jwt.sign(
      {
        email: decoded.email,
        uid: decoded.uid,
        role: "user",
        name: decoded.name || decoded.email?.split("@")[0] || "User",
      },
      JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Auth/Me POST] Error:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
