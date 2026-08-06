"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { subscribeToWebsites, type Website } from "@/lib/firestore";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

export default function SEOMonitorPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const getIssueIcon = (type: string) => {
    if (type === "critical")
      return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
    if (type === "warning")
      return <Info size={14} className="text-yellow-500 shrink-0" />;
    return <Info size={14} className="text-blue-500 shrink-0" />;
  };

  const getIssueBg = (type: string) => {
    if (type === "critical") return "bg-red-50 border-red-100 text-red-800";
    if (type === "warning")
      return "bg-yellow-50 border-yellow-100 text-yellow-800";
    return "bg-blue-50 border-blue-100 text-blue-800";
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
            On-page SEO health across all your websites
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
          const isExpanded = expandedId === site.id;

          return (
            <div key={site.id} className="border-b last:border-b-0">
              <button
                onClick={() => setExpandedId(isExpanded ? null : site.id)}
                className="w-full grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors items-center text-left"
              >
                <div className="col-span-4 min-w-0 flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 truncate">
                      {site.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{site.url}</p>
                  </div>
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
              </button>

              {/* Expanded issue details */}
              {isExpanded && site.seoIssues && site.seoIssues.length > 0 && (
                <div className="px-4 pb-4 bg-gray-50/50">
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Detected Issues
                      </h3>
                      <Link
                        href={`/dashboard/websites/${site.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View full report →
                      </Link>
                    </div>
                    {site.seoIssues.map((issue, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${getIssueBg(issue.type)}`}
                      >
                        {getIssueIcon(issue.type)}
                        <div className="min-w-0">
                          <p className="font-medium">{issue.message}</p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {issue.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded &&
                (!site.seoIssues || site.seoIssues.length === 0) && (
                  <div className="px-4 pb-4 bg-gray-50/50">
                    <div className="ml-6 p-3 text-sm text-gray-500 flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      No SEO issues detected. Great job!
                    </div>
                  </div>
                )}
            </div>
          );
        })}

        {websites.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>No websites found. Add a website to monitor SEO.</p>
          </div>
        )}
      </div>
    </div>
  );
}
