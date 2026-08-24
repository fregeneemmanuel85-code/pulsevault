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

export async function GET(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await db
      .collection("files")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const files = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        originalName: data.originalName || "",
        size: Number(data.size) || 0,
        downloadUrl: data.downloadUrl || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
      };
    });

    return NextResponse.json({ files });
  } catch (err: any) {
    console.error("[API /files GET] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("id");
  if (!fileId)
    return NextResponse.json({ error: "File ID required" }, { status: 400 });

  try {
    const fileRef = db.collection("files").doc(fileId);
    const snap = await fileRef.get();
    if (!snap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = snap.data()!;
    if (data.userId !== userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Delete from Cloudinary
    if (data.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(data.cloudinaryPublicId, {
        resource_type: "raw",
      });
    }

    // Delete metadata and update quota
    await fileRef.delete();
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      storageUsed: FieldValue.increment(-(Number(data.size) || 0)),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /files DELETE] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
