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
  X,
} from "lucide-react";
import {
  subscribeToUserPlan,
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
import { useToast } from "@/components/ToastProvider";

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
  const { showToast } = useToast();

  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [websiteCount, setWebsiteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paystackReady, setPaystackReady] = useState(false);
  const [flutterwaveReady, setFlutterwaveReady] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "paystack" | "flutterwave"
  >("paystack");
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const pendingPlanRef = useRef<PlanOption | null>(null);
  const scriptLoadedRef = useRef({ paystack: false, flutterwave: false });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Load Paystack script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (scriptLoadedRef.current.paystack) return;
    if ((window as any).PaystackPop) {
      setPaystackReady(true);
      scriptLoadedRef.current.paystack = true;
      return;
    }

    const existing = document.querySelector(
      'script[src="https://js.paystack.co/v1/inline.js"]',
    );
    if (existing) {
      const checkReady = setInterval(() => {
        if ((window as any).PaystackPop) {
          setPaystackReady(true);
          scriptLoadedRef.current.paystack = true;
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
      scriptLoadedRef.current.paystack = true;
    };
    script.onerror = () => console.error("[Paystack] Failed to load script");
    document.body.appendChild(script);
  }, []);

  // Load Flutterwave script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (scriptLoadedRef.current.flutterwave) return;
    if ((window as any).FlutterwaveCheckout) {
      setFlutterwaveReady(true);
      scriptLoadedRef.current.flutterwave = true;
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.flutterwave.com/v3.js"]',
    );
    if (existing) {
      const checkReady = setInterval(() => {
        if ((window as any).FlutterwaveCheckout) {
          setFlutterwaveReady(true);
          scriptLoadedRef.current.flutterwave = true;
          clearInterval(checkReady);
        }
      }, 200);
      return () => clearInterval(checkReady);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    script.onload = () => {
      setFlutterwaveReady(true);
      scriptLoadedRef.current.flutterwave = true;
    };
    script.onerror = () => console.error("[Flutterwave] Failed to load script");
    document.body.appendChild(script);
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

  // ─── PAYSTACK ───
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
          showToast(
            "Payment verification failed. Please contact support.",
            "error",
          );
          setProcessingPlanId(null);
          pendingPlanRef.current = null;
          return;
        }

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
        showToast(
          `Payment successful! You are now on the ${plan.name} plan.`,
          "success",
        );
        setProcessingPlanId(null);
        pendingPlanRef.current = null;
      })
      .catch((err) => {
        console.error("Payment processing error:", err);
        showToast("Something went wrong. Please contact support.", "error");
        setProcessingPlanId(null);
        pendingPlanRef.current = null;
      });
  };

  const onPaystackClose = function () {
    setProcessingPlanId(null);
    pendingPlanRef.current = null;
  };

  // ─── FLUTTERWAVE ───
  const handleFlutterwavePayment = function (plan: PlanOption) {
    if (!flutterwaveReady || !(window as any).FlutterwaveCheckout) {
      showToast(
        "Payment system still loading... please wait a moment and try again",
        "warning",
      );
      return;
    }

    const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
    if (!flutterwaveKey) {
      showToast("Flutterwave not configured. Please contact support.", "error");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user?.email || "user@pulsevault.com";
    const userName = user?.displayName || userEmail.split("@")[0];

    setProcessingPlanId(plan.id);
    pendingPlanRef.current = plan;

    const txRef =
      "PV-FW-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    try {
      (window as any).FlutterwaveCheckout({
        public_key: flutterwaveKey,
        tx_ref: txRef,
        amount: plan.price,
        currency: "NGN",
        payment_options: "card,ussd,banktransfer",
        customer: {
          email: userEmail,
          name: userName,
          phone_number: "",
        },
        customizations: {
          title: "PulseVault",
          description: `Payment for ${plan.name} plan`,
          logo: "https://pulsevault.website/logo.png",
        },
        callback: function (response: any) {
          // Close Flutterwave modal
          const modal = document.querySelector("#flutterwave-overlay");
          if (modal) (modal as any).remove?.();

          if (response.status === "successful") {
            fetch("/api/billing/flutterwave/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction_id: response.transaction_id,
                planId: plan.id,
                txRef,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  return addInvoice({
                    date: new Date().toLocaleDateString(),
                    amount: "NGN " + plan.price.toLocaleString(),
                    status: "Paid",
                    plan: plan.name,
                    txRef,
                  }).then(() => {
                    showToast(
                      `Payment successful! You are now on the ${plan.name} plan.`,
                      "success",
                    );
                  });
                } else {
                  showToast(
                    data.error || "Payment verification failed",
                    "error",
                  );
                }
              })
              .catch((err) => {
                console.error("[Flutterwave] Post-payment error:", err);
                showToast(
                  "Payment verification failed. Please contact support.",
                  "error",
                );
              })
              .finally(() => {
                setProcessingPlanId(null);
                pendingPlanRef.current = null;
              });
          } else {
            showToast("Payment was not successful. Please try again.", "error");
            setProcessingPlanId(null);
            pendingPlanRef.current = null;
          }
        },
        onclose: function () {
          setProcessingPlanId(null);
          pendingPlanRef.current = null;
        },
      });
    } catch (err: any) {
      showToast("Failed to initialize Flutterwave. Please try again.", "error");
      setProcessingPlanId(null);
      pendingPlanRef.current = null;
    }
  };

  // ─── DOWNGRADE ───
  const confirmDowngrade = function () {
    setShowDowngradeConfirm(false);
    fetch("/api/billing/downgrade", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showToast("Downgraded to Free plan successfully!", "success");
        } else {
          showToast(data.error || "Downgrade failed", "error");
        }
      })
      .catch((err) => {
        console.error(err);
        showToast("Failed to downgrade. Please try again.", "error");
      });
  };

  // ─── MAIN PAYMENT HANDLER ───
  const handlePayment = function (plan: PlanOption) {
    if (plan.price === 0) {
      setShowDowngradeConfirm(true);
      return;
    }

    if (paymentMethod === "paystack") {
      if (!paystackReady || !(window as any).PaystackPop) {
        showToast(
          "Paystack still loading... please wait a moment and try again",
          "warning",
        );
        return;
      }

      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!paystackKey) {
        showToast("Paystack not configured. Please contact support.", "error");
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
        showToast("Failed to initialize Paystack. Please try again.", "error");
        setProcessingPlanId(null);
        pendingPlanRef.current = null;
      }
    } else {
      handleFlutterwavePayment(plan);
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
        position: "relative",
      }}
    >
      {/* ─── DOWNGRADE CONFIRMATION MODAL ─── */}
      {showDowngradeConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowDowngradeConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "clamp(1.5rem, 4vw, 2rem)",
              maxWidth: "28rem",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <h3
              style={{
                fontSize: "clamp(1rem, 3vw, 1.25rem)",
                fontWeight: "700",
                color: "#0f172a",
                marginBottom: "0.75rem",
              }}
            >
              Downgrade to Free?
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              Are you sure you want to downgrade to the Free plan? You will lose
              premium features and only 2 websites will remain active. All your
              data is preserved.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "white",
                  color: "#475569",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDowngrade}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Yes, Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Payment Method Selector */}
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
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            {
              id: "paystack" as const,
              name: "Paystack",
              desc: "Card, bank transfer, USSD",
              flag: "🇳🇬",
            },
            {
              id: "flutterwave" as const,
              name: "Flutterwave",
              desc: "Card, bank, mobile money",
              flag: "🌍",
            },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "clamp(0.75rem, 2vw, 1rem)",
                borderRadius: "0.75rem",
                border:
                  paymentMethod === method.id
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                backgroundColor:
                  paymentMethod === method.id ? "#eff6ff" : "white",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{method.flag}</span>
                <span
                  style={{
                    fontWeight: "600",
                    color: "#0f172a",
                    fontSize: "0.875rem",
                  }}
                >
                  {method.name}
                </span>
                {paymentMethod === method.id && (
                  <Check
                    size={14}
                    style={{ color: "#2563eb", marginLeft: "auto" }}
                  />
                )}
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                {method.desc}
              </p>
            </button>
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
