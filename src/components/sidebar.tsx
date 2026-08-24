"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  LayoutDashboard,
  Bell,
  Users,
  CreditCard,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Crown,
  LogOut,
  Shield,
  Lock,
  HelpCircle,
  Siren, // ← add
  GlobeLock,
  Search,
  BarChart3,
  HardDrive,
} from "lucide-react";
import {
  subscribeToWebsites,
  subscribeToAlerts,
  subscribeToUserPlan,
  getSettings,
  type Website,
  type Alert,
  type UserPlan,
} from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import LogoIcon from "@/components/LogoIcon";

const navItems = [
  { label: "Websites", href: "/dashboard/websites", icon: Globe, plan: "free" },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    plan: "free",
  },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell, plan: "free" },
  {
    label: "File Vault",
    href: "/dashboard/files",
    icon: HardDrive,
    plan: "free",
  },
  {
    label: "Incidents",
    href: "/dashboard/incidents",
    icon: Siren,
    plan: "starter",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    plan: "business",
  },
  { label: "SSL Monitor", href: "/dashboard/ssl", icon: Shield, plan: "free" },
  {
    label: "Domain Monitor",
    href: "/dashboard/domains",
    icon: GlobeLock,
    plan: "free",
  },
  {
    label: "SEO Monitor",
    href: "/dashboard/seo",
    icon: Search,
    plan: "free",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    plan: "free",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    plan: "free",
  },
  {
    label: "Support",
    href: "/dashboard/support",
    icon: HelpCircle,
    plan: "free",
  },
];

const PLAN_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

const PLAN_CONFIG: Record<
  string,
  { name: string; limit: number; color: string; bg: string }
