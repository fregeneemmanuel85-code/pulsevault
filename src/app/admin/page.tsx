"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import {
  Activity,
  Users,
  Eye,
  LogIn,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";
import { getAuditLogs, getAdminStats, type AuditLog } from "@/lib/audit";
import { auth } from "@/lib/firebase-client";
import Link from "next/link";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<(AuditLog & { id: string })[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "login" | "page_view">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const db = getFirestore();
        const adminSnap = await getDoc(doc(db, "admins", user.uid));

        if (adminSnap.exists()) {
          setIsAdmin(true);
          await loadData();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[Admin] Auth check failed:", err);
        setError(err.message || "Failed to verify admin status");
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logData, statData] = await Promise.all([
        getAuditLogs({ limitCount: 200 }),
        getAdminStats(),
      ]);
      setLogs(logData as (AuditLog & { id: string })[]);
      setStats(statData);
    } catch (err: any) {
      console.error("[Admin] Load data failed:", err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.action !== filter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        log.email?.toLowerCase().includes(term) ||
        log.name?.toLowerCase().includes(term) ||
        log.page?.toLowerCase().includes(term) ||
        log.userId?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <AlertTriangle
          size={48}
          style={{ color: "#ef4444", margin: "0 auto 1rem" }}
        />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.5rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <AlertTriangle
          size={48}
          style={{ color: "#ef4444", margin: "0 auto 1rem" }}
        />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
          Access Denied
        </h1>
        <p style={{ color: "#64748b" }}>
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/dashboard"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            marginTop: "1rem",
            display: "inline-block",
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isAdmin === null || loading) {
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
          size={32}
          style={{ color: "#2563eb", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: "0 1rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Admin Dashboard
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Monitor all user activity across PulseVault
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Clock size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
          gap: "1rem",
        }}
      >
        {[
          {
            label: "Total Users",
            value: stats?.uniqueUsers || 0,
            icon: Users,
            color: "#2563eb",
            bg: "rgba(37,99,235,0.1)",
          },
          {
            label: "Active Today",
            value: stats?.activeToday || 0,
            icon: Activity,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.1)",
          },
          {
            label: "Active This Week",
            value: stats?.activeThisWeek || 0,
            icon: Users,
            color: "#8b5cf6",
            bg: "rgba(139,92,246,0.1)",
          },
          {
            label: "Total Logins",
            value: stats?.totalLogins || 0,
            icon: LogIn,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.1)",
          },
          {
            label: "Page Views",
            value: stats?.totalPageViews || 0,
            icon: Eye,
            color: "#ec4899",
            bg: "rgba(236,72,153,0.1)",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.75rem",
                    backgroundColor: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.2,
                    }}
                  >
                    {s.value}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {s.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["all", "login", "page_view"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "0.5rem",
                border: "1px solid",
                borderColor: filter === f ? "#2563eb" : "#e2e8f0",
                backgroundColor: filter === f ? "#2563eb" : "white",
                color: filter === f ? "white" : "#64748b",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {f === "page_view" ? "Page Views" : f + "s"}
            </button>
          ))}
        </div>
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: "200px",
            maxWidth: "300px",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search by email, name, page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              backgroundColor: "white",
              color: "#0f172a",
            }}
          />
        </div>
      </div>

      {/* Activity Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr
                style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}
              >
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  Page
                </th>
                <th
                  style={{
                    padding: "0.875rem 1rem",
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "3rem 1rem",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    No activity found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div>
                        <p
                          style={{
                            fontWeight: 500,
                            color: "#0f172a",
                            margin: 0,
                            fontSize: "0.8125rem",
                          }}
                        >
                          {log.name || "Anonymous"}
                        </p>
                        <p
                          style={{
                            color: "#94a3b8",
                            margin: 0,
                            fontSize: "0.75rem",
                          }}
                        >
                          {log.email || log.userId}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span
                        style={{
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor:
                            log.action === "login"
                              ? "#f0fdf4"
                              : log.action === "page_view"
                                ? "#eff6ff"
                                : "#fef2f2",
                          color:
                            log.action === "login"
                              ? "#15803d"
                              : log.action === "page_view"
                                ? "#2563eb"
                                : "#dc2626",
                          textTransform: "capitalize",
                        }}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.875rem 1rem",
                        color: "#475569",
                        fontSize: "0.8125rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {log.page || "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.875rem 1rem",
                        color: "#64748b",
                        fontSize: "0.8125rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
