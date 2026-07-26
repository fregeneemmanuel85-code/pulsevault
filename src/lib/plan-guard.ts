import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

export type PlanId = "free" | "starter" | "pro" | "business";

export interface PlanConfig {
  planId: PlanId;
  planName: string;
  price: number;
  websites: number;
  checkInterval: number; // minutes
  features: {
    emailAlerts: boolean;
    dailyWeeklySummaries: boolean;
    healthScoreTracking: boolean;
    downtimeHistory: boolean;
    errorTrends: boolean;
    performanceInsights: boolean;
    priorityQueue: boolean;
    multiClientManagement: boolean;
    advancedReporting: boolean;
    incidentHistoryTracking: boolean;
    standardDashboard: boolean;
  };
}

const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    planId: "free",
    planName: "Free",
    price: 0,
    websites: 2,
    checkInterval: 30,
    features: {
      emailAlerts: false,
      dailyWeeklySummaries: false,
      healthScoreTracking: true,
      downtimeHistory: false,
      errorTrends: false,
      performanceInsights: false,
      priorityQueue: false,
      multiClientManagement: false,
      advancedReporting: false,
      incidentHistoryTracking: false,
      standardDashboard: false,
    },
  },
  starter: {
    planId: "starter",
    planName: "Starter",
    price: 3000,
    websites: 5,
    checkInterval: 15,
    features: {
      emailAlerts: true,
      dailyWeeklySummaries: true,
      healthScoreTracking: true,
      downtimeHistory: false,
      errorTrends: false,
      performanceInsights: false,
      priorityQueue: false,
      multiClientManagement: false,
      advancedReporting: false,
      incidentHistoryTracking: true,
      standardDashboard: true,
    },
  },
  pro: {
    planId: "pro",
    planName: "Pro",
    price: 12000,
    websites: 30,
    checkInterval: 5,
    features: {
      emailAlerts: true,
      dailyWeeklySummaries: true,
      healthScoreTracking: true,
      downtimeHistory: true,
      errorTrends: true,
      performanceInsights: true,
      priorityQueue: true,
      multiClientManagement: false,
      advancedReporting: false,
      incidentHistoryTracking: true,
      standardDashboard: true,
    },
  },
  business: {
    planId: "business",
    planName: "Business",
    price: 22500,
    websites: 100,
    checkInterval: 1,
    features: {
      emailAlerts: true,
      dailyWeeklySummaries: true,
      healthScoreTracking: true,
      downtimeHistory: true,
      errorTrends: true,
      performanceInsights: true,
      priorityQueue: true,
      multiClientManagement: true,
      advancedReporting: true,
      incidentHistoryTracking: true,
      standardDashboard: true,
    },
  },
};

export function getPlanConfig(planId: string): PlanConfig {
  return PLANS[(planId as PlanId) || "free"] || PLANS.free;
}

export function canAddWebsite(planId: string, currentCount: number): boolean {
  const config = getPlanConfig(planId);
  return currentCount < config.websites;
}

export function getCheckIntervalMinutes(planId: string): number {
  return getPlanConfig(planId).checkInterval;
}

export function canSendEmailAlerts(planId: string): boolean {
  return getPlanConfig(planId).features.emailAlerts;
}

export function canSendSummaries(planId: string): boolean {
  return getPlanConfig(planId).features.dailyWeeklySummaries;
}

export function hasPriorityQueue(planId: string): boolean {
  return getPlanConfig(planId).features.priorityQueue;
}

export function hasAdvancedReporting(planId: string): boolean {
  return getPlanConfig(planId).features.advancedReporting;
}

export function hasMultiClientManagement(planId: string): boolean {
  return getPlanConfig(planId).features.multiClientManagement;
}

export function hasIncidentHistory(planId: string): boolean {
  return getPlanConfig(planId).features.incidentHistoryTracking;
}

export function hasStandardDashboard(planId: string): boolean {
  return getPlanConfig(planId).features.standardDashboard;
}

// Server-side: enforce plan limits on API routes
export async function enforcePlanLimits(
  userId: string,
  action: "addWebsite" | "sendEmail" | "sendSummary" | "viewAdvancedReport",
): Promise<{ allowed: boolean; reason?: string }> {
  const db = getFirestore();
  const planSnap = await db
    .collection("users")
    .doc(userId)
    .collection("billing")
    .doc("plan")
    .get();

  const planId = planSnap.exists ? planSnap.data()?.planId || "free" : "free";
  const config = getPlanConfig(planId);

  switch (action) {
    case "addWebsite": {
      const sitesSnap = await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .count()
        .get();
      const count = sitesSnap.data().count;
      if (count >= config.websites) {
        return {
          allowed: false,
          reason: `Plan limit reached: ${config.websites} websites on ${config.planName}`,
        };
      }
      return { allowed: true };
    }
    case "sendEmail":
      return {
        allowed: config.features.emailAlerts,
        reason: config.features.emailAlerts
          ? undefined
          : "Email alerts require Starter plan or higher",
      };
    case "sendSummary":
      return {
        allowed: config.features.dailyWeeklySummaries,
        reason: config.features.dailyWeeklySummaries
          ? undefined
          : "Daily/weekly summaries require Starter plan or higher",
      };
    case "viewAdvancedReport":
      return {
        allowed: config.features.advancedReporting,
        reason: config.features.advancedReporting
          ? undefined
          : "Advanced reporting requires Business plan",
      };
    default:
      return { allowed: true };
  }
}
