import Link from "next/link";
import { ExternalLink, Settings, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface Website {
  id: string;
  url: string;
  status: "healthy" | "warning" | "down";
  healthScore: number;
  lastCheck: string;
  uptime30d: number;
  incidents: number;
}

const statusConfig = {
  healthy: {
    label: "Healthy",
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  warning: {
    label: "Warning",
    class: "bg-amber-50 text-amber-700 border-amber-200",
  },
  down: { label: "Down", class: "bg-red-50 text-red-700 border-red-200" },
};

// Generate fake sparkline data
const generateSparkline = () =>
  Array.from({ length: 10 }, () => ({ value: Math.random() * 100 }));

export default function WebsiteTable({ websites }: { websites: Website[] }) {
  if (websites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">No websites monitored yet</p>
        <Link
          href="/dashboard/websites"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Add Your First Website
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Website
            </th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Status
            </th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Health
            </th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Last Check
            </th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Uptime (30d)
            </th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Incidents
            </th>
            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {websites.map((site) => {
            const status = statusConfig[site.status];
            const sparklineData = generateSparkline();

            return (
              <tr
                key={site.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {site.url}
                      </p>
                      <p className="text-xs text-slate-500">
                        ID: {site.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          site.healthScore >= 80
                            ? "bg-emerald-500"
                            : site.healthScore >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${site.healthScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {site.healthScore}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {new Date(site.lastCheck).toLocaleTimeString()}
                </td>
                <td className="py-4">
                  <div className="w-24 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={
                            site.uptime30d > 99
                              ? "#10b981"
                              : site.uptime30d > 95
                                ? "#f59e0b"
                                : "#ef4444"
                          }
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {site.incidents}
                </td>
                <td className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/websites/${site.id}`}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Activity className="w-4 h-4" />
                    </Link>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
