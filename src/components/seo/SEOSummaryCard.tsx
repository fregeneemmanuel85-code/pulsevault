"use client";

import { Search, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface Props {
  score: number;
  issues: number;
  lastScanned?: string | null;
}

export default function SEOSummaryCard({ score, issues, lastScanned }: Props) {
  const getColor = () => {
    if (score >= 80)
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        icon: <CheckCircle size={18} className="text-green-500" />,
      };
    if (score >= 50)
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        icon: <AlertTriangle size={18} className="text-yellow-500" />,
      };
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <AlertTriangle size={18} className="text-red-500" />,
    };
  };

  const status = getColor();

  return (
    <div
      className={`rounded-xl border p-5 ${status.bg} ${status.text} ${status.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide opacity-80">
          SEO Score
        </h3>
        {status.icon}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-sm opacity-70">/100</span>
      </div>

      <p className="text-sm opacity-90 mb-3">
        {issues === 0
          ? "No issues found"
          : `${issues} issue${issues !== 1 ? "s" : ""} detected`}
      </p>

      {lastScanned && (
        <p className="text-xs opacity-60 border-t border-current border-opacity-20 pt-2">
          Scanned {new Date(lastScanned).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
