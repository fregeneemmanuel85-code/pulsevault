"use client";

import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRight,
  Activity,
  TrendingUp,
  Loader2,
  Shield,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";
import DnsMonitor from "./components/DnsMonitor";
import {
  addWebsite,
  updateWebsite,
  addAlertWithNotifications,
  addHealthHistory,
  subscribeToWebsites,
  subscribeToAlerts,
  getUserPlan,
  getAllWebsites,
  cleanupOldIncidents,
  type Website,
  type Alert,
  type PriorityLevel,
} from "@/lib/firestore";

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  critical: 3,
  high: 2,
  normal: 1,
};

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

function getPriorityConfig(priority: PriorityLevel) {
  if (priority === "critical")
    return {
      label: "Critical",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.1)",
      icon: Star,
    };
  if (priority === "high")
    return {
      label: "High",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      icon: Star,
    };
  return {
    label: "Normal",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    icon: Star,
  };
}

/* ─── ISSUES BAR CHART ─── */
function IssuesBarChart({ websites }: { websites: Website[] }) {
  const data = [
    {
      label: "Broken Links",
      value: websites.reduce((sum, w) => sum + (w.brokenLinks || 0), 0),
      color: "#ef4444",
    },
    {
      label: "Broken Plugins",
      value: websites.reduce((sum, w) => sum + (w.brokenPlugins || 0), 0),
      color: "#f97316",
    },
    {
      label: "JS Errors",
      value: websites.reduce((sum, w) => sum + (w.jsErrors || 0), 0),
      color: "#eab308",
    },
    {
      label: "Broken Forms",
      value: websites.reduce(
        (sum, w) =>
          sum +
          ((w.totalForms || 0) > 0 && w.formsWorking === false
            ? w.totalForms || 0
            : 0),
        0,
      ),
      color: "#8b5cf6",
    },
    {
      label: "Mixed Content",
      value: websites.filter((w) => w.mixedContent).length,
      color: "#ec4899",
    },
    {
      label: "SSL Issues",
      value: websites.filter((w) => w.ssl === "expired" || w.ssl === "expiring")
        .length,
      color: "#dc2626",
    },
  ].filter((d) => d.value > 0);

  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "1rem",
        border: "1px solid var(--border-color)",
        padding: "clamp(1rem, 3vw, 1.25rem)",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
          fontWeight: "600",
          color: "var(--text-primary)",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
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
        Issues Detected
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "clamp(0.5rem, 2vw, 1rem)",
          height: "clamp(140px, 25vw, 180px)",
          paddingBottom: "1.5rem",
          position: "relative",
        }}
      >
        {data.map((item) => {
          const barHeight = (item.value / max) * 100;
          return (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "0.375rem",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  fontWeight: "700",
                  color: item.color,
                }}
              >
                {item.value}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: "48px",
                  height: `${barHeight}%`,
                  minHeight: "4px",
                  backgroundColor: item.color,
                  borderRadius: "0.375rem 0.375rem 0 0",
                  transition: "height 0.5s ease-out",
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("normal");
  const [domainExpiryManual, setDomainExpiryManual] = useState("");
  const [checking, setChecking] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const autoScanRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Dashboard] Auth ready, UID:", user.uid);
        setAuthReady(true);
      } else {
        console.log("[Dashboard] No Firebase user — redirecting to login");
        window.location.href = "/login";
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    console.log("[Dashboard] Subscribing to Firestore...");

    cleanupOldIncidents(30).catch(console.error);

    const unsubSites = subscribeToWebsites((data) => {
      setWebsites(data);
      setLoading(false);
    });
    const unsubAlerts = subscribeToAlerts((data) => {
      console.log("[Alerts] Received", data.length, "alerts from Firestore");
      setAlerts(data);
    });
    getUserPlan().then(setPlan);

    return () => {
      unsubSites();
      unsubAlerts();
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !plan) return;

    if (autoScanRef.current) {
      clearInterval(autoScanRef.current);
      autoScanRef.current = null;
    }

    const intervalMinutes = plan.checkInterval || 30;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log("[AutoScan] Starting timer:", intervalMinutes, "minutes");

    const runAutoScan = async () => {
      console.log("[AutoScan] Running scheduled scan...");
      const sites = await getAllWebsites();
      const sortedSites = sites
        .filter((s) => s.isMonitoring)
        .sort(
          (a, b) =>
            (PRIORITY_ORDER[b.priority || "normal"] || 0) -
            (PRIORITY_ORDER[a.priority || "normal"] || 0),
        );
      console.log(
        "[AutoScan] Priority order:",
        sortedSites
          .map((s) => `${s.name}(${s.priority || "normal"})`)
          .join(", "),
      );
      for (const site of sortedSites) {
        await runDeepScan(site);
      }
    };
    runAutoScan();

    autoScanRef.current = setInterval(runAutoScan, intervalMs);

    return () => {
      console.log("[AutoScan] Stopping timer");
      if (autoScanRef.current) {
        clearInterval(autoScanRef.current);
        autoScanRef.current = null;
      }
    };
  }, [authReady, plan?.checkInterval, plan?.planId]);

  const runDeepScan = async (site: Website) => {
    try {
      console.log("[Scan] Starting scan for", site.url);

      const auth = getAuth();
      if (!auth.currentUser) {
        console.log("[Scan] Skipped — user logged out");
        return;
      }

      const res = await fetch("/api/scan-deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: site.url }),
      });

      if (!res.ok) {
        throw new Error("API returned " + res.status);
      }

      const result = await res.json();
      console.log("[Scan] API result:", result.status, result.healthScore);

      if (result.error) {
        throw new Error(result.error);
      }

      const linksList = result.links?.list || [];
      const detectedPlugins = result.plugins?.detected || [];
      const brokenPlugins = result.plugins?.broken || [];
      const formsList = result.forms?.list || [];
      const consoleErrors = result.consoleErrors || [];
      const apiChecks = result.apiChecks || [];
      const performance = result.performance || {
        loadTime: 0,
        pageSize: 0,
        score: 100,
      };
      const ssl = result.ssl || { valid: false, expiry: null, daysLeft: 0 };
      const securityHeaders = result.securityHeaders || {
        hsts: false,
        xFrame: false,
        xContentType: false,
        csp: false,
      };
      const redirectChain = result.redirectChain || [];

      const storedResult = {
        timestamp: result.timestamp || new Date().toISOString(),
        links: linksList,
        plugins: detectedPlugins.map((name: string) => ({
          name,
          status: brokenPlugins.includes(name) ? "broken" : "ok",
        })),
        forms: formsList,
        consoleErrors,
        apiChecks,
        loadTime: performance.loadTime || 0,
        pageSize: performance.pageSize || 0,
        resourceErrors: [],
      };

      console.log("[Scan] Updating website in Firestore...");
      await updateWebsite(site.id, {
        status: result.status || "offline",
        health: typeof result.healthScore === "number" ? result.healthScore : 0,
        httpStatus: result.httpStatus || 0,
        responseTime: (result.responseTime || 0) + "ms",
        ssl: ssl.valid ? (ssl.daysLeft < 30 ? "expiring" : "valid") : "expired",
        sslExpiry: ssl.expiry || null,
        sslDaysLeft: ssl.daysLeft || null,
        dnsResolved: result.dns?.resolved ?? null,
        dnsIp: result.dns?.ip || null,
        dnsStatus: result.dns?.resolved ? "ok" : "failed",
        brokenLinks: result.links?.broken || 0,
        totalLinks: result.links?.total || 0,
        brokenPlugins: brokenPlugins.length,
        totalPlugins: detectedPlugins.length,
        formsWorking: result.forms?.working ?? true,
        totalForms: result.forms?.total || 0,
        jsErrors: result.jsErrors || 0,
        performanceScore: performance.score || 100,
        mixedContent: result.mixedContent || false,
        securityHeaders,
        redirectChain,
        scanResults: storedResult,
        lastChecked: new Date().toISOString(),
      });
      console.log("[Scan] Website updated successfully");

      try {
        await addHealthHistory({
          websiteId: site.id,
          timestamp: new Date().toISOString(),
          health:
            typeof result.healthScore === "number" ? result.healthScore : 0,
          status: result.status || "offline",
          responseTime: result.responseTime || 0,
          loadTime: performance.loadTime || 0,
          pageSize: performance.pageSize || 0,
          brokenLinks: result.links?.broken || 0,
          jsErrors: result.jsErrors || 0,
        });
        console.log("[Scan] Health history recorded for", site.name);
      } catch (e: any) {
        console.error("[Scan] Failed to record health history:", e.message);
      }

      const errors: string[] = [];
      if (result.links?.broken > 0)
        errors.push(result.links.broken + " broken links");
      if (brokenPlugins.length > 0)
        errors.push(brokenPlugins.length + " broken plugins");
      if (result.jsErrors > 0) errors.push(result.jsErrors + " JS errors");
      if (result.forms?.total > 0 && !result.forms?.working)
        errors.push(result.forms.total + " broken forms");
      if (result.mixedContent) errors.push("mixed content issues");
      if (result.httpStatus >= 400)
        errors.push("HTTP " + result.httpStatus + " error");
      if (performance.loadTime > 5000)
        errors.push("slow load time (" + performance.loadTime + "ms)");
      if (!ssl.valid) errors.push("SSL certificate invalid");
      else if (ssl.daysLeft < 30)
        errors.push("SSL expiring in " + ssl.daysLeft + " days");

      const errorDetails =
        errors.length > 0
          ? errors.join(", ")
          : "General health issues detected";
      console.log("[Alert] Detected issues:", errorDetails);

      if (result.links?.broken > 0) {
        try {
          await addAlertWithNotifications({
            type: "Broken Links",
            target: site.name,
            websiteId: site.id,
            message:
              result.links.broken +
              " of " +
              result.links.total +
              " links are broken on " +
              site.url,
            severity: "warning",
            status: "open",
          });
        } catch (e: any) {
          console.error("[Alert] Broken links alert failed:", e.message);
        }
      }

      if (result.forms?.working === false && result.forms?.total > 0) {
        try {
          await addAlertWithNotifications({
            type: "Form Issues",
            target: site.name,
            websiteId: site.id,
            message:
              result.forms.total +
              " form(s) missing action or method attributes",
            severity: "warning",
            status: "open",
          });
        } catch (e: any) {
          console.error("[Alert] Form issues alert failed:", e.message);
        }
      }

      if (result.mixedContent) {
        try {
          await addAlertWithNotifications({
            type: "Mixed Content",
            target: site.name,
            websiteId: site.id,
            message: "Insecure HTTP resources found on HTTPS page",
            severity: "warning",
            status: "open",
          });
        } catch (e: any) {
          console.error("[Alert] Mixed content alert failed:", e.message);
        }
      }

      if (result.status === "critical" || result.status === "warning") {
        try {
          console.log("[Alert] Creating detailed health check alert...");
          await addAlertWithNotifications({
            type: "Health Check Alert",
            target: site.name,
            websiteId: site.id,
            message:
              errorDetails + ". Health score: " + result.healthScore + "%",
            severity: result.status === "critical" ? "critical" : "warning",
            status: "open",
          });
          console.log("[Alert] Health check alert created with:", errorDetails);
        } catch (e: any) {
          console.error("[Alert] Health check alert failed:", e.message);
        }
      }

      console.log("[Scan] All done for", site.url);
    } catch (err: any) {
      console.error("[Scan] Deep scan failed:", err.message);
      await updateWebsite(site.id, {
        status: "offline",
        health: 0,
        dnsResolved: false,
        dnsIp: null,
        dnsStatus: "failed",
        responseTime: "Timeout",
        lastChecked: new Date().toISOString(),
      });
      try {
        await addAlertWithNotifications({
          type: "Site Offline",
          target: site.name,
          websiteId: site.id,
          message: "Site is completely offline or unreachable: " + site.url,
          severity: "critical",
          status: "open",
        });
      } catch (e: any) {
        console.error("[Alert] Offline alert failed:", e.message);
      }
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || checking) return;

    const planData = plan || { websites: 2, planName: "Free" };
    const maxSites = planData.websites || 2;
    if (websites.length >= maxSites) {
      alert(
        "You have reached the limit of " +
          maxSites +
          " websites on your " +
          planData.planName +
          " plan. Upgrade to add more.",
      );
      return;
    }

    setChecking(true);
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;

    const checkInterval = plan?.checkInterval || 30;

    const site = await addWebsite({
      name: newName.trim() || url.replace(/^https?:\/\//, ""),
      url,
      status: "checking",
      health: 0,
      uptime: "-",
      responseTime: "-",
      ssl: "checking",
      lastChecked: "Just now",
      isMonitoring: true,
      checkInterval: checkInterval,
      domainExpiryManual: domainExpiryManual || null,
      incidents: 0,
      priority: newPriority,
    });

    setNewUrl("");
    setNewName("");
    setNewPriority("normal");
    setDomainExpiryManual("");
    setShowAdd(false);

    await runDeepScan(site);

    setChecking(false);
  };

  const healthy = websites.filter((w) => w.status === "healthy").length;
  const warning = websites.filter((w) => w.status === "warning").length;
  const critical = websites.filter((w) => w.status === "critical").length;
  const offline = websites.filter((w) => w.status === "offline").length;

  const recentAlerts = alerts
    .filter((a) => {
      const alertTime = new Date(a.createdAt).getTime();
      return Date.now() - alertTime < 24 * 60 * 60 * 1000;
    })
    .slice(0, 5);

  const getColor = (status: string) => {
    if (status === "healthy")
      return { bg: "rgba(34,197,94,0.1)", text: "#22c55e", dot: "#22c55e" };
    if (status === "offline")
      return { bg: "rgba(239,68,68,0.1)", text: "#ef4444", dot: "#ef4444" };
    if (status === "critical")
      return { bg: "rgba(220,38,38,0.1)", text: "#dc2626", dot: "#dc2626" };
    return { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", dot: "#f59e0b" };
  };

  const currentPlanLevel = PLAN_ORDER[plan?.planId || "free"] || 0;
  const canUsePriority = currentPlanLevel >= 2;

  if (!authReady) {
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
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: "700",
              color: "var(--text-primary)",
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            }}
          >
            Overview of your monitoring
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAdd(true)}
            disabled={checking}
            style={{
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus
              style={{
                width: "clamp(0.875rem, 2.5vw, 1rem)",
                height: "clamp(0.875rem, 2.5vw, 1rem)",
                display: "inline",
                marginRight: "0.5rem",
                verticalAlign: "middle",
              }}
            />
            {checking ? "Scanning..." : "Add Website"}
          </button>
          <Link
            href="/dashboard/websites"
            style={{
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-secondary)",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              fontWeight: "500",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            View All
            <ArrowRight
              style={{
                width: "clamp(0.875rem, 2.5vw, 1rem)",
                height: "clamp(0.875rem, 2.5vw, 1rem)",
                marginLeft: "0.375rem",
              }}
            />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        {[
          {
            label: "Total Monitored",
            value: websites.length,
            icon: Globe,
            color: "#2563eb",
            bg: "rgba(37,99,235,0.1)",
            sub: "websites",
          },
          {
            label: "Healthy",
            value: healthy,
            icon: CheckCircle2,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.1)",
            sub: "up and running",
          },
          {
            label: "Warning",
            value: warning,
            icon: AlertTriangle,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.1)",
            sub: "need attention",
          },
          {
            label: "Critical",
            value: critical,
            icon: AlertTriangle,
            color: "#dc2626",
            bg: "rgba(220,38,38,0.1)",
            sub: "urgent issues",
          },
          {
            label: "Offline",
            value: offline,
            icon: XCircle,
            color: "#ef4444",
            bg: "rgba(239,68,68,0.1)",
            sub: "down now",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "1rem",
                border: "1px solid var(--border-color)",
                padding: "clamp(1rem, 3vw, 1.25rem)",
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
                <div
                  style={{
                    width: "clamp(2rem, 5vw, 2.5rem)",
                    height: "clamp(2rem, 5vw, 2.5rem)",
                    borderRadius: "0.75rem",
                    backgroundColor: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{
                      width: "clamp(1rem, 2.5vw, 1.25rem)",
                      height: "clamp(1rem, 2.5vw, 1.25rem)",
                      color: s.color,
                    }}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {s.value}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "var(--text-muted)",
                }}
              >
                {s.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Issues Bar Chart */}
      <IssuesBarChart websites={websites} />

      {/* DNS Monitor */}
      <DnsMonitor websites={websites} loading={loading} />

      {/* Recent Alerts + Website Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
        }}
      >
        {/* Recent Alerts */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "1rem",
            border: "1px solid var(--border-color)",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Activity
                style={{
                  width: "clamp(1rem, 2.5vw, 1.25rem)",
                  height: "clamp(1rem, 2.5vw, 1.25rem)",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              />
              <h2
                style={{
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                }}
              >
                Recent Alerts
              </h2>
            </div>
            <span
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              Last 24h
            </span>
          </div>

          {recentAlerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <CheckCircle2
                style={{
                  width: "clamp(1.5rem, 4vw, 2rem)",
                  height: "clamp(1.5rem, 4vw, 2rem)",
                  color: "#22c55e",
                  margin: "0 auto 0.5rem",
                }}
              />
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "var(--text-muted)",
                }}
              >
                No alerts in the last 24 hours
              </p>
              <p
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "var(--text-muted)",
                }}
              >
                All systems operational
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    backgroundColor:
                      alert.severity === "critical"
                        ? "rgba(239,68,68,0.06)"
                        : "rgba(245,158,11,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor:
                        alert.severity === "critical" ? "#ef4444" : "#f59e0b",
                      marginTop: "0.375rem",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                        fontWeight: "500",
                        color: "var(--text-primary)",
                      }}
                    >
                      {alert.type}
                    </p>
                    <p
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {alert.target}
                    </p>
                    <p
                      style={{
                        fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                      fontWeight: "600",
                      padding: "0.125rem 0.5rem",
                      borderRadius: "0.25rem",
                      backgroundColor:
                        alert.status === "open"
                          ? "rgba(239,68,68,0.08)"
                          : "rgba(34,197,94,0.08)",
                      color: alert.status === "open" ? "#ef4444" : "#22c55e",
                      flexShrink: 0,
                    }}
                  >
                    {alert.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/dashboard/alerts"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "1rem",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            View all alerts &rarr;
          </Link>
        </div>

        {/* Website Status */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "1rem",
            border: "1px solid var(--border-color)",
            padding: "clamp(1rem, 3vw, 1.25rem)",
            minWidth: 0,
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
            <TrendingUp
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#2563eb",
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              Website Status
            </h2>
          </div>

          {websites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <Globe
                style={{
                  width: "clamp(1.5rem, 4vw, 2rem)",
                  height: "clamp(1.5rem, 4vw, 2rem)",
                  color: "var(--text-muted)",
                  margin: "0 auto 0.5rem",
                }}
              />
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "var(--text-muted)",
                }}
              >
                No websites monitored yet
              </p>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  marginTop: "0.75rem",
                  padding:
                    "clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)",
                  backgroundColor: "rgba(37,99,235,0.08)",
                  color: "#2563eb",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Add your first website
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {websites
                .slice(0, 5)
                .sort(
                  (a, b) =>
                    (PRIORITY_ORDER[b.priority || "normal"] || 0) -
                    (PRIORITY_ORDER[a.priority || "normal"] || 0),
                )
                .map((site) => {
                  const colors = getColor(site.status);
                  const pConfig = getPriorityConfig(site.priority || "normal");
                  return (
                    <Link
                      key={site.id}
                      href={`/dashboard/websites/${site.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "clamp(0.625rem, 2vw, 0.875rem)",
                        borderRadius: "0.625rem",
                        border: "1px solid var(--border-light)",
                        backgroundColor: "var(--bg-input)",
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "50%",
                            backgroundColor: colors.dot,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              flexWrap: "wrap",
                            }}
                          >
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
                              {site.name || site.url}
                            </p>
                            {(site.priority === "high" ||
                              site.priority === "critical") && (
                              <span
                                style={{
                                  fontSize: "clamp(0.5625rem, 1.5vw, 0.625rem)",
                                  fontWeight: "600",
                                  padding: "0.125rem 0.375rem",
                                  borderRadius: "0.25rem",
                                  backgroundColor: pConfig.bg,
                                  color: pConfig.color,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.125rem",
                                }}
                              >
                                <Star
                                  style={{
                                    width: "clamp(0.5rem, 1.5vw, 0.625rem)",
                                    height: "clamp(0.5rem, 1.5vw, 0.625rem)",
                                  }}
                                />
                                {pConfig.label}
                              </span>
                            )}
                          </div>
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
                            {site.url}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "clamp(0.5rem, 2vw, 0.75rem)",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                              fontWeight: "600",
                              color: colors.text,
                              margin: 0,
                            }}
                          >
                            {site.health ?? 0}%
                          </p>
                          <p
                            style={{
                              fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                              color: "var(--text-muted)",
                              margin: 0,
                            }}
                          >
                            {site.responseTime || "-"}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Shield
                            style={{
                              width: "clamp(0.75rem, 2vw, 0.875rem)",
                              height: "clamp(0.75rem, 2vw, 0.875rem)",
                              color:
                                site.ssl === "valid"
                                  ? "#22c55e"
                                  : site.ssl === "expiring"
                                    ? "#f59e0b"
                                    : "#ef4444",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              display: "none",
                            }}
                            className="ssl-label"
                          >
                            {site.ssl || "-"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Clock
                            style={{
                              width: "clamp(0.75rem, 2vw, 0.875rem)",
                              height: "clamp(0.75rem, 2vw, 0.875rem)",
                              color: "var(--text-muted)",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                              color: "var(--text-muted)",
                              display: "none",
                            }}
                            className="last-checked-label"
                          >
                            {site.lastChecked || "-"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              {websites.length > 5 && (
                <Link
                  href="/dashboard/websites"
                  style={{
                    textAlign: "center",
                    padding: "0.75rem",
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  +{websites.length - 5} more websites &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Website Modal */}
      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "1rem",
              padding: "clamp(1rem, 4vw, 1.5rem)",
              width: "100%",
              maxWidth: "28rem",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "clamp(1.125rem, 4vw, 1.25rem)",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              Add Website
            </h2>
            <p
              style={{
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                color: "var(--text-muted)",
                marginBottom: "1.25rem",
              }}
            >
              Enter the URL of the website you want to monitor
            </p>

            <form
              onSubmit={add}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Website URL
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "clamp(0.5rem, 2vw, 0.625rem) 0.875rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Website"
                  style={{
                    width: "100%",
                    padding: "clamp(0.5rem, 2vw, 0.625rem) 0.875rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Priority Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Priority Level
                  {!canUsePriority && (
                    <span
                      style={{
                        fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                        color: "#8b5cf6",
                        marginLeft: "0.5rem",
                        fontWeight: "400",
                      }}
                    >
                      (Pro feature)
                    </span>
                  )}
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {(["normal", "high", "critical"] as PriorityLevel[]).map(
                    (p) => {
                      const pConfig = getPriorityConfig(p);
                      const isLocked = !canUsePriority && p !== "normal";
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => !isLocked && setNewPriority(p)}
                          disabled={isLocked}
                          style={{
                            flex: 1,
                            minWidth: "70px",
                            padding:
                              "clamp(0.375rem, 1.5vw, 0.5rem) clamp(0.5rem, 2vw, 0.75rem)",
                            borderRadius: "0.5rem",
                            border:
                              newPriority === p
                                ? `2px solid ${pConfig.color}`
                                : "1px solid var(--border-color)",
                            backgroundColor:
                              newPriority === p
                                ? pConfig.bg
                                : isLocked
                                  ? "var(--bg-icon)"
                                  : "var(--bg-input)",
                            color: isLocked
                              ? "var(--text-muted)"
                              : pConfig.color,
                            fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                            fontWeight: "600",
                            cursor: isLocked ? "not-allowed" : "pointer",
                            opacity: isLocked ? 0.5 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                            textTransform: "capitalize",
                          }}
                        >
                          <Star
                            style={{
                              width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                              height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                              fill:
                                newPriority === p
                                  ? pConfig.color
                                  : "transparent",
                            }}
                          />
                          {pConfig.label}
                        </button>
                      );
                    },
                  )}
                </div>
                {!canUsePriority && (
                  <p
                    style={{
                      fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                      color: "var(--text-muted)",
                      marginTop: "0.375rem",
                    }}
                  >
                    Upgrade to Pro to unlock High and Critical priority levels.
                  </p>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Domain Expires (optional)
                </label>
                <input
                  type="date"
                  value={domainExpiryManual}
                  onChange={(e) => setDomainExpiryManual(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "clamp(0.5rem, 2vw, 0.625rem) 0.875rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
                <p
                  style={{
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  We'll alert you 30 days before expiry
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-secondary)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checking || !newUrl.trim()}
                  style={{
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
                    backgroundColor: checking ? "#93c5fd" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    cursor:
                      checking || !newUrl.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {checking ? "Scanning..." : "Add & Scan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
