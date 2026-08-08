import { getFirestore } from "firebase-admin/firestore";

export const PLAN_AI_LIMITS: Record<string, number> = {
  free: 100,
  starter: 500,
  pro: 1000,
  business: 10000,
};

export interface CreditStatus {
  dailyLimit: number;
  dailyUsed: number;
  remaining: number;
  lastResetDate: string;
  totalUsed: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrCreateCredits(
  userId: string,
): Promise<CreditStatus> {
  const db = getFirestore();
  const ref = db
    .collection("users")
    .doc(userId)
    .collection("assistant")
    .doc("credits");
  const snap = await ref.get();

  if (!snap.exists) {
    const planSnap = await db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan")
      .get();
    const planId = planSnap.exists ? planSnap.data()?.planId || "free" : "free";
    const limit = PLAN_AI_LIMITS[planId] || 100;

    const initial: CreditStatus = {
      dailyLimit: limit,
      dailyUsed: 0,
      remaining: limit,
      lastResetDate: todayStr(),
      totalUsed: 0,
    };
    await ref.set(initial);
    return initial;
  }

  const data = snap.data() as CreditStatus;
  const today = todayStr();

  // Lazy daily reset
  if (data.lastResetDate !== today) {
    const planSnap = await db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan")
      .get();
    const planId = planSnap.exists ? planSnap.data()?.planId || "free" : "free";
    const limit = PLAN_AI_LIMITS[planId] || 100;

    const reset: CreditStatus = {
      dailyLimit: limit,
      dailyUsed: 0,
      remaining: limit,
      lastResetDate: today,
      totalUsed: data.totalUsed || 0,
    };
    await ref.set(reset);
    return reset;
  }

  data.remaining = Math.max(0, data.dailyLimit - data.dailyUsed);
  return data;
}

export async function deductCredits(
  userId: string,
  amount: number,
): Promise<boolean> {
  const db = getFirestore();
  const ref = db
    .collection("users")
    .doc(userId)
    .collection("assistant")
    .doc("credits");
  const snap = await ref.get();

  if (!snap.exists) return false;

  const data = snap.data() as CreditStatus;
  const today = todayStr();

  if (data.lastResetDate !== today) {
    return false;
  }

  if (data.dailyUsed + amount > data.dailyLimit) {
    return false;
  }

  await ref.update({
    dailyUsed: data.dailyUsed + amount,
    remaining: data.dailyLimit - (data.dailyUsed + amount),
    totalUsed: (data.totalUsed || 0) + amount,
  });

  return true;
}

export async function refundCredits(
  userId: string,
  amount: number,
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection("users")
    .doc(userId)
    .collection("assistant")
    .doc("credits");
  const snap = await ref.get();

  if (!snap.exists) return;

  const data = snap.data() as CreditStatus;
  const today = todayStr();

  if (data.lastResetDate !== today) return;

  const newDailyUsed = Math.max(0, data.dailyUsed - amount);
  await ref.update({
    dailyUsed: newDailyUsed,
    remaining: data.dailyLimit - newDailyUsed,
    totalUsed: Math.max(0, (data.totalUsed || 0) - amount),
  });
}
