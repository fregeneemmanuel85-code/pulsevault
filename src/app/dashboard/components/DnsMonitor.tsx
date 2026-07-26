"use client";

import { useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Server,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Website {
  id: string;
  url: string;
  name?: string;
  status: string;
  dnsResolved?: boolean | null;
  dnsIp?: string | null;
  lastChecked?: string;
  health?: number;
}

interface DnsMonitorProps {
  websites: Website[];
  loading?: boolean;
}

export default function DnsMonitor({ websites, loading }: DnsMonitorProps) {
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "1rem",
          border: "1px solid var(--border-color)",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          minHeight: "clamp(120px, 20vw, 160px)",
        }}
      >
        <div
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            border: "2px solid var(--border-color)",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
          }}
        >
          Loading DNS data...
        </span>
      </div>
    );
  }

  const totalSites = websites.length;
  const resolvedCount = websites.filter((w) => w.dnsResolved === true).length;
  const failedCount = websites.filter((w) => w.dnsResolved === false).length;
  const unknownCount = totalSites - resolvedCount - failedCount;

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const getStatusIcon = (resolved?: boolean | null) => {
    if (resolved === true) {
      return (
        <CheckCircle2
          style={{
            width: "clamp(1rem, 2.5vw, 1.125rem)",
            height: "clamp(1rem, 2.5vw, 1.125rem)",
            color: "#22c55e",
            flexShrink: 0,
          }}
        />
      );
    }
    if (resolved === false) {
      return (
        <XCircle
          style={{
            width: "clamp(1rem, 2.5vw, 1.125rem)",
            height: "clamp(1rem, 2.5vw, 1.125rem)",
            color: "#ef4444",
            flexShrink: 0,
          }}
        />
      );
    }
    return (
      <AlertTriangle
        style={{
          width: "clamp(1rem, 2.5vw, 1.125rem)",
          height: "clamp(1rem, 2.5vw, 1.125rem)",
          color: "#f59e0b",
          flexShrink: 0,
        }}
      />
    );
  };

  const getStatusBadge = (resolved?: boolean | null) => {
    if (resolved === true) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem clamp(0.375rem, 1.5vw, 0.625rem)",
            borderRadius: "9999px",
            backgroundColor: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
            fontWeight: "600",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <Wifi
            style={{
              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
            }}
          />
          Resolved
        </span>
      );
    }
    if (resolved === false) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem clamp(0.375rem, 1.5vw, 0.625rem)",
            borderRadius: "9999px",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
            fontWeight: "600",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <WifiOff
            style={{
              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
            }}
          />
          Failed
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.25rem clamp(0.375rem, 1.5vw, 0.625rem)",
          borderRadius: "9999px",
          backgroundColor: "rgba(245,158,11,0.1)",
          color: "#f59e0b",
          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
          fontWeight: "600",
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
        Unknown
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "1rem",
        border: "1px solid var(--border-color)",
        padding: "clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "clamp(0.75rem, 2vw, 1.25rem)",
          flexWrap: "wrap",
          gap: "clamp(0.5rem, 2vw, 0.75rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "clamp(1.75rem, 4vw, 2rem)",
              height: "clamp(1.75rem, 4vw, 2rem)",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(37,99,235,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Globe
              style={{
                width: "clamp(1rem, 2.5vw, 1.125rem)",
                height: "clamp(1rem, 2.5vw, 1.125rem)",
                color: "#2563eb",
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                fontWeight: "600",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              DNS Monitor
            </h2>
            <p
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "var(--text-muted)",
                margin: "0.125rem 0 0 0",
              }}
            >
              Domain name resolution status
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {resolvedCount > 0 && (
            <div
              style={{
                padding:
                  "clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 2vw, 0.75rem)",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#22c55e",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                {resolvedCount} Resolved
              </span>
            </div>
          )}
          {failedCount > 0 && (
            <div
              style={{
                padding:
                  "clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 2vw, 0.75rem)",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#ef4444",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                {failedCount} Failed
              </span>
            </div>
          )}
          {unknownCount > 0 && (
            <div
              style={{
                padding:
                  "clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 2vw, 0.75rem)",
                borderRadius: "0.5rem",
                backgroundColor: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#f59e0b",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                {unknownCount} Pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalSites > 0 && (
        <div
          style={{
            display: "flex",
            height: "clamp(0.375rem, 1vw, 0.5rem)",
            borderRadius: "9999px",
            overflow: "hidden",
            marginBottom: "clamp(0.75rem, 2vw, 1.25rem)",
            backgroundColor: "var(--bg-icon)",
          }}
        >
          {resolvedCount > 0 && (
            <div
              style={{
                width: `${(resolvedCount / totalSites) * 100}%`,
                backgroundColor: "#22c55e",
                transition: "width 0.5s ease",
              }}
            />
          )}
          {failedCount > 0 && (
            <div
              style={{
                width: `${(failedCount / totalSites) * 100}%`,
                backgroundColor: "#ef4444",
                transition: "width 0.5s ease",
              }}
            />
          )}
          {unknownCount > 0 && (
            <div
              style={{
                width: `${(unknownCount / totalSites) * 100}%`,
                backgroundColor: "#f59e0b",
                transition: "width 0.5s ease",
              }}
            />
          )}
        </div>
      )}

      {/* DNS List — SCROLLABLE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxHeight: "clamp(280px, 40vw, 360px)",
          overflowY: "auto",
          paddingRight: "0.5rem",
        }}
      >
        {websites.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "clamp(1.5rem, 5vw, 2rem)",
              color: "var(--text-muted)",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            No websites added yet. Add a website to see DNS monitoring.
          </div>
        ) : (
          websites.map((site) => {
            const hostname = getHostname(site.url);
            const isExpanded = expandedSite === site.id;

            return (
              <div
                key={site.id}
                style={{
                  borderRadius: "0.625rem",
                  border: "1px solid var(--border-light)",
                  backgroundColor: isExpanded
                    ? "var(--bg-icon)"
                    : "var(--bg-input)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding:
                      "clamp(0.625rem, 2vw, 0.875rem) clamp(0.75rem, 2vw, 1rem)",
                    cursor: "pointer",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(0.5rem, 1.5vw, 0.75rem)",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {getStatusIcon(site.dnsResolved)}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "500",
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {site.name || hostname}
                      </p>
                      <p
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "var(--text-muted)",
                          margin: "0.125rem 0 0 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hostname}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(0.375rem, 1.5vw, 0.75rem)",
                      flexShrink: 0,
                    }}
                  >
                    {getStatusBadge(site.dnsResolved)}
                    <span
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                        minWidth: "2.5rem",
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {site.health ?? "--"}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp
                        style={{
                          width: "clamp(0.875rem, 2vw, 1rem)",
                          height: "clamp(0.875rem, 2vw, 1rem)",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <ChevronDown
                        style={{
                          width: "clamp(0.875rem, 2vw, 1rem)",
                          height: "clamp(0.875rem, 2vw, 1rem)",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding:
                        "0 clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1rem)",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                      gap: "clamp(0.5rem, 1.5vw, 0.875rem)",
                    }}
                  >
                    {[
                      {
                        label: "IP Address",
                        icon: Server,
                        value: site.dnsIp || "—",
                        isMono: true,
                      },
                      {
                        label: "Last Checked",
                        icon: null,
                        value: site.lastChecked
                          ? new Date(site.lastChecked).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "—",
                        isMono: false,
                      },
                      {
                        label: "Resolution",
                        icon: null,
                        value: site.dnsResolved
                          ? "DNS resolved successfully"
                          : "DNS resolution failed",
                        color: site.dnsResolved ? "#22c55e" : "#ef4444",
                      },
                      {
                        label: "Overall Status",
                        icon: null,
                        value: site.status || "Unknown",
                        color:
                          site.status === "healthy"
                            ? "#22c55e"
                            : site.status === "warning"
                              ? "#f59e0b"
                              : "#ef4444",
                        capitalize: true,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: "clamp(0.5rem, 1.5vw, 0.75rem)",
                          borderRadius: "0.5rem",
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border-light)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: "600",
                            margin: "0 0 clamp(0.25rem, 1vw, 0.375rem) 0",
                          }}
                        >
                          {item.label}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                          }}
                        >
                          {item.icon && (
                            <item.icon
                              style={{
                                width: "clamp(0.75rem, 2vw, 0.875rem)",
                                height: "clamp(0.75rem, 2vw, 0.875rem)",
                                color: "var(--text-muted)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                              color: item.color || "var(--text-primary)",
                              fontFamily: item.isMono ? "monospace" : "inherit",
                              fontWeight: item.color ? "500" : "400",
                              textTransform: item.capitalize
                                ? "capitalize"
                                : "none",
                            }}
                          >
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
