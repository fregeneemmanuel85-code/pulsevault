import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import {
  sendAlertEmail as sendFromServer,
  AlertEmailData,
} from "@/lib/email-server";

export type { AlertEmailData };

export async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .get();
    if (!snap.exists) return true;
    const data = snap.data();
    return data?.notifications?.email !== false;
  } catch {
    return true;
  }
}

export async function sendAlertEmail(data: AlertEmailData) {
  return sendFromServer(data);
}
