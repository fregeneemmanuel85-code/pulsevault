import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
import { v2 as cloudinary } from "cloudinary";
import { FieldValue } from "firebase-admin/firestore";

const JWT_SECRET = process.env.JWT_SECRET;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const PLAN_LIMITS = {
  Free: 100 * 1024 * 1024,
  Starter: 300 * 1024 * 1024,
  Pro: 500 * 1024 * 1024,
  Business: 1024 * 1024 * 1024,
};

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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const originalName = (formData.get("originalName") as string) || file.name;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side ZIP validation
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are allowed" },
        { status: 400 },
      );
    }

    // Check quota
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const plan = (userData?.plan as string) || "Free";
    const limit =
      PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.Free;
    const used = Number(userData?.storageUsed) || 0;
    const fileSize = file.size;

    if (used + fileSize > limit) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          used,
          limit,
          remaining: Math.max(0, limit - used),
        },
        { status: 403 },
      );
    }

    // Convert file to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:application/zip;base64,${base64}`;

    // Upload to Cloudinary as raw file
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: `pulsevault/files/${userId}`,
      public_id: `archive-${Date.now()}`,
      use_filename: false,
      unique_filename: true,
    });

    const fileId = `cf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Record in Firestore
    await db
      .collection("files")
      .doc(fileId)
      .set({
        userId,
        name: uploadRes.original_filename || file.name,
        originalName: originalName,
        size: fileSize,
        originalSize: Number(formData.get("originalSize")) || fileSize,
        cloudinaryPublicId: uploadRes.public_id,
        downloadUrl: uploadRes.secure_url,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update quota
    if (!userSnap.exists) {
      await userRef.set({ storageUsed: fileSize, plan: "Free" });
    } else {
      await userRef.update({ storageUsed: FieldValue.increment(fileSize) });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: uploadRes.original_filename || file.name,
        originalName,
        size: fileSize,
        downloadUrl: uploadRes.secure_url,
      },
      used: used + fileSize,
      limit,
      remaining: limit - (used + fileSize),
    });
  } catch (err: any) {
    console.error("[API /files/upload] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}
