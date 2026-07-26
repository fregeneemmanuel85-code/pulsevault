"use client";

import { Activity, User, Globe, AlertTriangle, Settings } from "lucide-react";

const activities = [
  {
    icon: Globe,
    color: "text-blue-600 bg-blue-50",
    text: "Added website https://example.com",
    time: "2 minutes ago",
    user: "John Doe",
  },
  {
    icon: AlertTriangle,
    color: "text-red-600 bg-red-50",
    text: "Critical alert: example.com is down",
    time: "15 minutes ago",
    user: "System",
  },
  {
    icon: Settings,
    color: "text-slate-600 bg-slate-50",
    text: "Updated notification settings",
    time: "1 hour ago",
    user: "John Doe",
  },
  {
    icon: Globe,
    color: "text-blue-600 bg-blue-50",
    text: "Added website https://myapp.com",
    time: "3 hours ago",
    user: "John Doe",
  },
  {
    icon: Activity,
    color: "text-emerald-600 bg-emerald-50",
    text: "Health score improved to 95",
    time: "5 hours ago",
    user: "System",
  },
  {
    icon: User,
    color: "text-purple-600 bg-purple-50",
    text: "Invited Jane Smith to team",
    time: "1 day ago",
    user: "John Doe",
  },
];

export default function ActivityPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
        <p className="text-slate-500 mt-1">
          Track all actions across your account
        </p>
      </div>

      <div className="card p-6">
        <div className="space-y-0">
          {activities.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0"
              >
                <div className={`p-2 rounded-xl ${activity.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {activity.text}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
