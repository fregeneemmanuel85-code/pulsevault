"use client";

import { useEffect, useState } from "react";
import { Clock, Ban } from "lucide-react";
import Link from "next/link";
import { subscribeToUserPlan } from "@/lib/firestore";
import {
  checkSubscriptionStatus,
  type PlanStatus,
  type SubscriptionPlan,
} from "@/lib/subscription";

export default function SubscriptionBanner() {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const unsub = subscribeToUserPlan((p: any) => {
      if (!p) return;
      setPlan(p);
      const s = checkSubscriptionStatus(p as SubscriptionPlan);
      setStatus(s);
      if (p.gracePeriodEnd) {
        const diff = new Date(p.gracePeriodEnd).getTime() - Date.now();
        setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
      }
    });
    return () => unsub();
  }, []);

  if (!plan || plan.planId === "free" || status === "active") return null;

  if (status === "grace") {
    return (
      <div
        style={{
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "0.75rem",
          padding: "0.875rem 1rem",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#fbbf24",
          fontSize: "0.875rem",
          fontWeight: "500",
        }}
      >
        <Clock size={18} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          Your <strong>{plan.planName}</strong> plan expired. You have{" "}
          <strong>
            {daysLeft} day{daysLeft !== 1 ? "s" : ""}
          </strong>{" "}
          left in your grace period.
          <Link
            href="/dashboard/billing"
            style={{
              color: "#fbbf24",
              textDecoration: "underline",
              marginLeft: "0.5rem",
              fontWeight: "600",
            }}
          >
            Renew now →
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        borderRadius: "0.75rem",
        padding: "0.875rem 1rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "#f87171",
        fontSize: "0.875rem",
        fontWeight: "500",
      }}
    >
      <Ban size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        Your plan has expired and you have been downgraded to{" "}
        <strong>Free</strong>. Some features are limited.
        <Link
          href="/dashboard/billing"
          style={{
            color: "#f87171",
            textDecoration: "underline",
            marginLeft: "0.5rem",
            fontWeight: "600",
          }}
        >
          Upgrade to restore →
        </Link>
      </span>
    </div>
  );
}
