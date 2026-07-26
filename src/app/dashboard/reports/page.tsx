"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import {
  Mail,
  Calendar,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Send,
  Lock,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { subscribeToUserPlan, type UserPlan } from "@/lib/firestore";

interface SummaryData {
  period: string;
  periodRange: string;
  generatedAt: string;
  totalSites: number;
  healthySites: number;
  warningSites: number;
  offlineSites: number;
  averageHealth: number;
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  sites: {
    id: string;
    name: string;
    url: string;
    status: string;
    health: number;
    uptime: string;
    incidents: number;
    lastChecked: string;
  }[];
}

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

// Donut Chart Component
function DonutChart({
  percentage,
  color,
  size = 100,
  strokeWidth = 8,
  children,
}: {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Multi-segment donut for sites status
function SitesDonut({
  healthy,
  warning,
  offline,
  total,
  size = 100,
  strokeWidth = 8,
}: {
  healthy: number;
  warning: number;
  offline: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const healthyPct = total > 0 ? (healthy / total) * 100 : 0;
  const warningPct = total > 0 ? (warning / total) * 100 : 0;
  const offlinePct = total > 0 ? (offline / total) * 100 : 0;

  const healthyOffset = circumference - (healthyPct / 100) * circumference;
  const warningOffset =
    circumference - ((healthyPct + warningPct) / 100) * circumference;
  const offlineOffset =
    circumference -
    ((healthyPct + warningPct + offlinePct) / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {healthyPct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={healthyOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {warningPct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={warningOffset}
            strokeLinecap="round"
            transform={`rotate(${-90 + (healthyPct / 100) * 360} ${size / 2} ${size / 2})`}
          />
        )}
        {offlinePct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offlineOffset}
            strokeLinecap="round"
            transform={`rotate(${-90 + ((healthyPct + warningPct) / 100) * 360} ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "clamp(1rem, 3vw, 1.25rem)",
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          {total}
        </span>
      </div>
    </div>
  );
}

// Multi-segment donut for incidents
function IncidentsDonut({
  open,
  resolved,
  size = 100,
  strokeWidth = 8,
}: {
  open: number;
  resolved: number;
  size?: number;
  strokeWidth?: number;
}) {
  const total = open + resolved;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const openPct = total > 0 ? (open / total) * 100 : 0;
  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;

  const openOffset = circumference - (openPct / 100) * circumference;
  const resolvedOffset =
    circumference - ((openPct + resolvedPct) / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {openPct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={openOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {resolvedPct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={resolvedOffset}
            strokeLinecap="round"
            transform={`rotate(${-90 + (openPct / 100) * 360} ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "clamp(1rem, 3vw, 1.25rem)",
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          {total}
        </span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [emailStatus, setEmailStatus] = useState<string>("");
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    const unsubPlan = subscribeToUserPlan((p) => {
      setPlan(p);
      setPlanLoading(false);
    });
    return () => unsubPlan();
  }, []);

  const fetchSummary = async (p: "daily" | "weekly") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summary?period=${p}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const sendEmail = async () => {
    if (!summary) return;
    setSending(true);
    setEmailStatus("");

    try {
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const result = await res.json();
      if (result.success) {
        setEmailStatus("✅ " + result.message);
      } else {
        setEmailStatus("❌ Failed: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      setEmailStatus("❌ Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (planLoading) return;
    const currentLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
    if (currentLevel < 3) {
      setLoading(false);
      return;
    }
    fetchSummary(period);
  }, [period, plan, planLoading]);

  const getStatusColor = (status: string) => {
    if (status === "healthy")
      return { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle2 };
    if (status === "offline")
      return { bg: "#fef2f2", text: "#b91c1c", icon: XCircle };
    return { bg: "#fffbeb", text: "#b45309", icon: AlertTriangle };
  };

  // ─── UPGRADE PROMPT FOR FREE + STARTER + PRO ───
  if (!planLoading) {
    const currentLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
    if (currentLevel < 3) {
      return (
        <>
          <Head>
            <title>Reports - PulseVault</title>
            <meta
              name="description"
              content="View daily and weekly monitoring reports for your websites."
            />
          </Head>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(1rem, 3vw, 1.5rem)",
              padding: "0 clamp(0.5rem, 2vw, 1rem)",
              width: "100%",
              maxWidth: "100%",
              overflowX: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.5rem, 2vw, 0.75rem)",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/dashboard"
                style={{
                  color: "#64748b",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <ArrowLeft
                  style={{
                    width: "clamp(1rem, 2.5vw, 1.25rem)",
                    height: "clamp(1rem, 2.5vw, 1.25rem)",
                  }}
                />
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  Reports & Summaries
                </h1>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  }}
                >
                  Daily and weekly monitoring reports
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "clamp(2rem, 8vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "clamp(0.75rem, 2vw, 1rem)",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "clamp(3rem, 8vw, 4rem)",
                  height: "clamp(3rem, 8vw, 4rem)",
                  borderRadius: "1rem",
                  backgroundColor: "rgba(217,119,6,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Lock
                  style={{
                    width: "clamp(1.5rem, 4vw, 2rem)",
                    height: "clamp(1.5rem, 4vw, 2rem)",
                    color: "#d97706",
                  }}
                />
              </div>
              <h2
                style={{
                  fontSize: "clamp(1rem, 3vw, 1.25rem)",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                Reports & Summaries are a Business Feature
              </h2>
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "#64748b",
                  maxWidth: "24rem",
                  lineHeight: 1.6,
                }}
              >
                Advanced reporting, daily/weekly summaries, email reports, and
                multi-client management are available on the Business plan only.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Link
                  href="/dashboard/billing"
                  style={{
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.5rem)",
                    backgroundColor: "#d97706",
                    color: "white",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Crown
                    style={{
                      width: "clamp(0.75rem, 2vw, 1rem)",
                      height: "clamp(0.75rem, 2vw, 1rem)",
                    }}
                  />
                  Upgrade to Business
                </Link>
              </div>
              <p
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#94a3b8",
                }}
              >
                Starting at NGN 22,500/month
              </p>
            </div>
          </div>
        </>
      );
    }
  }

  return (
    <>
      <Head>
        <title>Reports - PulseVault</title>
        <meta
          name="description"
          content="View daily and weekly monitoring reports for your websites."
        />
      </Head>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 3vw, 1.5rem)",
          padding: "0 clamp(0.5rem, 2vw, 1rem)",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.5rem, 2vw, 0.75rem)",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: "#64748b", textDecoration: "none", flexShrink: 0 }}
          >
            <ArrowLeft
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
              }}
            />
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                fontWeight: "700",
                color: "#0f172a",
              }}
            >
              Reports & Summaries
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              Daily and weekly monitoring reports
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(0.75rem, 2vw, 1rem)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Calendar
                style={{
                  width: "clamp(1rem, 2.5vw, 1.25rem)",
                  height: "clamp(1rem, 2.5vw, 1.25rem)",
                  color: "#2563eb",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  color: "#0f172a",
                }}
              >
                Report Period:
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["daily", "weekly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding:
                      "clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)",
                    borderRadius: "0.5rem",
                    border: "1px solid #e2e8f0",
                    backgroundColor: period === p ? "#2563eb" : "white",
                    color: period === p ? "white" : "#475569",
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={sendEmail}
              disabled={sending || !summary}
              style={{
                marginLeft: "auto",
                padding:
                  "clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                fontWeight: "500",
                cursor: sending || !summary ? "not-allowed" : "pointer",
                opacity: sending || !summary ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                whiteSpace: "nowrap",
              }}
            >
              <Send
                style={{
                  width: "clamp(0.75rem, 2vw, 1rem)",
                  height: "clamp(0.75rem, 2vw, 1rem)",
                }}
              />
              {sending ? "Sending..." : "Email Report"}
            </button>
          </div>
          {emailStatus && (
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: emailStatus.includes("✅") ? "#15803d" : "#dc2626",
                wordBreak: "break-word",
              }}
            >
              {emailStatus}
            </p>
          )}
        </div>

        {/* Summary Donut Charts */}
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "clamp(2rem, 8vw, 3rem)",
            }}
          >
            <Loader2
              style={{
                width: "clamp(1.5rem, 4vw, 2rem)",
                height: "clamp(1.5rem, 4vw, 2rem)",
                color: "#2563eb",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : summary ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                gap: "clamp(0.75rem, 2vw, 1rem)",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Overall Health */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "clamp(1rem, 3vw, 1.25rem)",
                  textAlign: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Overall Health
                </p>
                <DonutChart
                  percentage={summary.averageHealth}
                  color="#8b5cf6"
                  size={100}
                  strokeWidth={8}
                >
                  <span
                    style={{
                      fontSize: "clamp(1rem, 3vw, 1.25rem)",
                      fontWeight: "700",
                      color: "#0f172a",
                    }}
                  >
                    {summary.averageHealth}%
                  </span>
                </DonutChart>
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    marginTop: "0.5rem",
                  }}
                >
                  {summary.periodRange}
                </p>
              </div>

              {/* Sites Status */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "clamp(1rem, 3vw, 1.25rem)",
                  textAlign: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Sites Status
                </p>
                <SitesDonut
                  healthy={summary.healthySites}
                  warning={summary.warningSites}
                  offline={summary.offlineSites}
                  total={summary.totalSites}
                  size={100}
                  strokeWidth={8}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "clamp(0.375rem, 1.5vw, 0.75rem)",
                    marginTop: "0.5rem",
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#22c55e", whiteSpace: "nowrap" }}>
                    ● {summary.healthySites} Healthy
                  </span>
                  <span style={{ color: "#f59e0b", whiteSpace: "nowrap" }}>
                    ● {summary.warningSites} Warn
                  </span>
                  {summary.offlineSites > 0 && (
                    <span style={{ color: "#ef4444", whiteSpace: "nowrap" }}>
                      ● {summary.offlineSites} Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Incidents */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "clamp(1rem, 3vw, 1.25rem)",
                  textAlign: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Incidents
                </p>
                <IncidentsDonut
                  open={summary.openIncidents}
                  resolved={summary.resolvedIncidents}
                  size={100}
                  strokeWidth={8}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "clamp(0.375rem, 1.5vw, 0.75rem)",
                    marginTop: "0.5rem",
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#ef4444", whiteSpace: "nowrap" }}>
                    ● {summary.openIncidents} Open
                  </span>
                  <span style={{ color: "#22c55e", whiteSpace: "nowrap" }}>
                    ● {summary.resolvedIncidents} Resolved
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    marginTop: "0.5rem",
                  }}
                >
                  {summary.period} total
                </p>
              </div>

              {/* Total Sites */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  padding: "clamp(1rem, 3vw, 1.25rem)",
                  textAlign: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Total Sites
                </p>
                <DonutChart
                  percentage={summary.totalSites > 0 ? 100 : 0}
                  color="#2563eb"
                  size={100}
                  strokeWidth={8}
                >
                  <span
                    style={{
                      fontSize: "clamp(1rem, 3vw, 1.25rem)",
                      fontWeight: "700",
                      color: "#0f172a",
                    }}
                  >
                    {summary.totalSites}
                  </span>
                </DonutChart>
                <p
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#94a3b8",
                    marginTop: "0.5rem",
                  }}
                >
                  {summary.totalSites} of {summary.totalSites} active
                </p>
              </div>
            </div>

            {/* Site Breakdown */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "clamp(1rem, 3vw, 1.5rem)",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(1rem, 3vw, 1.125rem)",
                  fontWeight: "600",
                  color: "#0f172a",
                  marginBottom: "1rem",
                }}
              >
                Site Breakdown
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {summary.sites.map((site, idx) => {
                  const status = getStatusColor(site.status);
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(0.5rem, 2vw, 1rem)",
                        padding: "clamp(0.5rem, 2vw, 0.75rem)",
                        borderRadius: "0.75rem",
                        border: "1px solid #f1f5f9",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: "clamp(2.25rem, 5vw, 2.75rem)",
                          height: "clamp(2.25rem, 5vw, 2.75rem)",
                          borderRadius: "0.75rem",
                          backgroundColor: status.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <StatusIcon
                          style={{
                            width: "clamp(1rem, 2.5vw, 1.125rem)",
                            height: "clamp(1rem, 2.5vw, 1.125rem)",
                            color: status.text,
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: "min(100%, 150px)" }}>
                        <p
                          style={{
                            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                            fontWeight: "500",
                            color: "#0f172a",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {site.name}
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                            color: "#94a3b8",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {site.url}
                        </p>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          flexShrink: 0,
                          minWidth: "fit-content",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                            fontWeight: "600",
                            color: status.text,
                          }}
                        >
                          {site.health}%
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            color: "#94a3b8",
                          }}
                        >
                          {site.incidents} incidents
                        </p>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <DonutChart
                          percentage={site.health}
                          color={status.text}
                          size={48}
                          strokeWidth={6}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated At */}
            <p
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              Report generated at{" "}
              {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "clamp(2rem, 8vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <Mail
              style={{
                width: "clamp(2rem, 6vw, 2.5rem)",
                height: "clamp(2rem, 6vw, 2.5rem)",
                color: "#94a3b8",
                margin: "0 auto 0.75rem",
              }}
            />
            <p
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              No data available
            </p>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#64748b",
              }}
            >
              Upgrade to Business plan to access reports
            </p>
          </div>
        )}
      </div>
    </>
  );
}
