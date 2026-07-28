"use client";

import { useEffect, useState } from "react";
import {
  setUserPlan,
  subscribeToUserPlan,
  type UserPlan,
} from "@/lib/firestore";

export default function PlanBadge() {
  const [plan, setPlan] = useState<UserPlan | null>(null);

  useEffect(() => {
    const unsub = subscribeToUserPlan((p) => setPlan(p));
    return () => unsub();
  }, []);

  if (!plan) return null;

  const colors: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    starter: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    business: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[plan.planId] || colors.free
      }`}
    >
      {plan.planName || "Free"}
    </span>
  );
}
