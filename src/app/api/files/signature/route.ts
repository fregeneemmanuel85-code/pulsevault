import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const JWT_SECRET = process.env.JWT_SECRET;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

const PLAN_LIMITS = {
  free: 100 * 1024 * 1024,
  starter: 300 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
  business: 1024 * 1024 * 1024,
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function detectPlan(userData: any): string {
  // Collect all possible fields where the plan tier might live
  const candidates = [
    userData?.planName,
    userData?.planId,
    userData?.plan,
    userData?.tier,
    userData?.billingPlan,
    userData?.subscription?.planName,
    userData?.subscription?.planId,
    userData?.subscription?.plan,
  ]
    .filter(Boolean)
    .map((v: string) => v.toLowerCase().trim());

  // Use the first candidate that matches a known plan key
  const matched = candidates.find((c) => c in PLAN_LIMITS);
  return matched || "free";
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fileName, fileSize, contentType } = body;

    if (!fileName || typeof fileSize !== "number") {
      return NextResponse.json(
        { error: "fileName and fileSize are required" },
        { status: 400 },
      );
    }

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are allowed" },
        { status: 400 },
      );
    }

    // Get user data
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const plan = detectPlan(userData);
    const maxFileSize = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    const storageLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    const used = Number(userData?.storageUsed) || 0;

    // Per-file size check
    if (fileSize > maxFileSize) {
      return NextResponse.json(
        {
          error: `File too large for your ${plan} plan. Maximum: ${formatBytes(maxFileSize)}`,
        },
        { status: 413 },
      );
    }

    // Total storage quota check
    if (used + fileSize > storageLimit) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          used,
          limit: storageLimit,
          remaining: Math.max(0, storageLimit - used),
        },
        { status: 403 },
      );
    }

    // Generate R2 presigned URL
    const key = `pulsevault/files/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || "application/zip",
      ContentLength: fileSize,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.json({
      signedUrl,
      key,
      publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
    });
  } catch (err: any) {
    console.error("[API /files/signature] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
