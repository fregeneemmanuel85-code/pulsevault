"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Globe,
  Search,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Link2,
  Plug,
  Mail,
  Code,
  Shield,
  Server,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  subscribeToWebsites,
  updateWebsite,
  deleteWebsite,
  type Website,
} from "@/lib/firestore";

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status" | "health">("name");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "healthy" | "warning" | "offline" | "checking"
  >("all");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

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

  const runDeepScan = async (site: Website) => {
    console.log("[LIST] Starting scan for:", site.name, "ID:", site.id);
    setCheckingId(site.id);
    await updateWebsite(site.id, {
      status: "checking",
      lastChecked: "Checking...",
    });

    try {
      const body = JSON.stringify({ url: site.url, websiteId: site.id });
      console.log("[LIST] Scan request body:", body);

      const res = await fetch("/api/scan-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      const storedResult = {
        timestamp: result.timestamp,
        links: result.links?.list || [],
        plugins:
          result.plugins?.detected?.map((name: string) => ({
            name,
            status: result.plugins.broken.includes(name) ? "broken" : "ok",
          })) || [],
        forms: result.forms?.list || [],
        consoleErrors: result.consoleErrors || [],
        apiChecks: result.apiChecks || [],
        loadTime: result.performance?.loadTime || 0,
        pageSize: result.performance?.pageSize || 0,
        resourceErrors: [],
      };

      await updateWebsite(site.id, {
        status: result.status,
        health: result.healthScore,
        httpStatus: result.httpStatus,
        responseTime: result.responseTime + "ms",
        ssl: result.ssl?.valid
          ? result.ssl.daysLeft < 30
            ? "expiring"
            : "valid"
          : "expired",
        sslExpiry: result.ssl?.expiry || null,
        sslDaysLeft: result.ssl?.daysLeft || null,
        dnsStatus: result.dns?.resolved ? "ok" : "failed",
        brokenLinks: result.links?.broken || 0,
        totalLinks: result.links?.total || 0,
        brokenPlugins: result.plugins?.broken?.length || 0,
        totalPlugins: result.plugins?.detected?.length || 0,
        formsWorking: result.forms?.working ?? true,
        totalForms: result.forms?.total || 0,
        jsErrors: result.jsErrors || 0,
        performanceScore: result.performance?.score || 100,
        mixedContent: result.mixedContent || false,
        securityHeaders: result.securityHeaders || {
          hsts: false,
          xFrame: false,
          xContentType: false,
          csp: false,
        },
        redirectChain: result.redirectChain || [],
        scanResults: storedResult,
        lastChecked: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      console.error("Scan error:", err);
      await updateWebsite(site.id, {
        status: "offline",
        health: 0,
        responseTime: "Timeout",
        lastChecked: new Date().toLocaleTimeString(),
      });
    } finally {
      setCheckingId(null);
    }
  };

  const handleToggle = async (site: Website) => {
    await updateWebsite(site.id, { isMonitoring: !site.isMonitoring });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this website?")) await deleteWebsite(id);
  };

  const filtered = websites
    .filter((w) => {
      if (filterStatus !== "all" && w.status !== filterStatus) return false;
      const q = search.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "health") return b.health - a.health;
      const order = {
        healthy: 0,
        warning: 1,
        checking: 2,
        offline: 3,
        critical: 4,
      };
      return (
        (order[a.status as keyof typeof order] || 0) -
        (order[b.status as keyof typeof order] || 0)
      );
    });

  const getColor = (status: string) => {
    if (status === "healthy")
      return { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" };
    if (status === "offline")
      return { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444" };
    if (status === "critical")
      return { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" };
    if (status === "checking")
      return { bg: "#f8fafc", text: "#64748b", dot: "#94a3b8" };
    return { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" };
  };

  const getIssueCount = (site: Website) => {
    let count = 0;
    if (site.brokenLinks > 0) count += site.brokenLinks;
    if (site.brokenPlugins > 0) count += site.brokenPlugins;
    if (!site.formsWorking && site.totalForms > 0) count += 1;
    if (site.jsErrors > 0) count += 1;
    if (site.mixedContent) count += 1;
    if (site.httpStatus >= 400) count += 1;
    return count;
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
            Websites
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            {websites.length} website{websites.length !== 1 ? "s" : ""}{" "}
            monitored
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div
        style={{
          display: "flex",
          gap: "clamp(0.5rem, 2vw, 0.75rem)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: "min(100%, 200px)",
          }}
        >
          <Search
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "clamp(0.875rem, 2vw, 1rem)",
              height: "clamp(0.875rem, 2vw, 1rem)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search websites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) 1rem clamp(0.5rem, 2vw, 0.625rem) 2.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              boxSizing: "border-box",
              backgroundColor: "white",
              color: "#0f172a",
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
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
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="offline">Offline</option>
          <option value="checking">Checking</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
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
          <option value="name">Sort by Name</option>
          <option value="health">Sort by Health</option>
          <option value="status">Sort by Status</option>
        </select>
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
          <Globe
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
            No websites found
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {filtered.map((site) => {
            const c = getColor(site.status);
            const isChecking = checkingId === site.id;
            const issues = getIssueCount(site);
            const httpError = site.httpStatus >= 400;

            return (
              <div
                key={site.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding:
                    "clamp(0.75rem, 2.5vw, 1rem) clamp(0.75rem, 3vw, 1.25rem)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.5rem, 2vw, 0.75rem)",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* Top Row: Status dot + Name/URL + Actions */}
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
                      width: "0.625rem",
                      height: "0.625rem",
                      borderRadius: "50%",
                      backgroundColor: c.dot,
                      flexShrink: 0,
                      marginTop: "0.375rem",
                    }}
                  />
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
                          wordBreak: "break-all",
                        }}
                      >
                        {site.name}
                      </span>
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor: c.bg,
                          color: c.text,
                          textTransform: "capitalize",
                          flexShrink: 0,
                        }}
                      >
                        {isChecking ? "checking..." : site.status}
                      </span>
                      {!site.isMonitoring && (
                        <span
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            fontWeight: "600",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "#f3f4f6",
                            color: "#6b7280",
                            flexShrink: 0,
                          }}
                        >
                          Paused
                        </span>
                      )}
                      {httpError && (
                        <span
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            fontWeight: "600",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            flexShrink: 0,
                          }}
                        >
                          <Server
                            style={{
                              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            }}
                          />
                          HTTP {site.httpStatus}
                        </span>
                      )}
                      {issues > 0 && !httpError && (
                        <span
                          style={{
                            fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                            fontWeight: "600",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            flexShrink: 0,
                          }}
                        >
                          <AlertTriangle
                            style={{
                              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            }}
                          />
                          {issues} issue{issues !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "#94a3b8",
                        marginTop: "0.125rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {site.url}
                    </p>
                  </div>
                </div>

                {/* Issues Row */}
                {issues > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      paddingLeft: "clamp(1.125rem, 3.5vw, 1.375rem)",
                    }}
                  >
                    {site.httpStatus >= 400 && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#dc2626",
                        }}
                      >
                        <Server
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        HTTP {site.httpStatus} error
                      </span>
                    )}
                    {site.brokenLinks > 0 && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ef4444",
                        }}
                      >
                        <Link2
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        {site.brokenLinks} links
                      </span>
                    )}
                    {site.brokenPlugins > 0 && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ef4444",
                        }}
                      >
                        <Plug
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        {site.brokenPlugins} plugins
                      </span>
                    )}
                    {!site.formsWorking && site.totalForms > 0 && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ef4444",
                        }}
                      >
                        <Mail
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        forms
                      </span>
                    )}
                    {site.jsErrors > 0 && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ef4444",
                        }}
                      >
                        <Code
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        JS errors
                      </span>
                    )}
                    {site.mixedContent && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ef4444",
                        }}
                      >
                        <Shield
                          style={{
                            width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                            height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                          }}
                        />
                        mixed content
                      </span>
                    )}
                  </div>
                )}

                {/* Stats + Actions Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "clamp(0.5rem, 2vw, 0.75rem)",
                    flexWrap: "wrap",
                    paddingLeft: "clamp(1.125rem, 3.5vw, 1.375rem)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "clamp(0.75rem, 2vw, 1.5rem)",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "#94a3b8",
                        }}
                      >
                        Health
                      </p>
                      <p
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "600",
                          color: httpError ? "#dc2626" : c.text,
                        }}
                      >
                        {isChecking ? "-" : site.health + "%"}
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "#94a3b8",
                        }}
                      >
                        Response
                      </p>
                      <p
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "600",
                          color: httpError ? "#dc2626" : "#475569",
                        }}
                      >
                        {site.responseTime}
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "#94a3b8",
                        }}
                      >
                        SSL
                      </p>
                      <p
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "600",
                          color: site.ssl === "valid" ? "#15803d" : "#dc2626",
                        }}
                      >
                        {site.ssl}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.25rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={`/dashboard/websites/${site.id}`}
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #2563eb",
                        borderRadius: "0.5rem",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      title="View Details"
                    >
                      <ChevronRight
                        style={{
                          width: "clamp(0.875rem, 2vw, 1rem)",
                          height: "clamp(0.875rem, 2vw, 1rem)",
                        }}
                      />
                    </Link>

                    <button
                      onClick={() => runDeepScan(site)}
                      disabled={isChecking}
                      title="Deep scan"
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        backgroundColor: "white",
                        color: "#475569",
                        cursor: isChecking ? "not-allowed" : "pointer",
                        opacity: isChecking ? 0.5 : 1,
                      }}
                    >
                      {isChecking ? (
                        <Loader2
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <RefreshCw
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                          }}
                        />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(site)}
                      title={site.isMonitoring ? "Pause" : "Resume"}
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        backgroundColor: "white",
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {site.isMonitoring ? (
                        <Pause
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                          }}
                        />
                      ) : (
                        <Play
                          style={{
                            width: "clamp(0.875rem, 2vw, 1rem)",
                            height: "clamp(0.875rem, 2vw, 1rem)",
                          }}
                        />
                      )}
                    </button>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open site"
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        backgroundColor: "white",
                        color: "#475569",
                        textDecoration: "none",
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
                    <button
                      onClick={() => handleDelete(site.id)}
                      title="Delete"
                      style={{
                        padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.5rem",
                        backgroundColor: "white",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2
                        style={{
                          width: "clamp(0.875rem, 2vw, 1rem)",
                          height: "clamp(0.875rem, 2vw, 1rem)",
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
