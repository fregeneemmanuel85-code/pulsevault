import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid || decoded.userId || decoded.sub;
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Must be an image" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
    }

    // Convert to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.round(Date.now() / 1000);

    // Build parameters alphabetically for signature
    const params: Record<string, string> = {
      folder: `pulsevault/${userId}`,
      public_id: "profile",
      timestamp: String(timestamp),
    };

    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

    const crypto = await import("crypto");
    const signature = crypto
      .createHash("sha1")
      .update(`${stringToSign}${apiSecret}`)
      .digest("hex");

    const uploadForm = new FormData();
    uploadForm.append("file", dataURI);
    uploadForm.append("api_key", apiKey!);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("signature", signature);
    uploadForm.append("folder", params.folder);
    uploadForm.append("public_id", params.public_id);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadForm },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");

    const photoURL = data.secure_url;

    // Save to Firestore
    const db = getFirestore();
    await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .set({ photoURL }, { merge: true });

    return NextResponse.json({ url: photoURL });
  } catch (err: any) {
    console.error("[Upload] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}
