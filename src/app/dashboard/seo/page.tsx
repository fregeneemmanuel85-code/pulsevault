"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { subscribeToWebsites, type Website } from "@/lib/firestore";
import {
  Search,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function SEOMonitorPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    const unsub = subscribeToWebsites((data) => {
      const sorted = [...data].sort((a, b) => {
        const aScore = a.seoScore ?? 100;
        const bScore = b.seoScore ?? 100;
        return aScore - bScore;
      });
      setWebsites(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search size={24} className="text-blue-600" />
            SEO Monitor
          </h1>
          <p className="text-gray-500 mt-1">
            On-page SEO health across all websites
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-500">
          <div className="col-span-4">Website</div>
          <div className="col-span-2 text-center">SEO Score</div>
          <div className="col-span-3">Critical Issues</div>
          <div className="col-span-3">Warnings</div>
        </div>

        {websites.map((site) => {
          const score = site.seoScore ?? 0;
          const critical =
            site.seoIssues?.filter((i) => i.type === "critical").length ?? 0;
          const warnings =
            site.seoIssues?.filter((i) => i.type === "warning").length ?? 0;
          const infos =
            site.seoIssues?.filter((i) => i.type === "info").length ?? 0;

          return (
            <Link
              key={site.id}
              href={`/dashboard/websites/${site.id}`}
              className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors items-center"
            >
              <div className="col-span-4 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {site.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{site.url}</p>
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreColor(score)}`}
                >
                  {score}
                </span>
              </div>
              <div className="col-span-3">
                {critical > 0 ? (
                  <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                    <AlertTriangle size={14} />
                    {critical} critical
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
              <div className="col-span-3">
                {warnings > 0 ? (
                  <span className="inline-flex items-center gap-1 text-yellow-600 text-sm font-medium">
                    <Info size={14} />
                    {warnings} warnings
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
            </Link>
          );
        })}

        {websites.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>No websites found. Add a website to monitor SEO.</p>
          </div>
        )}
      </div>

      {/* Detailed issues for worst-performing site */}
      {websites.length > 0 &&
        websites[0].seoScore !== undefined &&
        websites[0].seoScore! < 80 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Top Priority: {websites[0].name}
            </h2>
            <div className="space-y-2">
              {websites[0].seoIssues?.map((issue, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${
                    issue.type === "critical"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : issue.type === "warning"
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}
                >
                  <p className="font-medium">{issue.message}</p>
                  <p className="text-xs opacity-80 mt-0.5">
                    {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
