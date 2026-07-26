"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  ExternalLink,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { subscribeToWebsites, type Website } from "@/lib/firestore";

interface SSLStatus {
  website: Website;
  status: "valid" | "expiring" | "expired" | "unknown";
  daysLeft: number;
  expiryDate: string;
}

function getDaysUntilExpiry(sslExpiry: string | undefined): number {
  if (!sslExpiry) return 999;
  try {
    const expiry = new Date(sslExpiry);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

function getSSLStatus(website: Website): SSLStatus["status"] {
  if (website.ssl === "expired") return "expired";
  const daysLeft = getDaysUntilExpiry(website.sslExpiry);
  if (daysLeft < 0) return "expired";
  if (daysLeft < 30) return "expiring";
  if (website.ssl === "valid") return "valid";
  return "unknown";
}

export default function SSLMonitorPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const unsub = subscribeToWebsites((data) => {
      setWebsites(data);
      setLoading(false);
    });
    return () => unsub();
  }, [authReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage("Scanning SSL certificates...");
    try {
      const res = await fetch("/api/ssl-backfill", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setRefreshMessage(`Error: ${data.error}`);
      } else {
        setRefreshMessage(`Updated ${data.updated} sites! Refreshing...`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      setRefreshMessage(`Failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const sslStatuses: SSLStatus[] = websites
    .filter((w) => w.ssl !== "checking")
    .map((w) => {
      const daysLeft = getDaysUntilExpiry(w.sslExpiry);
      const status = getSSLStatus(w);
      return {
        website: w,
        status,
        daysLeft,
        expiryDate: w.sslExpiry
          ? new Date(w.sslExpiry).toLocaleDateString()
          : "Unknown",
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expired = sslStatuses.filter((s) => s.status === "expired");
  const expiring = sslStatuses.filter((s) => s.status === "expiring");
  const valid = sslStatuses.filter((s) => s.status === "valid");
  const unknown = sslStatuses.filter((s) => s.status === "unknown");

  const getIcon = (status: SSLStatus["status"]) => {
    if (status === "expired")
      return (
        <ShieldX
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#ef4444",
            flexShrink: 0,
          }}
        />
      );
    if (status === "expiring")
      return (
        <ShieldAlert
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#f59e0b",
            flexShrink: 0,
          }}
        />
      );
    if (status === "valid")
      return (
        <ShieldCheck
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#22c55e",
            flexShrink: 0,
          }}
        />
      );
    return (
      <Shield
        style={{
          width: "clamp(1rem, 2.5vw, 1.25rem)",
          height: "clamp(1rem, 2.5vw, 1.25rem)",
          color: "#94a3b8",
          flexShrink: 0,
        }}
      />
    );
  };

  const getBg = (status: SSLStatus["status"]) => {
    if (status === "expired") return "#fef2f2";
    if (status === "expiring") return "#fffbeb";
    if (status === "valid") return "#f0fdf4";
    return "#f1f5f9";
  };

  const getBorder = (status: SSLStatus["status"]) => {
    if (status === "expired") return "#fecaca";
    if (status === "expiring") return "#fde68a";
    if (status === "valid") return "#bbf7d0";
    return "#e2e8f0";
  };

  const getText = (status: SSLStatus["status"]) => {
    if (status === "expired") return "#b91c1c";
    if (status === "expiring") return "#b45309";
    if (status === "valid") return "#15803d";
    return "#64748b";
  };

  if (loading || !authReady) {
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
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            SSL Certificate Monitor
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            Track SSL expiry across all your websites
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding:
              "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
            backgroundColor: "#2563eb",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            fontWeight: "500",
            cursor: refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.6 : 1,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <RefreshCw
            style={{
              width: "clamp(0.875rem, 2vw, 1rem)",
              height: "clamp(0.875rem, 2vw, 1rem)",
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          {refreshing ? "Scanning..." : "Refresh SSL Data"}
        </button>
      </div>

      {refreshMessage && (
        <div
          style={{
            padding: "clamp(0.625rem, 2vw, 0.75rem) clamp(0.75rem, 3vw, 1rem)",
            borderRadius: "0.5rem",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
          }}
        >
          {refreshMessage}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        {[
          {
            label: "Total Monitored",
            value: sslStatuses.length,
            color: "#2563eb",
            bg: "#eff6ff",
          },
          {
            label: "Valid",
            value: valid.length,
            color: "#22c55e",
            bg: "#f0fdf4",
          },
          {
            label: "Expiring Soon",
            value: expiring.length,
            color: "#f59e0b",
            bg: "#fffbeb",
          },
          {
            label: "Expired",
            value: expired.length,
            color: "#ef4444",
            bg: "#fef2f2",
          },
          {
            label: "No Data",
            value: unknown.length,
            color: "#64748b",
            bg: "#f1f5f9",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              padding: "clamp(1rem, 3vw, 1.25rem)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                fontWeight: "700",
                color: stat.color,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "#94a3b8",
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* SSL List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sslStatuses.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              padding: "clamp(2rem, 8vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
              textAlign: "center",
            }}
          >
            <Shield
              style={{
                width: "clamp(2rem, 6vw, 3rem)",
                height: "clamp(2rem, 6vw, 3rem)",
                color: "#94a3b8",
                margin: "0 auto 1rem",
              }}
            />
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              }}
            >
              No SSL data yet
            </p>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              }}
            >
              Click "Refresh SSL Data" to scan your websites
            </p>
          </div>
        ) : (
          sslStatuses.map((ssl) => (
            <div
              key={ssl.website.id}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: `2px solid ${getBorder(ssl.status)}`,
                padding: "clamp(0.75rem, 2.5vw, 1.25rem)",
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.5rem, 2vw, 1rem)",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "clamp(2rem, 5vw, 2.5rem)",
                  height: "clamp(2rem, 5vw, 2.5rem)",
                  borderRadius: "0.75rem",
                  backgroundColor: getBg(ssl.status),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getIcon(ssl.status)}
              </div>

              <div style={{ flex: 1, minWidth: "min(100%, 200px)" }}>
                <p
                  style={{
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "600",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ssl.website.name}
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
                  {ssl.website.url}
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                  flexShrink: 0,
                  minWidth: "min(100%, 140px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <Clock
                    style={{
                      width: "clamp(0.75rem, 2vw, 0.875rem)",
                      height: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: getText(ssl.status),
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                      fontWeight: "600",
                      color: getText(ssl.status),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ssl.daysLeft >= 999
                      ? "No data"
                      : ssl.daysLeft < 0
                        ? `Expired ${Math.abs(ssl.daysLeft)} days ago`
                        : ssl.daysLeft === 0
                          ? "Expires today"
                          : ssl.daysLeft === 1
                            ? "1 day left"
                            : `${ssl.daysLeft} days left`}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    justifyContent: "flex-end",
                    marginTop: "0.25rem",
                  }}
                >
                  <Calendar
                    style={{
                      width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      color: "#94a3b8",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Expires: {ssl.expiryDate}
                  </span>
                </div>
              </div>

              <a
                href={ssl.website.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                  borderRadius: "0.5rem",
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ExternalLink
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                  }}
                />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
