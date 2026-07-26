import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Website {
  status: "healthy" | "warning" | "down";
}

export default function HealthDistribution({
  websites,
}: {
  websites: Website[];
}) {
  const data = [
    {
      name: "Healthy",
      value: websites.filter((w) => w.status === "healthy").length,
      color: "#10b981",
    },
    {
      name: "Warning",
      value: websites.filter((w) => w.status === "warning").length,
      color: "#f59e0b",
    },
    {
      name: "Down",
      value: websites.filter((w) => w.status === "down").length,
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0);

  if (websites.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Health Distribution
        </h3>
        <p className="text-sm text-slate-500 text-center py-8">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        Health Distribution
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-600">
              {item.name} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
