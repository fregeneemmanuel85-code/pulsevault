import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken(req: NextRequest) {
  const cookieToken = req.cookies.get("token")?.value;
  if (!cookieToken || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(
      cookieToken,
      new TextEncoder().encode(JWT_SECRET),
    );
    return payload.uid as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, publicUrl, fileName, originalName, fileSize, originalSize } =
      body;

    if (!key || !publicUrl || !fileName || typeof fileSize !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Security: ensure the key belongs to this user
    if (!key.startsWith(`pulsevault/files/${userId}/`)) {
      return NextResponse.json(
        { error: "Invalid file ownership" },
        { status: 403 },
      );
    }

    const fileId = `r2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db
      .collection("files")
      .doc(fileId)
      .set({
        userId,
        name: fileName,
        originalName: originalName || fileName,
        size: Number(fileSize),
        originalSize: Number(originalSize) || Number(fileSize),
        r2Key: key,
        downloadUrl: publicUrl,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update quota
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({ storageUsed: Number(fileSize), plan: "free" });
    } else {
      await userRef.update({
        storageUsed: FieldValue.increment(Number(fileSize)),
      });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: fileName,
        originalName: originalName || fileName,
        size: Number(fileSize),
        downloadUrl: publicUrl,
      },
    });
  } catch (err: any) {
    console.error("[API /files/confirm] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to confirm upload" },
      { status: 500 },
    );
  }
}
