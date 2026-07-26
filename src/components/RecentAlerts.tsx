import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  createdAt: string;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  warning: { icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
  info: { icon: Info, color: "text-blue-600 bg-blue-50" },
};

export default function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Alerts</h3>
        <span className="text-xs text-slate-500">{alerts.length} new</span>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          No recent alerts
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className={`p-1.5 rounded-lg ${config.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {alert.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(alert.createdAt).toLocaleDateString()} •{" "}
                    {alert.type}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
