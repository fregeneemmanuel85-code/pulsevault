"use client";

import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
} from "lucide-react";

interface Props {
  expiry: string | null;
  daysLeft: number | null;
  registrar: string | null;
}

export default function DomainExpiryCard({
  expiry,
  daysLeft,
  registrar,
}: Props) {
  const getStatus = () => {
    if (daysLeft === null) {
      return {
        color: "bg-gray-100 text-gray-700 border-gray-200",
        icon: <Shield size={18} className="text-gray-500" />,
        label: "Unknown",
        subtext: "Could not retrieve domain data",
      };
    }
    if (daysLeft < 0) {
      return {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: <XCircle size={18} className="text-red-500" />,
        label: "Expired",
        subtext: `Expired ${Math.abs(daysLeft)} days ago`,
      };
    }
    if (daysLeft < 7) {
      return {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: <AlertTriangle size={18} className="text-red-500" />,
        label: "Critical",
        subtext: `Expires in ${daysLeft} days`,
      };
    }
    if (daysLeft < 30) {
      return {
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: <AlertTriangle size={18} className="text-orange-500" />,
        label: "Expiring Soon",
        subtext: `Expires in ${daysLeft} days`,
      };
    }
    if (daysLeft < 90) {
      return {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: <Calendar size={18} className="text-yellow-500" />,
        label: "Renewal Due",
        subtext: `Expires in ${daysLeft} days`,
      };
    }
    return {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle size={18} className="text-green-500" />,
      label: "Healthy",
      subtext: `Expires in ${daysLeft} days`,
    };
  };

  const status = getStatus();

  const formattedDate = expiry
    ? new Date(expiry).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className={`rounded-xl border p-5 ${status.color}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide opacity-80">
          Domain Expiration
        </h3>
        {status.icon}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{status.label}</span>
        </div>
        <p className="text-sm opacity-90">{status.subtext}</p>

        <div className="pt-3 mt-3 border-t border-current border-opacity-20 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="opacity-70">Expiry Date</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          {registrar && (
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Registrar</span>
              <span className="font-medium">{registrar}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
