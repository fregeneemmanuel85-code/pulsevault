import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Cast JWT_SECRET to string since we checked it above
    const decoded = jwt.verify(token, JWT_SECRET as string) as {
      email: string;
      uid: string;
      role: string;
      name: string;
    };

    return NextResponse.json({
      email: decoded.email,
      uid: decoded.uid,
      role: decoded.role,
      name: decoded.name,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
