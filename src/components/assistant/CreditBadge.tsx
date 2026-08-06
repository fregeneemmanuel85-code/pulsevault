"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

export default function CreditBadge() {
  const [credits, setCredits] = useState<{
    dailyLimit: number;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/assistant/credits")
      .then((r) => r.json())
      .then((data) => {
        if (data.dailyLimit) setCredits(data);
      })
      .catch(() => null);
  }, []);

  if (!credits) return null;

  const percent =
    credits.dailyLimit > 0 ? (credits.remaining / credits.dailyLimit) * 100 : 0;
  const color =
    percent > 50
      ? "text-green-600"
      : percent > 20
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${color} bg-white/80 px-2.5 py-1 rounded-full`}
    >
      <Zap size={12} />
      <span>
        {credits.remaining}/{credits.dailyLimit}
      </span>
    </div>
  );
}
