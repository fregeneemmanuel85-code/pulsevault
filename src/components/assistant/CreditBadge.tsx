"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface Props {
  refreshKey?: number;
}

export default function CreditBadge({ refreshKey }: Props) {
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
  }, [refreshKey]);

  if (!credits) return null;

  const percent =
    credits.dailyLimit > 0 ? (credits.remaining / credits.dailyLimit) * 100 : 0;
  const color =
    percent > 50
      ? "text-emerald-400"
      : percent > 20
        ? "text-amber-400"
        : "text-rose-400";
  const bg =
    percent > 50
      ? "bg-emerald-500/10"
      : percent > 20
        ? "bg-amber-500/10"
        : "bg-rose-500/10";

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] font-semibold ${color} ${bg} px-2.5 py-1 rounded-full border border-white/[0.06]`}
    >
      <Zap size={10} />
      <span>
        {credits.remaining}/{credits.dailyLimit}
      </span>
    </div>
  );
}
