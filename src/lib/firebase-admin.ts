import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app;

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (
    !privateKey ||
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL
  ) {
    throw new Error(
      `Missing Firebase Admin credentials. ` +
        `PROJECT_ID=${!!process.env.FIREBASE_PROJECT_ID}, ` +
        `CLIENT_EMAIL=${!!process.env.FIREBASE_CLIENT_EMAIL}, ` +
        `PRIVATE_KEY=${!!privateKey}`,
    );
  }

  app =
    getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
        })
      : getApps()[0];
} catch (err: any) {
  console.error("[Firebase Admin] Init failed:", err.message);
  throw new Error(`Firebase Admin initialization failed: ${err.message}`);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
