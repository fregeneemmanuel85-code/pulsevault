"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Bell,
  Zap,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Filter,
  Clock,
  Timer,
} from "lucide-react";
import Link from "next/link";
import {
  subscribeToAlerts,
  resolveAlert,
  deleteAlert,
  cleanupExpiredAlerts,
  type Alert,
} from "@/lib/firestore";

// ─── COUNTDOWN TIMER COMPONENT ───
function DeleteCountdown({ deleteAt }: { deleteAt: string | undefined }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!deleteAt) {
      setTimeLeft("");
      return;
    }

    const targetDate = new Date(deleteAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft("Expiring soon");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [deleteAt]);

  if (!deleteAt || !timeLeft) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
        color: "#94a3b8",
        whiteSpace: "nowrap",
      }}
    >
      <Timer
        style={{
          width: "clamp(0.625rem, 1.5vw, 0.75rem)",
          height: "clamp(0.625rem, 1.5vw, 0.75rem)",
        }}
      />
      Auto-deletes in {timeLeft}
    </span>
  );
}

// ─── EXPIRY BANNER COMPONENT ───
function ExpiryBanner({ daysLeft }: { daysLeft: number }) {
  if (daysLeft > 7) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.375rem 0.75rem",
        borderRadius: "0.375rem",
        backgroundColor: daysLeft <= 1 ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${daysLeft <= 1 ? "#fecaca" : "#fde68a"}`,
        marginTop: "0.5rem",
      }}
    >
      <Clock
        style={{
          width: "clamp(0.75rem, 2vw, 0.875rem)",
          height: "clamp(0.75rem, 2vw, 0.875rem)",
          color: daysLeft <= 1 ? "#dc2626" : "#b45309",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
          color: daysLeft <= 1 ? "#dc2626" : "#b45309",
          fontWeight: 500,
        }}
      >
        {daysLeft <= 1
          ? "⚠️ This alert will be deleted within 24 hours"
          : `⏰ This alert auto-deletes in ${daysLeft} days`}
      </span>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [authReady, setAuthReady] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [cleanedCount, setCleanedCount] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    // ─── AUTO-CLEANUP EXPIRED ALERTS ON PAGE LOAD ───
    cleanupExpiredAlerts()
      .then((deleted) => {
        if (deleted > 0) {
          console.log(`[AlertsPage] Auto-deleted ${deleted} expired alerts`);
          setCleanedCount(deleted);
        }
      })
      .catch(console.error);

    const unsub = subscribeToAlerts((data) => {
      console.log("[AlertsPage] Received alerts:", data.length);
      setAlerts(
        data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setLoading(false);
    });
    return () => unsub();
  }, [authReady]);

  const handleResolve = async (id: string) => {
    if (!id || typeof id !== "string") {
      console.error("[handleResolve] Invalid ID:", id);
      alert("Cannot resolve: invalid alert ID");
      return;
    }
    setResolvingId(id);
    try {
      await resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "resolved", resolvedAt: new Date().toISOString() }
            : a,
        ),
      );
    } catch (err: any) {
      console.error("Failed to resolve alert:", err.message);
      alert("Failed to resolve alert: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    console.log("[handleDelete] Called with id:", id, "type:", typeof id);
    if (!id || typeof id !== "string") {
      console.error("[handleDelete] Invalid ID:", id);
      alert("Cannot delete: invalid alert ID");
      return;
    }
    if (!confirm("Delete this alert permanently?")) return;
    setDeletingId(id);
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error("Failed to delete alert:", err.message);
      alert("Failed to delete alert: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  const getIcon = (severity: string) => {
    if (severity === "critical")
      return (
        <Zap
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
          }}
        />
      );
    if (severity === "warning")
      return (
        <AlertTriangle
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
          }}
        />
      );
    return (
      <Info
        style={{
          width: "clamp(1rem, 2.5vw, 1.25rem)",
          height: "clamp(1rem, 2.5vw, 1.25rem)",
        }}
      />
    );
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical")
      return { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" };
    if (severity === "warning")
      return { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" };
    return { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" };
  };

  const getDaysUntilDelete = (deleteAt: string | undefined): number => {
    if (!deleteAt) return 30;
    const diff = new Date(deleteAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
          style={{ color: "#94a3b8", textDecoration: "none", flexShrink: 0 }}
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
            Alerts
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            {alerts.filter((a) => a.status === "open").length} open,{" "}
            {alerts.filter((a) => a.status === "resolved").length} resolved
          </p>
        </div>
      </div>

      {/* Auto-cleanup banner */}
      {cleanedCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
            fontWeight: 500,
          }}
        >
          <CheckCircle2 style={{ width: "1rem", height: "1rem" }} />
          Auto-cleaned {cleanedCount} expired alert{cleanedCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Global Notice Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "clamp(0.75rem, 2vw, 1rem)",
          borderRadius: "0.75rem",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
        }}
      >
        <Clock
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#2563eb",
            flexShrink: 0,
          }}
        />
        <p
          style={{
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            color: "#1e40af",
            margin: 0,
          }}
        >
          Alerts are automatically deleted after 30 days to keep your dashboard
          clean.
        </p>
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: "clamp(0.5rem, 2vw, 0.75rem)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter
            style={{
              width: "clamp(0.875rem, 2vw, 1rem)",
              height: "clamp(0.875rem, 2vw, 1rem)",
              color: "#94a3b8",
              flexShrink: 0,
            }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              padding: "clamp(0.5rem, 2vw, 0.625rem) clamp(0.5rem, 2vw, 1rem)",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              backgroundColor: "white",
              cursor: "pointer",
              color: "#0f172a",
              minWidth: "fit-content",
            }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(2rem, 8vw, 4rem) clamp(1rem, 4vw, 1.5rem)",
            textAlign: "center",
          }}
        >
          <Bell
            style={{
              width: "clamp(2rem, 6vw, 3rem)",
              height: "clamp(2rem, 6vw, 3rem)",
              color: "#94a3b8",
              margin: "0 auto 1rem",
            }}
          />
          <h2
            style={{
              fontSize: "clamp(1rem, 3vw, 1.125rem)",
              fontWeight: "600",
              color: "#0f172a",
            }}
          >
            No alerts found
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              marginTop: "0.5rem",
            }}
          >
            {alerts.length === 0
              ? "Alerts appear when a scanner finds issues. Healthy sites don't generate alerts."
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {filtered.map((alert, index) => {
            const c = getSeverityColor(alert.severity);
            const Icon = getIcon(alert.severity);
            const isDeleting = deletingId === alert.id;
            const isResolving = resolvingId === alert.id;
            const daysUntilDelete = getDaysUntilDelete(alert.deleteAt);

            if (!alert.id) {
              console.warn("[AlertsPage] Skipping alert without ID:", alert);
              return null;
            }

            return (
              <div
                key={alert.id || `alert-${index}`}
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding:
                    "clamp(0.75rem, 2.5vw, 1rem) clamp(0.75rem, 3vw, 1.25rem)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.5rem, 2vw, 0.75rem)",
                  opacity: isDeleting || isResolving ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* Top Row: Icon + Content + Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "clamp(0.5rem, 2vw, 0.75rem)",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "clamp(2rem, 5vw, 2.5rem)",
                      height: "clamp(2rem, 5vw, 2.5rem)",
                      borderRadius: "0.75rem",
                      backgroundColor: c.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c.text,
                      flexShrink: 0,
                    }}
                  >
                    {Icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "600",
                          color: "#0f172a",
                          wordBreak: "break-word",
                        }}
                      >
                        {alert.type}
                      </span>
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor: c.bg,
                          color: c.text,
                          textTransform: "uppercase",
                          flexShrink: 0,
                        }}
                      >
                        {alert.severity}
                      </span>
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor:
                            alert.status === "open" ? "#fef2f2" : "#f0fdf4",
                          color:
                            alert.status === "open" ? "#dc2626" : "#15803d",
                          flexShrink: 0,
                        }}
                      >
                        {alert.status}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                        color: "#475569",
                        marginTop: "0.25rem",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {alert.message}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.25rem",
                      flexShrink: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    {alert.status === "open" && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        title="Resolve"
                        disabled={isDeleting || isResolving}
                        style={{
                          padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.5rem",
                          backgroundColor: "white",
                          color: "#22c55e",
                          cursor: isResolving ? "not-allowed" : "pointer",
                          opacity: isResolving ? 0.5 : 1,
                        }}
                      >
                        {isResolving ? (
                          <Loader2
                            style={{
                              width: "clamp(0.875rem, 2vw, 1rem)",
                              height: "clamp(0.875rem, 2vw, 1rem)",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        ) : (
                          <CheckCircle2
                            style={{
                              width: "clamp(0.875rem, 2vw, 1rem)",
                              height: "clamp(0.875rem, 2vw, 1rem)",
                            }}
                          />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(alert.id)}
                      title="Delete"
                      disabled={isDeleting || isResolving}
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        backgroundColor: "white",
                        color: "#ef4444",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        opacity: isDeleting ? 0.5 : 1,
                      }}
                    >
                      {isDeleting ? (
                        <Loader2
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <Trash2
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                          }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Meta info + Countdown */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(0.5rem, 2vw, 0.75rem)",
                    flexWrap: "wrap",
                    paddingLeft: "clamp(2.5rem, 7vw, 3.25rem)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "#94a3b8",
                    }}
                  >
                    Target:{" "}
                    <strong style={{ color: "#475569" }}>{alert.target}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "#94a3b8",
                    }}
                  >
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  {alert.resolvedAt && (
                    <span
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "#22c55e",
                      }}
                    >
                      Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                    </span>
                  )}
                  <DeleteCountdown deleteAt={alert.deleteAt} />
                  <span
                    style={{
                      fontSize: "clamp(0.5625rem, 1.5vw, 0.625rem)",
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    ID:{alert.id}
                  </span>
                </div>

                <ExpiryBanner daysLeft={daysUntilDelete} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