> = {
  free: { name: "Free Plan", limit: 2, color: "#64748b", bg: "#f1f5f9" },
  starter: { name: "Starter Plan", limit: 5, color: "#2563eb", bg: "#eff6ff" },
  pro: { name: "Pro Plan", limit: 30, color: "#8b5cf6", bg: "#f5f3ff" },
  business: {
    name: "Business Plan",
    limit: 100,
    color: "#d97706",
    bg: "#fffbeb",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [userName, setUserName] = useState("Admin User");
  const [photoURL, setPhotoURL] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Detect dark mode from document/data-theme
  useEffect(() => {
    const checkTheme = () => {
      const dark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // Wait for Firebase Auth BEFORE touching Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("[Sidebar] Auth ready, UID:", firebaseUser.uid);
        setAuthReady(true);
      } else {
        console.log("[Sidebar] No Firebase user");
        setAuthReady(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Only subscribe to Firestore AFTER auth is ready
  useEffect(() => {
    if (!authReady) return;

    console.log("[Sidebar] Subscribing to Firestore...");
    const unsubSites = subscribeToWebsites((data) => {
      setWebsites(data);
      setLoading(false);
    });
    const unsubAlerts = subscribeToAlerts((data) => {
      setAlerts(data);
    });
    const unsubPlan = subscribeToUserPlan((p) => {
      setPlan(p);
    });

    getSettings().then((s) => {
      if (s?.name) setUserName(s.name);
      if (s?.photoURL) setPhotoURL(s.photoURL);
    });

    return () => {
      unsubSites();
      unsubAlerts();
      unsubPlan();
    };
  }, [authReady]);

  // Mobile detection
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync sidebar width to CSS variable for layout
  useEffect(() => {
    if (isMobile) {
      document.documentElement.style.setProperty("--sidebar-width", "0px");
    } else {
      const width = collapsed ? "4rem" : "16rem";
      document.documentElement.style.setProperty("--sidebar-width", width);
    }
  }, [collapsed, isMobile]);

  const healthy = websites.filter((w) => w.status === "healthy").length;
  const offline = websites.filter((w) => w.status === "offline").length;
  const openAlerts = alerts.filter((a) => a.status === "open").length;

  const planConfig = PLAN_CONFIG[plan?.planId || "free"];
  const siteCount = websites.length;
  const nearLimit = siteCount >= planConfig.limit * 0.9;

  const sidebarWidth = collapsed
    ? "clamp(3.5rem, 10vw, 5rem)"
    : "clamp(14rem, 30vw, 16rem)";

  const currentPlanLevel = PLAN_ORDER[plan?.planId || "free"] || 0;

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed",
            top: "clamp(0.75rem, 3vw, 1rem)",
            left: "clamp(0.75rem, 3vw, 1rem)",
            zIndex: 60,
            padding: "clamp(0.5rem, 2vw, 0.625rem)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Menu
            style={{
              width: "clamp(1rem, 3vw, 1.25rem)",
              height: "clamp(1rem, 3vw, 1.25rem)",
              color: "var(--text-primary)",
            }}
          />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          transition: "width 0.3s ease, transform 0.3s ease",
          backgroundColor: "var(--bg-card)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          transform:
            isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "clamp(0.75rem, 2.5vw, 1.25rem)",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "0.5rem",
          }}
        >
          {!collapsed && (
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                minWidth: 0,
                flex: 1,
              }}
            >
              <Logo
                variant={isDark ? "dark" : "light"}
                size="small"
                showTagline={false}
              />
            </Link>
          )}
          {collapsed && !isMobile && (
            <div style={{ margin: "0 auto" }}>
              <LogoIcon variant={isDark ? "dark" : "light"} size={32} />
            </div>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "0.375rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X
                style={{
                  width: "clamp(1rem, 3vw, 1.25rem)",
                  height: "clamp(1rem, 3vw, 1.25rem)",
                  color: "var(--text-muted)",
                }}
              />
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                padding: "0.375rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {collapsed ? (
                <ChevronRight
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                  }}
                />
              ) : (
                <ChevronLeft
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                  }}
                />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "clamp(0.5rem, 1.5vw, 0.75rem)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const requiredPlanLevel = PLAN_ORDER[item.plan] || 0;
            const isLocked = currentPlanLevel < requiredPlanLevel;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? "0" : "clamp(0.5rem, 1.5vw, 0.75rem)",
                  padding:
                    "clamp(0.5rem, 1.5vw, 0.625rem) clamp(0.5rem, 2vw, 0.875rem)",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  color: isActive ? "#2563eb" : "var(--text-muted)",
                  backgroundColor: isActive
                    ? "var(--bg-badge-blue)"
                    : "transparent",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  justifyContent: collapsed ? "center" : "flex-start",
                  flexShrink: 0,
                  opacity: isLocked ? 0.5 : 1,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon
                  style={{
                    width: "clamp(1rem, 2.5vw, 1.125rem)",
                    height: "clamp(1rem, 2.5vw, 1.125rem)",
                    flexShrink: 0,
                  }}
                />
                {!collapsed && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                    {isLocked && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "clamp(0.5625rem, 1.5vw, 0.625rem)",
                          fontWeight: "600",
                          padding: "0.125rem 0.375rem",
                          borderRadius: "0.25rem",
                          backgroundColor: "var(--bg-icon)",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        <Lock
                          style={{
                            width: "clamp(0.5rem, 1.5vw, 0.625rem)",
                            height: "clamp(0.5rem, 1.5vw, 0.625rem)",
                          }}
                        />
                        {item.plan === "starter"
                          ? "Starter"
                          : item.plan === "pro"
                            ? "Pro"
                            : "Business"}
                      </span>
                    )}
                    {item.label === "Alerts" && openAlerts > 0 && !isLocked && (
                      <span
                        style={{
                          fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                          fontWeight: "600",
                          padding: "0.125rem clamp(0.375rem, 1.5vw, 0.5rem)",
                          borderRadius: "9999px",
                          backgroundColor: "var(--bg-badge-red)",
                          color: "var(--text-red)",
                          flexShrink: 0,
                        }}
                      >
                        {openAlerts}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "clamp(0.75rem, 2vw, 1rem)",
            borderTop: "1px solid var(--border-light)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(0.5rem, 1.5vw, 0.75rem)",
            }}
          >
            {/* Profile Picture */}
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile"
                style={{
                  width: "clamp(1.75rem, 4vw, 2.25rem)",
                  height: "clamp(1.75rem, 4vw, 2.25rem)",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--border-color)",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: "clamp(1.75rem, 4vw, 2.25rem)",
                  height: "clamp(1.75rem, 4vw, 2.25rem)",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(0.625rem, 2vw, 0.75rem)",
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {getInitials(userName)}
                </span>
              </div>
            )}

            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.email || userName}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                    fontWeight: "500",
                    color: planConfig.color,
                    backgroundColor: planConfig.bg,
                    padding: "0.125rem clamp(0.375rem, 1.5vw, 0.5rem)",
                    borderRadius: "0.25rem",
                    width: "fit-content",
                    marginTop: "0.125rem",
                  }}
                >
                  {plan?.planId === "business" && (
                    <Crown
                      style={{
                        width: "clamp(0.625rem, 1.5vw, 0.75rem)",
                        height: "clamp(0.625rem, 1.5vw, 0.75rem)",
                      }}
                    />
                  )}
                  {planConfig.name}
                </div>
              </div>
            )}
          </div>

          {/* Usage bar */}
          {!collapsed && !loading && authReady && (
            <div
              style={{
                marginTop: "clamp(0.5rem, 1.5vw, 0.75rem)",
                padding: "clamp(0.5rem, 1.5vw, 0.625rem)",
                borderRadius: "0.5rem",
                backgroundColor: "var(--bg-icon)",
                border: "1px solid var(--border-light)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                  color: "var(--text-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                <span style={{ color: nearLimit ? "#ef4444" : "inherit" }}>
                  {siteCount}/{planConfig.limit} sites
                </span>
                <span>{offline} offline</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "clamp(0.1875rem, 0.5vw, 0.25rem)",
                  backgroundColor: "var(--border-color)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width:
                      planConfig.limit > 0
                        ? Math.min((siteCount / planConfig.limit) * 100, 100) +
                          "%"
                        : "0%",
                    height: "100%",
                    backgroundColor: nearLimit ? "#ef4444" : "#22c55e",
                    borderRadius: "9999px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              {nearLimit && (
                <p
                  style={{
                    fontSize: "clamp(0.5625rem, 1.5vw, 0.625rem)",
                    color: "#ef4444",
                    marginTop: "0.375rem",
                    textAlign: "center",
                  }}
                >
                  {planConfig.limit - siteCount} slots left
                </p>
              )}
            </div>
          )}

          {/* Logout button */}
          {!collapsed && (
            <button
              onClick={logout}
              style={{
                marginTop: "clamp(0.5rem, 1.5vw, 0.75rem)",
                width: "100%",
                padding: "clamp(0.375rem, 1.5vw, 0.5rem)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: "0.5rem",
                color: "#ef4444",
                fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.375rem",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.08)";
              }}
            >
              <LogOut
                style={{
                  width: "clamp(0.75rem, 2vw, 0.875rem)",
                  height: "clamp(0.75rem, 2vw, 0.875rem)",
                }}
              />
              Log out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
