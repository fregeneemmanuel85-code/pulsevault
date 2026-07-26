"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Loader2,
  ArrowLeft,
  Trash2,
  XCircle,
  Info,
  Timer,
  Lock,
  Crown,
} from "lucide-react";
import Link from "next/link";
import {
  subscribeToIncidents,
  deleteIncident,
  subscribeToUserPlan,
  type Incident,
  type UserPlan,
} from "@/lib/firestore";

/* =========================================================
   HELPERS
   ========================================================= */
function getDaysUntilDeletion(startedAt: string): number {
  const start = new Date(startedAt).getTime();
  const deleteAt = start + 30 * 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.ceil((deleteAt - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function getDeletionColor(days: number): string {
  if (days <= 3) return "#ef4444";
  if (days <= 7) return "#f59e0b";
  return "var(--text-muted)";
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
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
    if (!plan || plan.planId === "free") {
      setLoading(false);
      return;
    }

    const unsub = subscribeToIncidents((data) => {
      setIncidents(
        data.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        ),
      );
      setLoading(false);
    });
    return () => unsub();
  }, [plan, planLoading]);

  const handleDelete = async (incident: Incident) => {
    if (!confirm("Delete this incident permanently?")) return;
    try {
      await deleteIncident(incident.id, incident.websiteId);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "critical")
      return (
        <XCircle
          style={{
            width: "clamp(0.875rem, 2.5vw, 1.125rem)",
            height: "clamp(0.875rem, 2.5vw, 1.125rem)",
            color: "#dc2626",
          }}
        />
      );
    if (severity === "warning")
      return (
        <AlertTriangle
          style={{
            width: "clamp(0.875rem, 2.5vw, 1.125rem)",
            height: "clamp(0.875rem, 2.5vw, 1.125rem)",
            color: "#f59e0b",
          }}
        />
      );
    return (
      <Shield
        style={{
          width: "clamp(0.875rem, 2.5vw, 1.125rem)",
          height: "clamp(0.875rem, 2.5vw, 1.125rem)",
          color: "#2563eb",
        }}
      />
    );
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical")
      return {
        bg: "rgba(239,68,68,0.08)",
        text: "#ef4444",
        border: "rgba(239,68,68,0.25)",
      };
    if (severity === "warning")
      return {
        bg: "rgba(245,158,11,0.08)",
        text: "#f59e0b",
        border: "rgba(245,158,11,0.25)",
      };
    return {
      bg: "rgba(37,99,235,0.08)",
      text: "#2563eb",
      border: "rgba(37,99,235,0.25)",
    };
  };

  const getStatusBadge = (status: string) => {
    if (status === "resolved") {
      return (
        <span
          style={{
            fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
            fontWeight: "600",
            padding: "0.25rem 0.625rem",
            borderRadius: "0.25rem",
            backgroundColor: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle2
            style={{
              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
            }}
          />
          Resolved
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
          fontWeight: "600",
          padding: "0.25rem 0.625rem",
          borderRadius: "0.25rem",
          backgroundColor: "rgba(239,68,68,0.1)",
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <AlertTriangle
          style={{
            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
          }}
        />
        Open
      </span>
    );
  };

  // ─── UPGRADE PROMPT FOR FREE PLAN ───
  if (!planLoading && (!plan || plan.planId === "free")) {
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
              color: "var(--text-muted)",
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
                color: "var(--text-primary)",
              }}
            >
              Incident History
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              Track and manage all your monitoring incidents
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "1rem",
            border: "1px solid var(--border-color)",
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
              backgroundColor: "rgba(37,99,235,0.08)",
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
                color: "#2563eb",
              }}
            />
          </div>
          <h2
            style={{
              fontSize: "clamp(1rem, 3vw, 1.25rem)",
              fontWeight: "600",
              color: "var(--text-primary)",
            }}
          >
            Incident History is a Starter Feature
          </h2>
          <p
            style={{
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              color: "var(--text-muted)",
              maxWidth: "24rem",
              lineHeight: 1.6,
            }}
          >
            Incident history tracking, auto-deletion management, and detailed
            incident logs are available on the Starter plan and above.
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
                backgroundColor: "#2563eb",
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
              Upgrade to Starter
            </Link>
          </div>
          <p
            style={{
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              color: "var(--text-muted)",
            }}
          >
            Starting at NGN 3,000/month
          </p>
        </div>
      </div>
    );
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
          style={{
            color: "var(--text-muted)",
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
              color: "var(--text-primary)",
            }}
          >
            Incident History
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            {incidents.filter((i) => i.status === "open").length} open ·{" "}
            {incidents.filter((i) => i.status === "resolved").length} resolved
          </p>
        </div>
      </div>

      {/* Auto-Delete Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "clamp(0.5rem, 2vw, 0.625rem)",
          padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(0.75rem, 3vw, 1rem)",
          borderRadius: "0.75rem",
          backgroundColor: "rgba(37,99,235,0.06)",
          border: "1px solid rgba(37,99,235,0.12)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Info
          style={{
            width: "clamp(1rem, 2.5vw, 1.125rem)",
            height: "clamp(1rem, 2.5vw, 1.125rem)",
            color: "#2563eb",
            flexShrink: 0,
            marginTop: "0.125rem",
          }}
        />
        <span
          style={{
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          Incidents are automatically deleted after{" "}
          <strong style={{ color: "#2563eb" }}>30 days</strong> to keep your
          history clean. Urgent countdown appears when 7 days or less remain.
        </span>
      </div>

      {/* Incidents List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {incidents.length === 0 ? (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "1rem",
              border: "1px solid var(--border-color)",
              padding: "clamp(2rem, 8vw, 4rem) clamp(1rem, 4vw, 1.5rem)",
              textAlign: "center",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <Shield
              style={{
                width: "clamp(2rem, 6vw, 3rem)",
                height: "clamp(2rem, 6vw, 3rem)",
                color: "var(--text-muted)",
                margin: "0 auto 1rem",
              }}
            />
            <h2
              style={{
                fontSize: "clamp(1rem, 3vw, 1.125rem)",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              No incidents yet
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              All clear — no incidents recorded
            </p>
          </div>
        ) : (
          incidents.map((incident) => {
            const sc = getSeverityColor(incident.severity);
            const daysLeft = getDaysUntilDeletion(incident.startedAt);
            const deleteColor = getDeletionColor(daysLeft);
            const showUrgent = daysLeft <= 7;

            return (
              <div
                key={incident.id}
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "0.75rem",
                  border: `1px solid ${incident.status === "open" ? sc.border : "var(--border-color)"}`,
                  padding: "clamp(0.75rem, 2.5vw, 1.25rem)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.5rem, 2vw, 0.75rem)",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* Top Row: Icon + Title + Status + Delete */}
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
                      width: "clamp(1.75rem, 4vw, 2rem)",
                      height: "clamp(1.75rem, 4vw, 2rem)",
                      borderRadius: "0.5rem",
                      backgroundColor: sc.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {getSeverityIcon(incident.severity)}
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
                          color: "var(--text-primary)",
                          wordBreak: "break-word",
                        }}
                      >
                        {incident.type}
                      </span>
                      {getStatusBadge(incident.status)}
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor: sc.bg,
                          color: sc.text,
                          textTransform: "capitalize",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {incident.severity}
                      </span>

                      {/* Countdown — only shows when urgent (≤7 days) */}
                      {showUrgent && (
                        <span
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            fontWeight: 600,
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor:
                              daysLeft <= 3
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(245,158,11,0.1)",
                            color: deleteColor,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Timer
                            style={{
                              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            }}
                          />
                          {daysLeft === 0
                            ? "Deletes today"
                            : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                        color: "var(--text-secondary)",
                        marginTop: "0.25rem",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {incident.message}
                    </p>
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => handleDelete(incident)}
                    style={{
                      padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                      backgroundColor: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Delete incident"
                  >
                    <Trash2
                      style={{
                        width: "clamp(0.75rem, 2vw, 0.875rem)",
                        height: "clamp(0.75rem, 2vw, 0.875rem)",
                      }}
                    />
                  </button>
                </div>

                {/* Details Row */}
                <div
                  style={{
                    display: "flex",
                    gap: "clamp(0.75rem, 2vw, 1.5rem)",
                    flexWrap: "wrap",
                    paddingLeft: "clamp(2.25rem, 6vw, 2.75rem)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <Clock
                      style={{
                        width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                        height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Started: {new Date(incident.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {incident.resolvedAt && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <CheckCircle2
                        style={{
                          width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          color: "#22c55e",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Resolved:{" "}
                        {new Date(incident.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <Shield
                      style={{
                        width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                        height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {incident.websiteName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
