import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import { checkSSLCertificate } from "@/lib/ssl-checker";

// ✅ FAILS FAST — no fallback secret
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Helper to get secret as Uint8Array for jose
function getSecret(): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let userId: string;
    try {
      const verified = await jwtVerify(token, getSecret());
      userId = verified.payload.uid as string;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = getFirestore();
    const sitesSnap = await db
      .collection("users")
      .doc(userId)
      .collection("websites")
      .get();

    const results = [];

    for (const docSnap of sitesSnap.docs) {
      const site = docSnap.data();
      const url = site.url as string;

      try {
        const hostname = new URL(url).hostname;
        const ssl = await checkSSLCertificate(hostname);

        let sslStatus: "valid" | "expired" | "expiring" | "unknown" = "unknown";
        if (!ssl.valid || ssl.daysLeft < 0) sslStatus = "expired";
        else if (ssl.daysLeft < 30) sslStatus = "expiring";
        else sslStatus = "valid";

        await docSnap.ref.update({
          ssl: sslStatus,
          sslExpiry: ssl.expiryDate,
          sslDaysLeft: ssl.daysLeft,
          lastChecked: new Date().toISOString(),
        });

        results.push({
          name: site.name,
          sslStatus,
          daysLeft: ssl.daysLeft,
          expiry: ssl.expiryDate,
        });
      } catch (e: any) {
        results.push({ name: site.name, error: e.message });
      }
    }

    return NextResponse.json({ updated: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
