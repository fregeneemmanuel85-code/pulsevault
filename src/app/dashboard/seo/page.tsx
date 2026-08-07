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
    if (score >= 80)
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 50)
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getIssueIcon = (type: string) => {
    if (type === "critical")
      return <AlertTriangle size={14} className="text-rose-400 shrink-0" />;
    if (type === "warning")
      return <Info size={14} className="text-amber-400 shrink-0" />;
    return <Info size={14} className="text-indigo-400 shrink-0" />;
  };

  const getIssueBg = (type: string) => {
    if (type === "critical")
      return "bg-rose-500/5 border-rose-500/15 text-rose-300";
    if (type === "warning")
      return "bg-amber-500/5 border-amber-500/15 text-amber-300";
    return "bg-indigo-500/5 border-indigo-500/15 text-indigo-300";
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 md:h-20 bg-[#1e293b] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-100">
            <Search size={24} className="text-indigo-400" />
            SEO Monitor
          </h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">
            On-page SEO health across all your websites
          </p>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-4 p-4 border-b border-white/[0.06] bg-[#0b0f19] text-sm font-medium text-slate-400">
          <div className="md:col-span-4">Website</div>
          <div className="md:col-span-2 text-center">SEO Score</div>
          <div className="md:col-span-3">Critical Issues</div>
          <div className="md:col-span-3">Warnings</div>
        </div>

        {websites.map((site) => {
          const score = site.seoScore ?? 0;
          const critical =
            site.seoIssues?.filter((i) => i.type === "critical").length ?? 0;
          const warnings =
            site.seoIssues?.filter((i) => i.type === "warning").length ?? 0;
          const isExpanded = expandedId === site.id;

          return (
            <div
              key={site.id}
              className="border-b border-white/[0.06] last:border-b-0"
            >
              {/* Row Button */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : site.id)}
                className="w-full p-4 hover:bg-[#1e293b]/40 transition-colors text-left"
              >
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp
                            size={16}
                            className="text-slate-500 shrink-0"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="text-slate-500 shrink-0"
                          />
                        )}
                        <p className="font-medium text-slate-100 truncate">
                          {site.name}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 ml-6">
                        {site.url}
                      </p>

                      {/* Mobile issue badges */}
                      <div className="flex items-center gap-3 mt-2 ml-6">
                        {critical > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-medium">
                            <AlertTriangle size={12} />
                            {critical} critical
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No critical
                          </span>
                        )}
                        {warnings > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                            <Info size={12} />
                            {warnings} warnings
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No warnings
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Score */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-base font-bold border ${getScoreColor(score)}`}
                      >
                        {score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center">
                  <div className="md:col-span-4 min-w-0 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp
                        size={16}
                        className="text-slate-500 shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-slate-500 shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-medium text-slate-100 truncate">
                        {site.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {site.url}
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold border ${getScoreColor(score)}`}
                    >
                      {score}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    {critical > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 text-sm font-medium">
                        <AlertTriangle size={14} />
                        {critical} critical
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    {warnings > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-sm font-medium">
                        <Info size={14} />
                        {warnings} warnings
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded issue details */}
              {isExpanded && site.seoIssues && site.seoIssues.length > 0 && (
                <div className="px-4 pb-4 bg-[#0b0f19]/50">
                  <div className="md:ml-6 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-300">
                        Detected Issues
                      </h3>
                      <Link
                        href={`/dashboard/websites/${site.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
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
                          <p className="text-xs opacity-70 mt-0.5">
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
                  <div className="px-4 pb-4 bg-[#0b0f19]/50">
                    <div className="md:ml-6 p-3 text-sm text-slate-400 flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400" />
                      No SEO issues detected. Great job!
                    </div>
                  </div>
                )}
            </div>
          );
        })}

        {websites.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p>No websites found. Add a website to monitor SEO.</p>
          </div>
        )}
      </div>
    </div>
  );
}
