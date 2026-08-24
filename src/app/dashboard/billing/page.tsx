"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Check,
  CreditCard,
  Loader2,
  Sparkles,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import {
  subscribeToUserPlan,
  setUserPlan,
  subscribeToInvoices,
  subscribeToWebsites,
  addInvoice,
  type UserPlan,
  type Invoice,
} from "@/lib/firestore";
import {
  getPlanConfig,
  checkSubscriptionStatus,
  formatFileStorage,
} from "@/lib/subscription";

interface PlanOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  websites: number;
  checkInterval: string;
  aiCredits: number;
  fileStorage: number;
  features: string[];
}

const plans: PlanOption[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "NGN",
    interval: "",
    websites: 2,
    checkInterval: "30 minutes",
    aiCredits: 100,
    fileStorage: 100 * 1024 * 1024,
    features: [
      "2 websites monitoring",
      "30-minute check interval",
      "Uptime monitoring",
      "SSL certificate monitoring",
      "DNS monitoring",
      "SEO monitoring",
      "Domain expiration monitoring",
      "API health checks",
      "Form validation checks",
      "JavaScript error detection",
      "Plugin failure detection",
      "HTTP 4xx/5xx detection",
      "AI Assistant: 100 credits/day",
      "In-app alerts only",
      "Health score tracking (0-100)",
      "Performance insights",
      "File Vault: 100 MB storage",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 3000,
    currency: "NGN",
    interval: "/month",
    websites: 5,
    checkInterval: "15 minutes",
    aiCredits: 500,
    fileStorage: 300 * 1024 * 1024,
    features: [
      "5 websites monitoring",
      "15-minute check interval",
      "All Free features",
      "Email alerts",
      "Daily/weekly summaries",
      "AI Assistant: 500 credits/day",
      "Incident history tracking",
      "File Vault: 300 MB storage",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 12000,
    currency: "NGN",
    interval: "/month",
    websites: 30,
    checkInterval: "5 minutes",
    aiCredits: 1000,
    fileStorage: 500 * 1024 * 1024,
    features: [
      "30 websites monitoring",
      "5-minute check interval",
      "All Starter features",
      "Priority monitoring queue",
      "AI Assistant: 1,000 credits/day",
      "Advanced reporting",
      "Faster detection",
      "File Vault: 500 MB storage",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 22500,
    currency: "NGN",
    interval: "/month",
    websites: 100,
    checkInterval: "1 minute",
    aiCredits: 10000,
    fileStorage: 1024 * 1024 * 1024,
    features: [
      "100 websites monitoring",
      "1-minute check interval",
      "All Pro features",
      "Advanced reporting",
      "AI Assistant: 10,000 credits/day",
      "Priority AI queue",
      "White Label",
      "File Vault: 1 GB storage",
    ],
  },
];

export default function BillingPage() {
  const router = useRouter();

  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [websiteCount, setWebsiteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paystackReady, setPaystackReady] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const pendingPlanRef = useRef<PlanOption | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (scriptLoadedRef.current) return;
    if ((window as any).PaystackPop) {
      setPaystackReady(true);
      scriptLoadedRef.current = true;
      return;
    }

    const existing = document.querySelector(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      const checkReady = setInterval(() => {
        if ((window as any).PaystackPop) {
          setPaystackReady(true);
          scriptLoadedRef.current = true;
          clearInterval(checkReady);
        }
      }, 200);
      return () => clearInterval(checkReady);
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      setPaystackReady(true);
      scriptLoadedRef.current = true;
    };
    script.onerror = () => {
      console.error("[Paystack] Failed to load script");
    };
    document.body.appendChild(script);

    return () => {};
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const unsubPlan = subscribeToUserPlan((plan) => {
      setCurrentPlan(plan);
      setLoading(false);
    });
    const unsubInvoices = subscribeToInvoices((inv) => {
      setInvoices(inv);
    });
    const unsubSites = subscribeToWebsites((sites) => {
      setWebsiteCount(sites.length);
    });
    return () => {
      unsubPlan();
      unsubInvoices();
      unsubSites();
    };
  }, [authReady]);

  const planStatus = currentPlan
    ? checkSubscriptionStatus(currentPlan as any)
    : "active";
  const daysUntilExpiry = currentPlan?.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(currentPlan.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;
  const graceDaysLeft = currentPlan?.gracePeriodEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(currentPlan.gracePeriodEnd).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const onPaystackSuccess = function (response: any) {
    const plan = pendingPlanRef.current;
    if (!plan) return;

    fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: response.reference }),
    })
      .then((res) => res.json())
      .then((verifyData) => {
        if (!verifyData.verified) {
          alert("Payment verification failed. Please contact support.");
          setProcessingPlanId(null);
          pendingPlanRef.current = null;
          return;
        }

        // Call the new renew API instead of direct Firestore write
        return fetch("/api/billing/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, txRef: response.reference }),
        }).then((res) => res.json());
      })
      .then((renewData) => {
        if (renewData?.success) {
          return addInvoice({
            date: new Date().toLocaleDateString(),
            amount: "NGN " + plan.price.toLocaleString(),
            status: "Paid",
            plan: plan.name,
            txRef: response.reference,
          });
        }
      })
      .then(() => {
        alert("Payment successful! You are now on the " + plan.name + " plan.");
        setProcessingPlanId(null);
        pendingPlanRef.current = null;
      })
      .catch((err) => {
        console.error("Payment processing error:", err);
        alert("Something went wrong. Please contact support.");
        setProcessingPlanId(null);
        pendingPlanRef.current = null;
      });
  };

  const onPaystackClose = function () {
    setProcessingPlanId(null);
    pendingPlanRef.current = null;
  };

  const handlePayment = function (plan: PlanOption) {
    if (plan.price === 0) {
      // Downgrade to Free
      fetch("/api/billing/downgrade", { method: "POST" })
        .then(() => {
          alert("Downgraded to Free plan successfully!");
        })
        .catch((err) => {
          console.error(err);
          alert("Failed to downgrade. Please try again.");
        });
      return;
    }

    if (!paystackReady || !(window as any).PaystackPop) {
      alert(
        "Payment system still loading... please wait a moment and try again",
      );
      return;
    }

    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      alert("Payment configuration error. Please contact support.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user?.email || "user@pulsevault.com";

    setProcessingPlanId(plan.id);
    pendingPlanRef.current = plan;

    const txRef =
      "PV-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    try {
      const handler = (window as any).PaystackPop.setup({
        key: paystackKey,
        email: userEmail,
        amount: plan.price * 100,
        currency: "NGN",
        ref: txRef,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          userId: user?.uid || "",
          custom_fields: [
            { display_name: "Plan", variable_name: "plan", value: plan.name },
          ],
        },
        callback: onPaystackSuccess,
        onClose: onPaystackClose,
      });
      handler.openIframe();
    } catch (err: any) {
      alert("Failed to initialize payment. Please try again.");
      setProcessingPlanId(null);
      pendingPlanRef.current = null;
    }
  };

  const planUsage = currentPlan
    ? {
        used: websiteCount,
        limit: currentPlan.websites,
        percent: Math.round((websiteCount / currentPlan.websites) * 100),
        checkInterval: currentPlan.checkInterval + " minutes",
        price: currentPlan.price,
        aiCredits:
          plans.find((p) => p.id === currentPlan.planId)?.aiCredits || 100,
        fileStorage:
          plans.find((p) => p.id === currentPlan.planId)?.fileStorage ||
          100 * 1024 * 1024,
      }
    : {
        used: websiteCount,
        limit: 2,
        percent: Math.round((websiteCount / 2) * 100),
        checkInterval: "30 minutes",
        price: 0,
        aiCredits: 100,
        fileStorage: 100 * 1024 * 1024,
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
        gap: "clamp(1rem, 3vw, 2rem)",
        padding: "0 clamp(0.5rem, 2vw, 1rem)",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          Billing
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
          }}
        >
          Manage your subscription and payment
        </p>
      </div>

      {/* Current Plan */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "clamp(0.75rem, 2vw, 1rem)",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              Current Plan
            </h2>
            <p
              style={{
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                color: "#64748b",
                marginTop: "0.25rem",
              }}
            >
              {currentPlan?.planName || "Free"}
              {currentPlan?.expiresAt && planStatus === "active" && (
                <span style={{ color: "#22c55e", marginLeft: "0.5rem" }}>
                  · Expires in {daysUntilExpiry} day
                  {daysUntilExpiry !== 1 ? "s" : ""}
                </span>
              )}
              {planStatus === "grace" && (
                <span style={{ color: "#f59e0b", marginLeft: "0.5rem" }}>
                  · Grace period: {graceDaysLeft} day
                  {graceDaysLeft !== 1 ? "s" : ""} left
                </span>
              )}
              {planStatus === "expired" && (
                <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                  · Expired — downgraded to Free
                </span>
              )}
            </p>
          </div>
          <span
            style={{
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              fontWeight: "600",
              padding: "clamp(0.25rem, 1vw, 0.375rem) clamp(0.5rem, 2vw, 1rem)",
              borderRadius: "9999px",
              backgroundColor:
                planStatus === "expired"
                  ? "#fef2f2"
                  : planStatus === "grace"
                    ? "#fffbeb"
                    : currentPlan?.planId === "free"
                      ? "#f0fdf4"
                      : "#eff6ff",
              color:
                planStatus === "expired"
                  ? "#b91c1c"
                  : planStatus === "grace"
                    ? "#b45309"
                    : currentPlan?.planId === "free"
                      ? "#15803d"
                      : "#2563eb",
              flexShrink: 0,
            }}
          >
            {planStatus === "expired"
              ? "Expired"
              : planStatus === "grace"
                ? "Grace Period"
                : currentPlan?.status === "active"
                  ? "Active"
                  : "Free"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(1rem, 3vw, 2rem)",
            marginTop: "clamp(0.75rem, 2vw, 1rem)",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Websites",
              value: `${planUsage.used} / ${planUsage.limit}`,
              extra: (
                <div
                  style={{
                    width: "clamp(5rem, 12vw, 8rem)",
                    height: "0.5rem",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "9999px",
                    marginTop: "0.5rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: planUsage.percent + "%",
                      height: "100%",
                      backgroundColor:
                        planUsage.percent > 90 ? "#ef4444" : "#2563eb",
                      borderRadius: "9999px",
                    }}
                  />
                </div>
              ),
            },
            { label: "Check Interval", value: planUsage.checkInterval },
            {
              label: "AI Credits",
              value: `${planUsage.aiCredits.toLocaleString()}/day`,
              icon: <Sparkles size={12} style={{ color: "#f59e0b" }} />,
            },
            {
              label: "File Vault",
              value: formatFileStorage(planUsage.fileStorage),
              icon: <HardDrive size={12} style={{ color: "#60a5fa" }} />,
            },
            {
              label: "Price",
              value: `NGN ${planUsage.price.toLocaleString()}`,
              suffix: "/mo",
            },
          ].map((item) => (
            <div key={item.label}>
              <p
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                {item.icon}
                {item.label}
              </p>
              <p
                style={{
                  fontSize: "clamp(1rem, 3vw, 1.25rem)",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginTop: "0.25rem",
                }}
              >
                {item.value}
                {item.suffix && (
                  <span
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#94a3b8",
                      fontWeight: "400",
                    }}
                  >
                    {item.suffix}
                  </span>
                )}
              </p>
              {item.extra}
            </div>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div>
        <h2
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: "clamp(0.75rem, 2vw, 1rem)",
          }}
        >
          Choose a Plan
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
            gap: "clamp(0.75rem, 2vw, 1rem)",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border:
                  currentPlan?.planId === plan.id
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                padding: "clamp(1rem, 3vw, 1.5rem)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {currentPlan?.planId === plan.id && (
                <span
                  style={{
                    position: "absolute",
                    top: "-0.625rem",
                    right: "clamp(0.75rem, 2vw, 1rem)",
                    fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                    fontWeight: "600",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    whiteSpace: "nowrap",
                  }}
                >
                  Current
                </span>
              )}

              <h3
                style={{
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                {plan.name}
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.25rem",
                  marginTop: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(1.5rem, 4vw, 2rem)",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  NGN {plan.price.toLocaleString()}
                </span>
                {plan.interval && (
                  <span
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#94a3b8",
                    }}
                  >
                    {plan.interval}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "#64748b",
                  marginTop: "0.25rem",
                }}
              >
                {plan.websites} websites · {plan.checkInterval} checks ·{" "}
                {plan.aiCredits.toLocaleString()} AI credits ·{" "}
                {formatFileStorage(plan.fileStorage)} files
              </p>

              <ul
                style={{
                  marginTop: "clamp(0.75rem, 2vw, 1.25rem)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  flex: 1,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {plan.features.map((f) => {
                  const isComingSoon = f === "White Label";
                  return (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                        color: "#475569",
                      }}
                    >
                      <Check
                        style={{
                          width: "clamp(0.75rem, 2vw, 0.875rem)",
                          height: "clamp(0.75rem, 2vw, 0.875rem)",
                          color: "#22c55e",
                          flexShrink: 0,
                          marginTop: "0.125rem",
                        }}
                      />
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {f}
                        {isComingSoon && (
                          <span
                            style={{
                              fontSize: "clamp(0.625rem, 1.5vw, 0.6875rem)",
                              fontWeight: "600",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "9999px",
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Coming Soon
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => handlePayment(plan)}
                disabled={
                  processingPlanId !== null ||
                  (currentPlan?.planId === plan.id && planStatus === "active")
                }
                style={{
                  width: "100%",
                  marginTop: "clamp(1rem, 3vw, 1.5rem)",
                  padding: "clamp(0.5rem, 2vw, 0.625rem)",
                  borderRadius: "0.5rem",
                  border: plan.price === 0 ? "1px solid #e2e8f0" : "none",
                  backgroundColor:
                    currentPlan?.planId === plan.id && planStatus === "active"
                      ? "#f1f5f9"
                      : plan.price === 0
                        ? "white"
                        : "#2563eb",
                  color:
                    currentPlan?.planId === plan.id && planStatus === "active"
                      ? "#94a3b8"
                      : plan.price === 0
                        ? "#475569"
                        : "white",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  cursor:
                    currentPlan?.planId === plan.id && planStatus === "active"
                      ? "default"
                      : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {currentPlan?.planId === plan.id && planStatus === "active"
                  ? "Current Plan"
                  : plan.price === 0
                    ? "Downgrade"
                    : processingPlanId === plan.id
                      ? "Processing..."
                      : planStatus === "expired" && plan.id !== "free"
                        ? "Reactivate"
                        : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: "clamp(0.75rem, 2vw, 1rem)",
          }}
        >
          Payment Method
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.5rem, 2vw, 1rem)",
            padding: "clamp(0.75rem, 2vw, 1rem)",
            border: "1px dashed #e2e8f0",
            borderRadius: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <CreditCard
            style={{
              width: "clamp(1.25rem, 3vw, 1.5rem)",
              height: "clamp(1.25rem, 3vw, 1.5rem)",
              color: "#94a3b8",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                color: "#64748b",
              }}
            >
              {currentPlan?.planId === "free"
                ? "No payment method required for Free plan"
                : "Payments processed securely via Paystack"}
            </p>
            <p
              style={{
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                color: "#94a3b8",
                marginTop: "0.125rem",
              }}
            >
              {currentPlan?.planId === "free"
                ? "Upgrade to add a payment method"
                : "Card, bank transfer, and USSD accepted"}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice History */}
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
            marginBottom: "clamp(0.75rem, 2vw, 1rem)",
          }}
        >
          Invoice History
        </h2>
        {invoices.length === 0 ? (
          <p
            style={{
              color: "#94a3b8",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
            }}
          >
            No invoices yet
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
                  {["Invoice", "Date", "Plan", "Amount", "Status"].map((h) => (
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
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.id.slice(0, 8)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.date}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.plan}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.amount}
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
                          padding: "0.25rem 0.625rem",
                          borderRadius: "0.25rem",
                          backgroundColor:
                            inv.status === "Paid" ? "#f0fdf4" : "#fffbeb",
                          color: inv.status === "Paid" ? "#15803d" : "#b45309",
                        }}
                      >
                        {inv.status}
                      </span>
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
