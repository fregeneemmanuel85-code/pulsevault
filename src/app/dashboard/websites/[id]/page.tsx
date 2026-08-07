"use client";

import { useState, useEffect, useRef } from "react";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import DomainExpiryCard from "@/components/domains/DomainExpiryCard";
import SEOSummaryCard from "@/components/seo/SEOSummaryCard";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Shield,
  Link2,
  Plug,
  Mail,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Lock,
  ExternalLink,
  Activity,
  Info,
  Code,
  Search,
  Zap,
  Star,
  Cpu,
} from "lucide-react";
import {
  subscribeToWebsite,
  updateWebsite,
  subscribeToUserPlan,
  type Website,
  type ScanResult,
  type PriorityLevel,
  type UserPlan,
} from "@/lib/firestore";
import { useToast } from "@/components/ToastProvider";

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getPriorityConfig(priority: PriorityLevel) {
  if (priority === "critical")
    return {
      label: "Critical",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.3)",
    };
  if (priority === "high")
    return {
      label: "High",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
    };
  return {
    label: "Normal",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
  };
}

export default function WebsiteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [techScanning, setTechScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const justScanned = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubPlan = subscribeToUserPlan((p) => {
      setPlan(p);
    });
    return () => unsubPlan();
  }, []);

  /* ─── FIXED: Merge scan results instead of blind overwrite ─── */
  useEffect(() => {
    const unsub = subscribeToWebsite(id, (data) => {
      if (justScanned.current) {
        console.log(
          "[PulseVault] Skipping Firestore overwrite, fresh scan data available",
        );
        return;
      }
      setWebsite(data);
      setLoading(false);

      if (data?.scanResults) {
        setScanResult((prev) => {
          const incoming = data.scanResults as ScanResult;

          const incomingTechCount = incoming?.techStack?.detected?.length ?? 0;
          const prevTechCount = prev?.techStack?.detected?.length ?? 0;

          const mergedTechStack =
            incomingTechCount > 0
              ? incoming.techStack
              : prevTechCount > 0
                ? prev!.techStack
                : incoming.techStack;

          const mergedRuntimeErrors =
            (incoming?.runtimeErrors?.length ?? 0) > 0
              ? incoming.runtimeErrors
              : (prev?.runtimeErrors?.length ?? 0) > 0
                ? prev!.runtimeErrors
                : incoming.runtimeErrors;

          const mergedSpaCrashes =
            incoming?.spaCrashes ??
            prev?.spaCrashes ??
            data?.spaCrashes ??
            false;

          const mergedHeadless =
            incoming?.headlessAvailable ??
            prev?.headlessAvailable ??
            data?.headlessAvailable ??
            false;

          const mergedSeo = incoming?.seo ??
            prev?.seo ??
            data?.seo ?? { score: 100, metrics: {}, issues: [] };

          return {
            ...prev,
            ...incoming,
            techStack: mergedTechStack,
            runtimeErrors: mergedRuntimeErrors,
            spaCrashes: mergedSpaCrashes,
            headlessAvailable: mergedHeadless,
            seo: mergedSeo,
          } as ScanResult;
        });
      }
    });
    return () => unsub();
  }, [id]);

  const runDeepScan = async () => {
    if (!website || scanning) return;
    setScanning(true);
    showToast("Starting deep scan...", "info");

    try {
      // ← ADD THIS BLOCK HERE
      const auth = getAuth();
      if (!auth.currentUser) {
        console.log("[Scan] Skipped — user logged out");
        setScanning(false);
        return;
      }

      const res = await fetch("/api/scan-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website.url, websiteId: website.id }),
      });
      const result = await res.json();

      const storedResult = {
        timestamp: result.timestamp,
        links: result.links?.list || [],
        plugins:
          result.plugins?.detected?.map((name: string) => ({
            name,
            status: result.plugins?.broken?.includes(name) ? "broken" : "ok",
          })) || [],
        forms: result.forms?.list || [],
        consoleErrors: result.consoleErrors || [],
        apiChecks: result.apiChecks || [],
        loadTime: result.performance?.loadTime || 0,
        pageSize: result.performance?.pageSize || 0,
        performanceScore: result.performance?.score || 0,
        resourceErrors: [],
        techStack: result.techStack || { detected: [] },
        runtimeErrors: result.runtimeErrors || [],
        spaCrashes: result.spaCrashes || false,
        headlessAvailable: result.headlessAvailable || false,
        seo: result.seo || { score: 100, metrics: {}, issues: [] },
      };
      setScanResult(storedResult);
      justScanned.current = true;

      setWebsite((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
              health: result.healthScore,
              httpStatus: result.httpStatus,
              responseTime: result.responseTime + "ms",
              ssl: result.ssl.valid
                ? result.ssl.daysLeft < 30
                  ? "expiring"
                  : "valid"
                : "expired",
              sslExpiry: result.ssl.expiry || null,
              sslDaysLeft: result.ssl.daysLeft ?? null,
              dnsStatus: result.dns.resolved ? "ok" : "failed",
              brokenLinks: result.links.broken,
              protectedLinks: result.links.protected || 0,
              totalLinks: result.links.total,
              brokenPlugins: result.plugins.broken.length,
              totalPlugins: result.plugins.detected.length,
              formsWorking: result.forms.working,
              totalForms: result.forms.total,
              jsErrors: result.jsErrors,
              performanceScore: result.performance.score,
              loadTime: result.performance.loadTime,
              pageSize: result.performance.pageSize,
              mixedContent: result.mixedContent,
              securityHeaders: result.securityHeaders,
              redirectChain: result.redirectChain,
              spaCrashes: result.spaCrashes,
              runtimeErrors: result.runtimeErrors,
              headlessAvailable: result.headlessAvailable,
              seoScore: result.seo?.score,
              seoLastScanned: new Date().toISOString(),
              seoIssues: result.seo?.issues,
              seoMetrics: result.seo?.metrics,
              lastChecked: new Date().toLocaleTimeString(),
            }
          : null,
      );

      const updatePayload = {
        status: result.status,
        health: result.healthScore,
        httpStatus: result.httpStatus,
        responseTime: result.responseTime + "ms",
        ssl: result.ssl.valid
          ? result.ssl.daysLeft < 30
            ? "expiring"
            : "valid"
          : "expired",
        sslExpiry: result.ssl.expiry || null,
        sslDaysLeft: result.ssl.daysLeft ?? null,
        dnsStatus: result.dns.resolved ? "ok" : "failed",
        brokenLinks: result.links.broken,
        protectedLinks: result.links.protected || 0,
        totalLinks: result.links.total,
        brokenPlugins: result.plugins.broken.length,
        totalPlugins: result.plugins.detected.length,
        formsWorking: result.forms.working,
        totalForms: result.forms.total,
        jsErrors: result.jsErrors,
        performanceScore: result.performance.score,
        loadTime: result.performance.loadTime,
        pageSize: result.performance.pageSize,
        mixedContent: result.mixedContent,
        securityHeaders: result.securityHeaders,
        redirectChain: result.redirectChain,
        spaCrashes: result.spaCrashes,
        runtimeErrors: result.runtimeErrors,
        headlessAvailable: result.headlessAvailable,
        seoScore: result.seo?.score,
        seoLastScanned: new Date().toISOString(),
        seoIssues: result.seo?.issues,
        seoMetrics: result.seo?.metrics,
        scanResults: storedResult,
        lastChecked: new Date().toISOString(),
      };

      await updateWebsite(id, JSON.parse(JSON.stringify(updatePayload)));

      showToast(
        `Scan complete — ${result.status === "healthy" ? "All good" : `Status: ${result.status}`}`,
        result.status === "healthy" ? "success" : "warning",
      );

      setTimeout(() => {
        justScanned.current = false;
      }, 2000);
    } catch (err: any) {
      console.error("Scan failed:", err);
      showToast("Scan failed: " + err.message, "error");
    } finally {
      setScanning(false);
    }
  };

  const runTechScan = async () => {
    if (!website || techScanning) return;
    setTechScanning(true);
    showToast("Detecting tech stack...", "info");

    try {
      // ← ADD THIS BLOCK
      const auth = getAuth();
      if (!auth.currentUser) {
        console.log("[Scan] Skipped — user logged out");
        setTechScanning(false);
        return;
      }

      const res = await fetch("/api/scan-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: website.url,
          websiteId: website.id,
          techOnly: true,
        }),
      });
      const result = await res.json();

      const detected = result.techStack?.detected || [];

      setScanResult((prev) =>
        prev
          ? {
              ...prev,
              techStack: result.techStack || { detected: [] },
              spaCrashes: result.spaCrashes || false,
              runtimeErrors: result.runtimeErrors || [],
            }
          : ({
              techStack: result.techStack || { detected: [] },
              spaCrashes: result.spaCrashes || false,
              runtimeErrors: result.runtimeErrors || [],
            } as ScanResult),
      );

      setWebsite((prev) =>
        prev
          ? ({
              ...prev,
              techStack: result.techStack || { detected: [] },
              spaCrashes: result.spaCrashes || false,
              runtimeErrors: result.runtimeErrors || [],
              scanResults: {
                ...(prev.scanResults || {}),
                techStack: result.techStack || { detected: [] },
                spaCrashes: result.spaCrashes || false,
                runtimeErrors: result.runtimeErrors || [],
              },
            } as Website)
          : null,
      );

      await updateWebsite(id, {
        techStack: result.techStack || { detected: [] },
        spaCrashes: result.spaCrashes || false,
        runtimeErrors: result.runtimeErrors || [],
        "scanResults.techStack": result.techStack || { detected: [] },
        "scanResults.spaCrashes": result.spaCrashes || false,
        "scanResults.runtimeErrors": result.runtimeErrors || [],
        updatedAt: new Date().toISOString(),
      } as any);

      showToast(`Detected ${detected.length} technologies`, "success");

      console.log(
        `[TechScan] Detected ${detected.length} technologies for ${website.url}`,
      );
    } catch (err: any) {
      console.error("Tech scan failed:", err);
      showToast("Tech scan failed: " + err.message, "error");
    } finally {
      setTechScanning(false);
    }
  };

  const handlePriorityChange = async (newPriority: PriorityLevel) => {
    if (!website) return;
    await updateWebsite(website.id, { priority: newPriority });
    setShowPriorityMenu(false);
  };

  const getStatusColor = (status: string) => {
    if (status === "healthy")
      return { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle2 };
    if (status === "offline")
      return { bg: "#fef2f2", text: "#b91c1c", icon: XCircle };
    return { bg: "#fffbeb", text: "#b45309", icon: AlertTriangle };
  };

  const perfScore =
    scanResult?.performanceScore ?? website?.performanceScore ?? 100;
  const perfColor =
    perfScore > 80 ? "#22c55e" : perfScore > 50 ? "#f59e0b" : "#ef4444";

  const currentPlanLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
  const canUsePriority = currentPlanLevel >= 2;

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
            fontSize: "clamp(1rem, 3vw, 1.25rem)",
            fontWeight: "600",
            color: "#0f172a",
          }}
        >
          Website not found
        </h2>
        <Link
          href="/dashboard/websites"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
          }}
        >
          ← Back to websites
        </Link>
      </div>
    );
  }

  const sc = getStatusColor(website.status);
  const pConfig = getPriorityConfig(website.priority || "normal");

  const websiteTechStack = (website as any)?.techStack;
  const hasTechData =
    (scanResult?.techStack?.detected?.length ?? 0) > 0 ||
    (websiteTechStack?.detected?.length ?? 0) > 0;

  const techData = scanResult?.techStack ?? websiteTechStack;

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
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "clamp(0.5rem, 2vw, 0.75rem)",
            minWidth: 0,
            flex: 1,
          }}
        >
          <Link
            href="/dashboard/websites"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              flexShrink: 0,
              marginTop: "0.25rem",
            }}
          >
            <ArrowLeft
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
              }}
            />
          </Link>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontSize: "clamp(1.125rem, 3.5vw, 1.5rem)",
                  fontWeight: "700",
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {website.name}
              </h1>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() =>
                    canUsePriority && setShowPriorityMenu(!showPriorityMenu)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "0.375rem",
                    backgroundColor: pConfig.bg,
                    border: `1px solid ${pConfig.border}`,
                    color: pConfig.color,
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    fontWeight: "600",
                    cursor: canUsePriority ? "pointer" : "default",
                    flexShrink: 0,
                  }}
                >
                  <Star
                    style={{
                      width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      fill: pConfig.color,
                    }}
                  />
                  {pConfig.label}
                  {canUsePriority && (
                    <span
                      style={{
                        fontSize: "clamp(0.5625rem, 1.5vw, 0.625rem)",
                        marginLeft: "0.125rem",
                      }}
                    >
                      ▼
                    </span>
                  )}
                </button>
                {showPriorityMenu && canUsePriority && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 0.25rem)",
                      left: 0,
                      zIndex: 10,
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      padding: "0.25rem",
                      minWidth: "120px",
                    }}
                  >
                    {(["normal", "high", "critical"] as PriorityLevel[]).map(
                      (p) => {
                        const pc = getPriorityConfig(p);
                        return (
                          <button
                            key={p}
                            onClick={() => handlePriorityChange(p)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "none",
                              backgroundColor:
                                website.priority === p ? pc.bg : "transparent",
                              color: pc.color,
                              fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                              fontWeight: "600",
                              cursor: "pointer",
                              textTransform: "capitalize",
                            }}
                          >
                            <Star
                              style={{
                                width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                                height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                                fill: pc.color,
                              }}
                            />
                            {pc.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
              {!canUsePriority && (
                <span
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#8b5cf6",
                    backgroundColor: "rgba(139,92,246,0.08)",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.25rem",
                    flexShrink: 0,
                  }}
                >
                  Pro feature
                </span>
              )}
            </div>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#64748b",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginTop: "0.125rem",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {website.url}
              </span>
              <ExternalLink
                style={{
                  width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  flexShrink: 0,
                }}
              />
            </a>
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
          <Link
            href={`/dashboard/websites/${website.id}/history`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
              backgroundColor: "#8b5cf6",
              color: "white",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              fontWeight: "500",
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            <Activity
              style={{
                width: "clamp(0.875rem, 2vw, 1rem)",
                height: "clamp(0.875rem, 2vw, 1rem)",
              }}
            />
            View History
          </Link>

          <button
            onClick={runDeepScan}
            disabled={scanning}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              fontWeight: "500",
              border: "none",
              cursor: scanning ? "not-allowed" : "pointer",
              opacity: scanning ? 0.6 : 1,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {scanning ? (
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
            {scanning ? "Scanning..." : "Deep Scan"}
          </button>
        </div>
      </div>

      {/* HEALTH OVERVIEW */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(1rem, 3vw, 1.5rem)",
          flexWrap: "wrap",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "clamp(4rem, 12vw, 6rem)",
            height: "clamp(4rem, 12vw, 6rem)",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 36 36"
            style={{
              width: "100%",
              height: "100%",
              transform: "rotate(-90deg)",
            }}
          >
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={
                website.health > 80
                  ? "#22c55e"
                  : website.health > 50
                    ? "#f59e0b"
                    : "#ef4444"
              }
              strokeWidth="3"
              strokeDasharray={`${website.health}, 100`}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "clamp(0.875rem, 3vw, 1.25rem)",
                fontWeight: "700",
                color: "#0f172a",
              }}
            >
              {website.health}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: "min(100%, 200px)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
              flexWrap: "wrap",
            }}
          >
            <sc.icon
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: sc.text,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                fontWeight: "600",
                color: sc.text,
                textTransform: "capitalize",
              }}
            >
              {website.status}
            </span>
          </div>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            Last checked: {website.lastChecked}
          </p>
          <div
            style={{
              display: "flex",
              gap: "clamp(0.5rem, 1.5vw, 1rem)",
              marginTop: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: `HTTP ${website.httpStatus || "-"}`,
                color: "#475569",
                bg: "#f1f5f9",
              },
              { label: website.responseTime, color: "#475569", bg: "#f1f5f9" },
              {
                label: `SSL: ${website.ssl}`,
                color: website.ssl === "valid" ? "#15803d" : "#dc2626",
                bg: website.ssl === "valid" ? "#f0fdf4" : "#fef2f2",
              },
              {
                label: `DNS: ${website.dnsStatus}`,
                color: website.dnsStatus === "ok" ? "#15803d" : "#dc2626",
                bg: website.dnsStatus === "ok" ? "#f0fdf4" : "#fef2f2",
              },
            ].map((badge) => (
              <span
                key={badge.label}
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.25rem",
                  backgroundColor: badge.bg,
                  color: badge.color,
                  whiteSpace: "nowrap",
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CARDS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Links */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Link2
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Links
            </h3>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "clamp(1.25rem, 3.5vw, 1.5rem)",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                {website.totalLinks || 0}
              </span>
              <p
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  color: "#94a3b8",
                }}
              >
                Total
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "clamp(1.25rem, 3.5vw, 1.5rem)",
                  fontWeight: "700",
                  color: website.brokenLinks > 0 ? "#ef4444" : "#22c55e",
                }}
              >
                {website.brokenLinks || 0}
              </span>
              <p
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  color: "#94a3b8",
                }}
              >
                Broken
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "clamp(1.25rem, 3.5vw, 1.5rem)",
                  fontWeight: "700",
                  color: "#f59e0b",
                }}
              >
                {website.protectedLinks || 0}
              </span>
              <p
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.75rem)",
                  color: "#94a3b8",
                }}
              >
                Protected
              </p>
            </div>
          </div>
          {scanResult && scanResult.links.filter((l) => !l.ok).length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                marginTop: "0.5rem",
                paddingTop: "0.5rem",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {scanResult.links
                .filter((l) => !l.ok)
                .slice(0, 3)
                .map((link) => (
                  <div
                    key={link.url}
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "#ef4444",
                      wordBreak: "break-all",
                      overflow: "hidden",
                    }}
                  >
                    ✗ {link.url} ({link.status})
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Plugins */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Plug
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Plugins
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: "700",
                color: website.brokenPlugins > 0 ? "#ef4444" : "#22c55e",
              }}
            >
              {website.totalPlugins}
            </span>
            <span
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#94a3b8",
              }}
            >
              {website.brokenPlugins > 0
                ? `detected / ${website.brokenPlugins} broken`
                : "detected"}
            </span>
          </div>
          {scanResult && scanResult.plugins.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.375rem",
                marginTop: "0.75rem",
              }}
            >
              {scanResult.plugins.map((p) => (
                <span
                  key={p.name}
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    backgroundColor: p.status === "ok" ? "#f0fdf4" : "#fef2f2",
                    color: p.status === "ok" ? "#15803d" : "#dc2626",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Forms */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Mail
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Forms
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: "700",
                color: website.formsWorking ? "#22c55e" : "#ef4444",
              }}
            >
              {website.totalForms}
            </span>
            <span
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#94a3b8",
              }}
            >
              detected
            </span>
          </div>
          <span
            style={{
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.25rem",
              backgroundColor: website.formsWorking ? "#f0fdf4" : "#fef2f2",
              color: website.formsWorking ? "#15803d" : "#dc2626",
              whiteSpace: "nowrap",
            }}
          >
            {website.formsWorking
              ? "All forms configured"
              : "Forms missing attributes"}
          </span>
          {scanResult && scanResult.forms.length > 0 && (
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {scanResult.forms.map((f, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    color: f.hasAction && f.hasMethod ? "#15803d" : "#ef4444",
                    wordBreak: "break-all",
                  }}
                >
                  {f.hasAction && f.hasMethod ? "✓" : "✗"} Form {i + 1}:{" "}
                  {f.hasAction ? "action" : "no action"},{" "}
                  {f.hasMethod ? "method" : "no method"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* JS Errors */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Code
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              JavaScript
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: "700",
                color: website.jsErrors > 0 ? "#ef4444" : "#22c55e",
              }}
            >
              {website.jsErrors}
            </span>
            <span
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#94a3b8",
              }}
            >
              errors detected
            </span>
          </div>
          {scanResult && scanResult.consoleErrors.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                marginTop: "0.5rem",
              }}
            >
              {scanResult.consoleErrors.slice(0, 3).map((err, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    color: "#ef4444",
                    wordBreak: "break-all",
                    overflow: "hidden",
                  }}
                >
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Shield
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Security
            </h3>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {[
              { label: "HSTS", ok: website.securityHeaders?.hsts },
              { label: "X-Frame-Options", ok: website.securityHeaders?.xFrame },
              {
                label: "X-Content-Type",
                ok: website.securityHeaders?.xContentType,
              },
              { label: "CSP", ok: website.securityHeaders?.csp },
            ].map((h) => (
              <div
                key={h.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "#475569", wordBreak: "break-all" }}>
                  {h.label}
                </span>
                <span
                  style={{
                    color: h.ok ? "#22c55e" : "#ef4444",
                    fontWeight: "600",
                    flexShrink: 0,
                  }}
                >
                  {h.ok ? "✓" : "✗"}
                </span>
              </div>
            ))}
            {website.mixedContent && (
              <div
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#ef4444",
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: "#fef2f2",
                  borderRadius: "0.25rem",
                  wordBreak: "break-all",
                }}
              >
                ⚠ Mixed content detected
              </div>
            )}
          </div>
        </div>

        {/* Performance */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Zap
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Performance
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: "700",
                color: perfColor,
              }}
            >
              {perfScore}
            </span>
            <span
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#94a3b8",
              }}
            >
              /100
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              color: "#64748b",
            }}
          >
            <div>
              Load time: {scanResult?.loadTime || website?.loadTime || 0}ms
            </div>
            <div>
              Page size:{" "}
              {formatBytes(scanResult?.pageSize || website?.pageSize || 0)}
            </div>
          </div>
        </div>

        {/* Domain Expiration */}
        <DomainExpiryCard
          expiry={website.domainExpiryManual ?? website.domainExpiry}
          daysLeft={
            website.domainExpiryManual
              ? Math.ceil(
                  (new Date(website.domainExpiryManual).getTime() -
                    Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
              : website.domainDaysLeft
          }
          registrar={website.domainRegistrar}
        />

        {/* SEO Score */}
        {/* SEO Issues Detail */}
        {website.seoIssues && website.seoIssues.length > 0 && (
          <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-700 p-5 mt-2">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Search size={16} className="text-blue-600 dark:text-blue-400" />
              SEO Issues ({website.seoIssues.length})
            </h3>
            <div className="space-y-2">
              {website.seoIssues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                    issue.type === "critical"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-800 dark:text-red-300"
                      : issue.type === "warning"
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-300"
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 text-blue-800 dark:text-blue-300"
                  }`}
                >
                  {issue.type === "critical" ? (
                    <AlertTriangle
                      size={16}
                      className="text-red-500 dark:text-red-400 shrink-0 mt-0.5"
                    />
                  ) : issue.type === "warning" ? (
                    <AlertTriangle
                      size={16}
                      className="text-yellow-500 dark:text-yellow-400 shrink-0 mt-0.5"
                    />
                  ) : (
                    <Info
                      size={16}
                      className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5"
                    />
                  )}
                  <div>
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

        {/* ─── TECH STACK ─── */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Cpu
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#8b5cf6",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Tech Stack
            </h3>
          </div>

          {hasTechData ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.375rem",
              }}
            >
              {techData?.detected?.map((tech: any, i: number) => {
                const techName =
                  typeof tech === "string" ? tech : tech?.name || "Unknown";
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      fontWeight: "500",
                      padding: "0.25rem 0.625rem",
                      borderRadius: "9999px",
                      backgroundColor: "#f3f0ff",
                      color: "#7c3aed",
                      border: "1px solid #ddd6fe",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {techName}
                  </span>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "#94a3b8",
                  margin: 0,
                }}
              >
                No technologies detected yet
              </p>
              <button
                onClick={runTechScan}
                disabled={techScanning}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f0ff",
                  color: "#7c3aed",
                  border: "1px solid #ddd6fe",
                  borderRadius: "0.5rem",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  cursor: techScanning ? "not-allowed" : "pointer",
                  opacity: techScanning ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {techScanning ? (
                  <Loader2
                    style={{
                      width: "clamp(0.875rem, 2vw, 1rem)",
                      height: "clamp(0.875rem, 2vw, 1rem)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <Cpu
                    style={{
                      width: "clamp(0.875rem, 2vw, 1rem)",
                      height: "clamp(0.875rem, 2vw, 1rem)",
                    }}
                  />
                )}
                {techScanning ? "Detecting..." : "Detect Tech Stack"}
              </button>
            </div>
          )}
        </div>

        {/* ─── API HEALTH ─── */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Activity
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              API Health
            </h3>
            {scanResult?.headlessAvailable !== undefined && (
              <span
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  backgroundColor: scanResult.headlessAvailable
                    ? "#f0fdf4"
                    : "#f1f5f9",
                  color: scanResult.headlessAvailable ? "#15803d" : "#64748b",
                  fontWeight: "500",
                }}
              >
                {scanResult.headlessAvailable ? "Headless On" : "Headless Off"}
              </span>
            )}
          </div>

          {(scanResult?.apiChecks?.length ?? 0) > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              {scanResult!.apiChecks!.map(
                (
                  check: { endpoint: string; ok: boolean; status?: number },
                  i: number,
                ) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.375rem 0.5rem",
                      borderRadius: "0.375rem",
                      backgroundColor: "#f8fafc",
                      gap: "0.5rem",
                    }}
                  >
                    <code
                      style={{
                        fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                        color: "#64748b",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {check.endpoint}
                    </code>
                    <span
                      style={{
                        fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                        fontWeight: "600",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "0.25rem",
                        backgroundColor: check.ok ? "#f0fdf4" : "#fef2f2",
                        color: check.ok ? "#15803d" : "#dc2626",
                        flexShrink: 0,
                      }}
                    >
                      {check.ok ? "OK" : check.status || "404"}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#94a3b8",
              }}
            >
              No API endpoints checked
            </p>
          )}
        </div>

        {/* ─── SPA CRASH ─── */}
        {(scanResult?.spaCrashes ?? website?.spaCrashes) && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #fecaca",
              padding: "clamp(1rem, 3vw, 1.25rem)",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <AlertTriangle
                style={{
                  width: "clamp(1rem, 2.5vw, 1.25rem)",
                  height: "clamp(1rem, 2.5vw, 1.25rem)",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  fontWeight: "600",
                  color: "#dc2626",
                }}
              >
                SPA Crash Detected
              </h3>
            </div>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#7f1d1d",
              }}
            >
              The headless browser detected that the React/Vue/Angular app
              failed to mount properly.
            </p>
          </div>
        )}

        {/* ─── RUNTIME ERRORS ─── */}
        {(scanResult?.runtimeErrors?.length ??
          website?.runtimeErrors?.length ??
          0) > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              border: "1px solid #fed7aa",
              padding: "clamp(1rem, 3vw, 1.25rem)",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <Code
                style={{
                  width: "clamp(1rem, 2.5vw, 1.25rem)",
                  height: "clamp(1rem, 2.5vw, 1.25rem)",
                  color: "#f97316",
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                Runtime Errors (
                {scanResult?.runtimeErrors?.length ||
                  website?.runtimeErrors?.length ||
                  0}
                )
              </h3>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                maxHeight: "12rem",
                overflowY: "auto",
              }}
            >
              {(scanResult?.runtimeErrors ?? website?.runtimeErrors ?? []).map(
                (err: { message: string; source?: string }, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.375rem",
                      backgroundColor: "#fff7ed",
                      border: "1px solid #ffedd5",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        fontFamily: "monospace",
                        color: "#9a3412",
                        wordBreak: "break-all",
                        overflow: "hidden",
                      }}
                    >
                      {err.message}
                    </p>
                    {err.source && (
                      <p
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          color: "#c2410c",
                          marginTop: "0.25rem",
                          wordBreak: "break-all",
                          overflow: "hidden",
                        }}
                      >
                        {err.source}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* SSL Certificate */}
      {website.sslExpiry && (
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
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <Lock
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              SSL Certificate
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              gap: "clamp(1rem, 3vw, 2rem)",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Status",
                value: website.ssl,
                color: website.ssl === "valid" ? "#15803d" : "#dc2626",
              },
              { label: "Expires", value: website.sslExpiry, color: "#0f172a" },
              {
                label: "Days Left",
                value: `${website.sslDaysLeft} days`,
                color: (website.sslDaysLeft || 0) < 30 ? "#ef4444" : "#15803d",
              },
            ].map((item) => (
              <div key={item.label}>
                <p
                  style={{
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    color: "#94a3b8",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                    fontWeight: "600",
                    color: item.color,
                    wordBreak: "break-all",
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redirect Chain */}
      {website.redirectChain && website.redirectChain.length > 0 && (
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
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <Activity
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#f59e0b",
                flexShrink: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Redirect Chain
            </h3>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {website.redirectChain.map((url, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                }}
              >
                <span style={{ color: "#94a3b8", flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span
                  style={{
                    color: "#475569",
                    wordBreak: "break-all",
                    overflow: "hidden",
                  }}
                >
                  {url}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
