"use client";

import { Search, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Props {
  score: number;
  issues: number;
  lastScanned?: string | null;
}

export default function SEOSummaryCard({ score, issues, lastScanned }: Props) {
  const isGood = score >= 80;
  const isWarning = score >= 50 && score < 80;
  const isCritical = score < 50;

  const statusConfig = isGood
    ? {
        icon: CheckCircle2,
        label: "Good",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-200 dark:border-green-800/50",
        bar: "bg-green-500 dark:bg-green-400",
      }
    : isWarning
      ? {
          icon: AlertTriangle,
          label: "Needs Work",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          border: "border-amber-200 dark:border-amber-800/50",
          bar: "bg-amber-500 dark:bg-amber-400",
        }
      : {
          icon: AlertTriangle,
          label: "Poor",
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800/50",
          bar: "bg-red-500 dark:bg-red-400",
        };

  const Icon = statusConfig.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            SEO Health
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
        >
          <Icon size={12} />
          {statusConfig.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold ${statusConfig.color}`}>
            {score}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            /100
          </span>
        </div>

        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusConfig.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-slate-400">
            {issues > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle size={12} />
                {issues} issue{issues !== 1 ? "s" : ""} found
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 size={12} />
                No issues
              </span>
            )}
          </span>
          {lastScanned && (
            <span className="text-gray-400 dark:text-slate-500">
              <Info size={12} className="inline mr-1" />
              {new Date(lastScanned).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
