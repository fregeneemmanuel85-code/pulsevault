import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getOrCreateCredits } from "@/lib/assistant-credits";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET required");

export async function GET(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
    );
    const userId = payload.uid as string;

    const credits = await getOrCreateCredits(userId);
    return NextResponse.json(credits);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
