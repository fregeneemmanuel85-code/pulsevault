import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
    );
    const userId = payload.uid as string;

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get("websiteId");
    if (!websiteId)
      return NextResponse.json(
        { error: "websiteId required" },
        { status: 400 },
      );

    const db = getFirestore();
    const historySnap = await db
      .collection("users")
      .doc(userId)
      .collection("websites")
      .doc(websiteId)
      .collection("dnsHistory")
      .orderBy("timestamp", "desc")
      .limit(30)
      .get();

    const history = historySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
