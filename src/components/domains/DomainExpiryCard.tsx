"use client";

import { Globe, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface Props {
  expiry: string | null | undefined;
  daysLeft: number | null | undefined;
  registrar: string | null | undefined;
}

export default function DomainExpiryCard({
  expiry,
  daysLeft,
  registrar,
}: Props) {
  const isExpired = daysLeft !== null && daysLeft !== undefined && daysLeft < 0;
  const isExpiringSoon =
    daysLeft !== null &&
    daysLeft !== undefined &&
    daysLeft >= 0 &&
    daysLeft < 30;
  const isSafe = daysLeft !== null && daysLeft !== undefined && daysLeft >= 30;

  const statusConfig = isExpired
    ? {
        icon: AlertTriangle,
        label: "Expired",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800/50",
        text: "text-red-800 dark:text-red-300",
      }
    : isExpiringSoon
      ? {
          icon: Clock,
          label: "Expiring Soon",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          border: "border-amber-200 dark:border-amber-800/50",
          text: "text-amber-800 dark:text-amber-300",
        }
      : {
          icon: CheckCircle2,
          label: "Healthy",
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800/50",
          text: "text-green-800 dark:text-green-300",
        };

  const Icon = statusConfig.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Domain Expiry
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
        >
          <Icon size={12} />
          {statusConfig.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-bold ${
              isExpired
                ? "text-red-600 dark:text-red-400"
                : isExpiringSoon
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
            }`}
          >
            {daysLeft !== null && daysLeft !== undefined
              ? Math.abs(daysLeft)
              : "—"}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {daysLeft !== null && daysLeft !== undefined
              ? isExpired
                ? "days overdue"
                : "days left"
              : "unknown"}
          </span>
        </div>

        {expiry && (
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Expires:{" "}
            <span className="font-medium text-gray-700 dark:text-slate-300">
              {new Date(expiry).toLocaleDateString()}
            </span>
          </p>
        )}

        {registrar && (
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Registrar:{" "}
            <span className="font-medium text-gray-700 dark:text-slate-300">
              {registrar}
            </span>
          </p>
        )}
      </div>

      {isExpired && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          Your domain has expired. Renew immediately to avoid losing it.
        </p>
      )}
      {isExpiringSoon && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          Renew soon to avoid service interruption.
        </p>
      )}
    </div>
  );
}
