"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Activity,
  Clock,
  Zap,
  Lock,
  Crown,
  Server,
} from "lucide-react";
import {
  subscribeToWebsite,
  subscribeToHealthHistory,
  subscribeToUserPlan,
  type Website,
  type HealthHistory,
  type UserPlan,
} from "@/lib/firestore";

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

export default function WebsiteHistoryPage() {
  const { id } = useParams() as { id: string };
  const [website, setWebsite] = useState<Website | null>(null);
  const [history, setHistory] = useState<HealthHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    const unsubPlan = subscribeToUserPlan((p) => {
      setPlan(p);
      setPlanLoading(false);
    });
    return () => unsubPlan();
  }, []);

  useEffect(() => {
    if (planLoading) return;
    const currentLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
    if (currentLevel < 2) {
      setLoading(false);
      return;
    }

    const unsubSite = subscribeToWebsite(id, (site) => {
      setWebsite(site);
      setLoading(false);
    });
    const unsubHistory = subscribeToHealthHistory(id, (records) => {
      setHistory(
        records.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
      );
    });
    return () => {
      unsubSite();
      unsubHistory();
    };
  }, [id, plan, planLoading]);

  const getTrend = (values: number[]) => {
    if (values.length < 2) return "stable";
    const recent = values.slice(0, 5);
    const older = values.slice(5, 10);
    if (recent.length === 0 || older.length === 0) return "stable";
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (recentAvg > olderAvg + 5) return "up";
    if (recentAvg < olderAvg - 5) return "down";
    return "stable";
  };

  const healthValues = history.map((h) => h.health);
  const loadTimeValues = history.map((h) => h.loadTime);
  const brokenLinkValues = history.map((h) => h.brokenLinks);

  const healthTrend = getTrend(healthValues);
  const loadTrend = getTrend(loadTimeValues);
  const linkTrend = getTrend(brokenLinkValues);

  const getTrendIcon = (trend: string) => {
    if (trend === "up")
      return (
        <TrendingUp
          style={{
            width: "clamp(0.875rem, 2vw, 1rem)",
            height: "clamp(0.875rem, 2vw, 1rem)",
            color: "#22c55e",
            flexShrink: 0,
          }}
        />
      );
    if (trend === "down")
      return (
        <TrendingDown
          style={{
            width: "clamp(0.875rem, 2vw, 1rem)",
            height: "clamp(0.875rem, 2vw, 1rem)",
            color: "#ef4444",
            flexShrink: 0,
          }}
        />
      );
    return (
      <Minus
        style={{
          width: "clamp(0.875rem, 2vw, 1rem)",
          height: "clamp(0.875rem, 2vw, 1rem)",
          color: "#94a3b8",
          flexShrink: 0,
        }}
      />
    );
  };

  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2)
      return (
        <span
          style={{
            color: "#94a3b8",
            fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
          }}
        >
          No data
        </span>
      );
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 120;
    const height = 40;
    const points = data
      .slice(0, 20)
      .reverse()
      .map((val, i) => {
        const x = (i / (Math.min(data.length, 20) - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg
        width={width}
        height={height}
        style={{ overflow: "visible", maxWidth: "100%" }}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (!planLoading) {
    const currentLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
    if (currentLevel < 2) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 3vw, 1.5rem)",
            padding: "0 clamp(0.5rem, 2vw, 1rem)",
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
              href={`/dashboard/websites/${id}`}
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
                Health History
              </h1>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                }}
              >
                Performance trends & downtime tracking
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(0.75rem, 2vw, 1rem)",
            }}
          >
            <div
              style={{
                width: "clamp(3rem, 8vw, 4rem)",
                height: "clamp(3rem, 8vw, 4rem)",
                borderRadius: "1rem",
                backgroundColor: "rgba(139,92,246,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock
                style={{
                  width: "clamp(1.5rem, 4vw, 2rem)",
                  height: "clamp(1.5rem, 4vw, 2rem)",
                  color: "#8b5cf6",
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
              Health History is a Pro Feature
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#64748b",
                maxWidth: "24rem",
                lineHeight: 1.6,
              }}
            >
              Performance trends, health history tracking, downtime history,
              error trends, and load time insights are available on the Pro plan
              and above.
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
                    "clamp(0.5rem, 2vw, 0.625rem) clamp(1rem, 3vw, 1.5rem)",
                  backgroundColor: "#8b5cf6",
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
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                  }}
                />
                Upgrade to Pro
              </Link>
            </div>
            <p
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "#94a3b8",
              }}
            >
              Starting at NGN 12,000/month
            </p>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <Loader2
          style={{
            width: "2rem",
            height: "2rem",
            color: "#2563eb",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!website) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "clamp(2rem, 8vw, 4rem) clamp(1rem, 4vw, 1.5rem)",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "clamp(0.875rem, 2vw, 1rem)" }}>
          Website not found
        </p>
        <Link
          href="/dashboard/websites"
          style={{
            color: "#2563eb",
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
          }}
        >
          ← Back to websites
        </Link>
      </div>
    );
  }

  const scan = website.scanResults;
  const techStack = scan?.techStack?.detected || [];
  const plugins = scan?.plugins || [];
  const forms = scan?.forms || [];
  const secHeaders = website.securityHeaders || {
    hsts: false,
    xFrame: false,
    xContentType: false,
    csp: false,
  };
  const consoleErrors = scan?.consoleErrors || [];
  const runtimeErrors = scan?.runtimeErrors || [];
  const redirectChain = website.redirectChain || [];

  const secHeaderList = [
    { label: "HSTS", on: secHeaders.hsts },
    { label: "X-Frame", on: secHeaders.xFrame },
    { label: "X-Content-Type", on: secHeaders.xContentType },
    { label: "CSP", on: secHeaders.csp },
  ];
  const secPass = secHeaderList.filter((h) => h.on).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(1rem, 3vw, 1.5rem)",
        padding: "0 clamp(0.5rem, 2vw, 1rem)",
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
          href={`/dashboard/websites/${id}`}
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
            Health History
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            {website.name} — Performance trends & downtime
          </p>
        </div>
      </div>

      {/* Trend Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        {[
          {
            label: "Health Score",
            icon: Activity,
            iconColor: "#8b5cf6",
            trend: healthTrend,
            value: `${healthValues[0] || 0}%`,
            data: healthValues,
            sparkColor: "#8b5cf6",
          },
          {
            label: "Load Time",
            icon: Clock,
            iconColor: "#f59e0b",
            trend:
              loadTrend === "down"
                ? "up"
                : loadTrend === "up"
                  ? "down"
                  : "stable",
            value: `${loadTimeValues[0] || 0}ms`,
            data: loadTimeValues,
            sparkColor: "#f59e0b",
          },
          {
            label: "Broken Links",
            icon: Zap,
            iconColor: "#ef4444",
            trend:
              linkTrend === "down"
                ? "up"
                : linkTrend === "up"
                  ? "down"
                  : "stable",
            value: `${brokenLinkValues[0] || 0}`,
            data: brokenLinkValues,
            sparkColor: "#ef4444",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              padding: "clamp(1rem, 3vw, 1.25rem)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <card.icon
                  style={{
                    width: "clamp(1rem, 2.5vw, 1.125rem)",
                    height: "clamp(1rem, 2.5vw, 1.125rem)",
                    color: card.iconColor,
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
                  {card.label}
                </span>
              </div>
              {getTrendIcon(card.trend)}
            </div>
            <Sparkline data={card.data} color={card.sparkColor} />
            <p
              style={{
                fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
                fontWeight: "700",
                color: "#0f172a",
                marginTop: "0.5rem",
              }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ─── CURRENT FEATURE SETUP — TABLE ─── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          overflowX: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Server
            style={{
              width: "clamp(1rem, 2.5vw, 1.125rem)",
              height: "clamp(1rem, 2.5vw, 1.125rem)",
              color: "#2563eb",
            }}
          />
          Current Feature Setup
        </h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
            minWidth: "480px",
          }}
        >
          <thead>
            <tr
              style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}
            >
              <th
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#64748b",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  letterSpacing: "0.03em",
                }}
              >
                Feature
              </th>
              <th
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#64748b",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  letterSpacing: "0.03em",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#64748b",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  letterSpacing: "0.03em",
                }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Tech Stack */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Tech Stack
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    backgroundColor: "#e0e7ff",
                    color: "#4338ca",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  }}
                >
                  {techStack.length} detected
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  wordBreak: "break-word",
                }}
              >
                {techStack.length === 0
                  ? "—"
                  : techStack
                      .slice(0, 8)
                      .map((t: any) => t.name)
                      .join(", ")}
                {techStack.length > 8 && (
                  <span style={{ color: "#94a3b8" }}>
                    {" "}
                    +{techStack.length - 8} more
                  </span>
                )}
              </td>
            </tr>

            {/* SSL */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                SSL
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      website.ssl === "valid"
                        ? "#f0fdf4"
                        : website.ssl === "expiring"
                          ? "#fffbeb"
                          : "#fef2f2",
                    color:
                      website.ssl === "valid"
                        ? "#15803d"
                        : website.ssl === "expiring"
                          ? "#b45309"
                          : "#dc2626",
                  }}
                >
                  {website.ssl === "valid"
                    ? "Valid"
                    : website.ssl === "expiring"
                      ? "Expiring"
                      : "Expired"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontFamily: "monospace",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.sslDaysLeft != null
                  ? `${website.sslDaysLeft} days left`
                  : "—"}
                {website.sslExpiry &&
                  ` · Expires ${new Date(website.sslExpiry).toLocaleDateString()}`}
              </td>
            </tr>

            {/* DNS */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                DNS
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: website.dnsResolved
                      ? "#f0fdf4"
                      : "#fef2f2",
                    color: website.dnsResolved ? "#15803d" : "#dc2626",
                  }}
                >
                  {website.dnsResolved ? "Resolved" : "Failed"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontFamily: "monospace",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.dnsIp || "—"}
              </td>
            </tr>

            {/* Security Headers */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Security Headers
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: secPass === 4 ? "#f0fdf4" : "#fffbeb",
                    color: secPass === 4 ? "#15803d" : "#b45309",
                  }}
                >
                  {secPass}/4
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {secHeaderList
                  .filter((h) => h.on)
                  .map((h) => h.label)
                  .join(", ") || "None"}
                {secPass < 4 && secPass > 0 && " · "}
                {secHeaderList
                  .filter((h) => !h.on)
                  .map((h) => h.label)
                  .join(", ")}
              </td>
            </tr>

            {/* Links */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Links
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      (website.brokenLinks || 0) > 0 ? "#fef2f2" : "#f0fdf4",
                    color:
                      (website.brokenLinks || 0) > 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {(website.brokenLinks || 0) > 0 ? "Issues" : "Clean"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.brokenLinks || 0} broken · {website.totalLinks || 0}{" "}
                total
                {(website.protectedLinks || 0) > 0 &&
                  ` · ${website.protectedLinks} protected`}
              </td>
            </tr>

            {/* Plugins */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Plugins
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      (website.brokenPlugins || 0) > 0 ? "#fef2f2" : "#f0fdf4",
                    color:
                      (website.brokenPlugins || 0) > 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {(website.brokenPlugins || 0) > 0
                    ? `${website.brokenPlugins} broken`
                    : "All OK"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  wordBreak: "break-word",
                }}
              >
                {plugins.length === 0
                  ? "—"
                  : plugins
                      .slice(0, 6)
                      .map((p: any) => `${p.name} (${p.status})`)
                      .join(", ")}
                {plugins.length > 6 && (
                  <span style={{ color: "#94a3b8" }}>
                    {" "}
                    +{plugins.length - 6} more
                  </span>
                )}
              </td>
            </tr>

            {/* Forms */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Forms
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: website.formsWorking
                      ? "#f0fdf4"
                      : "#fef2f2",
                    color: website.formsWorking ? "#15803d" : "#dc2626",
                  }}
                >
                  {website.formsWorking ? "Working" : "Broken"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.totalForms || 0} detected
              </td>
            </tr>

            {/* JS Errors */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                JS Errors
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      (website.jsErrors || 0) > 0 ? "#fef2f2" : "#f0fdf4",
                    color: (website.jsErrors || 0) > 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {website.jsErrors || 0}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {(website.jsErrors || 0) > 0
                  ? "Errors found in scripts"
                  : "No inline errors detected"}
              </td>
            </tr>

            {/* Mixed Content */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Mixed Content
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: website.mixedContent
                      ? "#fef2f2"
                      : "#f0fdf4",
                    color: website.mixedContent ? "#dc2626" : "#15803d",
                  }}
                >
                  {website.mixedContent ? "Detected" : "Clean"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.mixedContent
                  ? "Insecure HTTP resources on HTTPS page"
                  : "All resources served over HTTPS"}
              </td>
            </tr>

            {/* SPA Crashes */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                SPA Crashes
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: website.spaCrashes ? "#fef2f2" : "#f0fdf4",
                    color: website.spaCrashes ? "#dc2626" : "#15803d",
                  }}
                >
                  {website.spaCrashes ? "Detected" : "None"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                }}
              >
                {website.spaCrashes
                  ? "Possible framework hydration failure"
                  : "SPA rendering normally"}
              </td>
            </tr>

            {/* Runtime Errors */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Runtime Errors
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      (runtimeErrors?.length || 0) > 0 ? "#fef2f2" : "#f0fdf4",
                    color:
                      (runtimeErrors?.length || 0) > 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {runtimeErrors?.length || 0}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  wordBreak: "break-word",
                }}
              >
                {runtimeErrors
                  ?.slice(0, 3)
                  .map((e: any) => e.message)
                  .join(" · ") || "—"}
              </td>
            </tr>

            {/* Console Errors */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Console Errors
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      (consoleErrors?.length || 0) > 0 ? "#fef2f2" : "#f0fdf4",
                    color:
                      (consoleErrors?.length || 0) > 0 ? "#dc2626" : "#15803d",
                  }}
                >
                  {consoleErrors?.length || 0}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  wordBreak: "break-word",
                }}
              >
                {consoleErrors?.slice(0, 3).join(" · ") || "—"}
              </td>
            </tr>

            {/* Redirects */}
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Redirects
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor:
                      redirectChain.length > 0 ? "#fffbeb" : "#f0fdf4",
                    color: redirectChain.length > 0 ? "#b45309" : "#15803d",
                  }}
                >
                  {redirectChain.length > 0
                    ? `${redirectChain.length} hops`
                    : "None"}
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  wordBreak: "break-word",
                }}
              >
                {redirectChain.slice(0, 3).join(" → ") || "Direct response"}
              </td>
            </tr>

            {/* Performance */}
            <tr>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  fontWeight: "500",
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                Performance
              </td>
              <td style={{ padding: "0.625rem 0.5rem", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontWeight: "600",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                  }}
                >
                  {website.performanceScore ?? 0}/100
                </span>
              </td>
              <td
                style={{
                  padding: "0.625rem 0.5rem",
                  color: "#475569",
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  fontFamily: "monospace",
                }}
              >
                {website.loadTime || 0}ms load ·{" "}
                {(() => {
                  const bytes = website.pageSize || 0;
                  if (bytes === 0) return "0 B";
                  const k = 1024;
                  const sizes = ["B", "KB", "MB"];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return (
                    parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
                    " " +
                    sizes[i]
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* History Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          overflowX: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: "1rem",
          }}
        >
          Check History
        </h2>
        {history.length === 0 ? (
          <p
            style={{
              color: "#94a3b8",
              textAlign: "center",
              padding: "2rem",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
            }}
          >
            No history yet. Run a scan to start tracking.
          </p>
        ) : (
          <div style={{ overflowX: "auto", minWidth: 0 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "500px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {[
                    "Time",
                    "Health",
                    "Status",
                    "Load",
                    "Links",
                    "JS Errors",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                        fontWeight: "600",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((record) => (
                  <tr
                    key={record.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        fontWeight: "600",
                        color:
                          record.health > 80
                            ? "#22c55e"
                            : record.health > 50
                              ? "#f59e0b"
                              : "#ef4444",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.health}%
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor:
                            record.status === "healthy"
                              ? "#f0fdf4"
                              : record.status === "offline"
                                ? "#fef2f2"
                                : "#fffbeb",
                          color:
                            record.status === "healthy"
                              ? "#15803d"
                              : record.status === "offline"
                                ? "#dc2626"
                                : "#b45309",
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.loadTime}ms
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: record.brokenLinks > 0 ? "#ef4444" : "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.brokenLinks}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: record.jsErrors > 0 ? "#ef4444" : "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.jsErrors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
