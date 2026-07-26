import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
  color?: "blue" | "green" | "red" | "amber" | "slate";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-50 text-slate-600",
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = "slate",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-emerald-600" : "text-red-600"}`}
        >
          {trendUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {trend}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  );
}
