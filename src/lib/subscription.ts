export const PLAN_CONFIG = {
  free: {
    name: "Free",
    price: 0,
    websites: 2,
    checkInterval: 30,
    aiCredits: 100,
    fileStorage: 100 * 1024 * 1024, // 100 MB
    gracePeriodDays: 0,
  },
  starter: {
    name: "Starter",
    price: 3000,
    websites: 5,
    checkInterval: 15,
    aiCredits: 500,
    fileStorage: 300 * 1024 * 1024, // 300 MB
    gracePeriodDays: 7,
  },
  pro: {
    name: "Pro",
    price: 12000,
    websites: 30,
    checkInterval: 5,
    aiCredits: 1000,
    fileStorage: 500 * 1024 * 1024, // 500 MB
    gracePeriodDays: 7,
  },
  business: {
    name: "Business",
    price: 22500,
    websites: 100,
    checkInterval: 1,
    aiCredits: 10000,
    fileStorage: 1024 * 1024 * 1024, // 1 GB
    gracePeriodDays: 7,
  },
};

export type PlanStatus = "active" | "grace" | "expired" | "cancelled";

export interface SubscriptionPlan {
  planId: string;
  planName: string;
  price: number;
  websites: number;
  checkInterval: number;
  startedAt: string;
  expiresAt: string;
  status: PlanStatus;
  gracePeriodEnd?: string | null;
  aiCredits: number;
  fileStorage: number;
}

export function getPlanConfig(planId: string) {
  return PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free;
}

export function checkSubscriptionStatus(
  plan: SubscriptionPlan | null,
): PlanStatus {
  if (!plan || plan.planId === "free") return "active";

  const now = Date.now();
  const expiry = new Date(plan.expiresAt).getTime();
  const graceEnd = plan.gracePeriodEnd
    ? new Date(plan.gracePeriodEnd).getTime()
    : 0;

  if (now < expiry) return "active";
  if (graceEnd && now < graceEnd) return "grace";
  return "expired";
}

export function calculateGracePeriodEnd(
  expiresAt: string,
  days: number = 7,
): string {
  return new Date(
    new Date(expiresAt).getTime() + days * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function formatFileStorage(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i];
}
