"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Zap,
  Globe,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Crown,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Logo from "@/components/Logo";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    websites: 2,
    interval: "30 min checks",
  },
  {
    id: "starter",
    name: "Starter",
    price: 3000,
    websites: 5,
    interval: "15 min checks",
  },
  {
    id: "pro",
    name: "Pro",
    price: 12000,
    websites: 30,
    interval: "5 min checks",
  },
  {
    id: "business",
    name: "Business",
    price: 22500,
    websites: 100,
    interval: "1 min checks",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOTP = async () => {
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setOtpSent(true);
      setStep("otp");
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { auth } = await import("@/lib/firebase-client");
      const firebaseAuth = await import("firebase/auth");
      await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
      await firebaseAuth.signOut(auth);
      await sendOTP();
    } catch (err: any) {
      console.error("[Login] Credential check failed:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password");
      } else {
        setError(err.message || "Login failed");
      }
    }
  };

  const verifyOTPAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, type: "login" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid code");

      const { auth } = await import("@/lib/firebase-client");
      const firebaseAuth = await import("firebase/auth");
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await userCredential.user.getIdToken();

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || "Login failed");

      router.push("/dashboard");
    } catch (err: any) {
      console.error("[Login] OTP flow error:", err);
      setOtpError(err.message || "Login failed");
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setOtp("");
    setOtpError("");
    await sendOTP();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#020617",
        flexDirection: "row",
      }}
    >
      {/* LEFT SIDE — Hidden on mobile, shown on tablet+ */}
      <div
        style={{
          flex: 1,
          display: "none",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(2rem, 5vw, 3rem) clamp(2rem, 5vw, 4rem)",
          gap: "clamp(1.5rem, 3vw, 2.5rem)",
        }}
        className="login-left-side"
      >
        <Logo variant="dark" size="small" showTagline={false} />

        <div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: "800",
              color: "#f1f5f9",
              lineHeight: 1.15,
              marginBottom: "0.75rem",
            }}
          >
            Monitor everything.
            <br />
            <span style={{ color: "#3b82f6" }}>Miss nothing.</span>
          </h1>
          <p
            style={{
              fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
              color: "#64748b",
              lineHeight: 1.7,
              maxWidth: "420px",
            }}
          >
            Real-time health checks, SSL tracking, and performance analytics for
            teams that ship fast.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.875rem",
            maxWidth: "520px",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                padding:
                  "clamp(0.75rem, 1.5vw, 1rem) clamp(1rem, 2vw, 1.25rem)",
                borderRadius: "0.75rem",
                backgroundColor: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(51,65,85,0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.375rem",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
                    fontWeight: "600",
                    color: "#94a3b8",
                  }}
                >
                  {plan.name}
                </span>
                {plan.id === "business" && (
                  <Crown
                    style={{
                      width: "0.875rem",
                      height: "0.875rem",
                      color: "#d97706",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(1rem, 2vw, 1.25rem)",
                    fontWeight: "700",
                    color: "#e2e8f0",
                  }}
                >
                  ₦{plan.price.toLocaleString()}
                </span>
                {plan.price > 0 && (
                  <span style={{ fontSize: "0.6875rem", color: "#475569" }}>
                    /mo
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "clamp(0.625rem, 1vw, 0.6875rem)",
                  color: "#475569",
                  marginTop: "0.25rem",
                }}
              >
                {plan.websites} sites · {plan.interval}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { icon: Zap, text: "Sub-second health checks" },
            { icon: Globe, text: "Up to 100 sites on Business" },
            { icon: CheckCircle2, text: "Instant outage alerts" },
          ].map((f, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <div
                style={{
                  width: "clamp(1.5rem, 2.5vw, 1.75rem)",
                  height: "clamp(1.5rem, 2.5vw, 1.75rem)",
                  borderRadius: "0.375rem",
                  backgroundColor: "rgba(37,99,235,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(37,99,235,0.15)",
                  flexShrink: 0,
                }}
              >
                <f.icon
                  style={{
                    width: "clamp(0.75rem, 1.2vw, 0.875rem)",
                    height: "clamp(0.75rem, 1.2vw, 0.875rem)",
                    color: "#3b82f6",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "clamp(0.75rem, 1.2vw, 0.875rem)",
                  color: "#94a3b8",
                  fontWeight: "500",
                }}
              >
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE — Full width on mobile, fixed on desktop */}
      <div
        style={{
          width: "100%",
          minWidth: "auto",
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.7)",
          backdropFilter: "blur(24px)",
          borderLeft: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(1.5rem, 5vw, 3rem)",
        }}
        className="login-right-side"
      >
        <div style={{ maxWidth: "400px", margin: "0 auto", width: "100%" }}>
          <h2
            style={{
              fontSize: "clamp(1.375rem, 3vw, 1.625rem)",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "0.375rem",
            }}
          >
            {step === "form" ? "Welcome back" : "Verify it's you"}
          </h2>
          <p
            style={{
              fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
              color: "#475569",
              marginBottom: "1.75rem",
            }}
          >
            {step === "form"
              ? "Sign in to your dashboard"
              : `We sent a 6-digit code to ${email}`}
          </p>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "0.625rem",
                marginBottom: "1rem",
              }}
            >
              <AlertTriangle
                style={{
                  width: "0.875rem",
                  height: "0.875rem",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>
                {error}
              </span>
            </div>
          )}

          {step === "form" ? (
            <form
              onSubmit={handleFormSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#475569",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Email
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Mail
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      width: "1rem",
                      height: "1rem",
                      color: "#334155",
                    }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                      backgroundColor: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(51,65,85,0.5)",
                      borderRadius: "0.625rem",
                      color: "#e2e8f0",
                      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.375rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: "0.75rem",
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontWeight: "500",
                    }}
                  >
                    Forgot?
                  </Link>
                </div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Lock
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      width: "1rem",
                      height: "1rem",
                      color: "#334155",
                    }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.75rem 0.75rem 2.5rem",
                      backgroundColor: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(51,65,85,0.5)",
                      borderRadius: "0.625rem",
                      color: "#e2e8f0",
                      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                      outline: "none",
                    }}
                  />
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.875rem",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "#475569",
                    }}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: "1rem", height: "1rem" }} />
                    ) : (
                      <Eye style={{ width: "1rem", height: "1rem" }} />
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                style={{
                  width: "100%",
                  padding: "0.8125rem",
                  backgroundColor: otpLoading ? "#1e3a5f" : "#1d4ed8",
                  color: "#dbeafe",
                  borderRadius: "0.625rem",
                  fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                  fontWeight: "600",
                  cursor: otpLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                  border: "none",
                }}
              >
                {otpLoading ? (
                  <Loader2
                    style={{
                      width: "1rem",
                      height: "1rem",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <>
                    Continue{" "}
                    <ArrowRight style={{ width: "1rem", height: "1rem" }} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={verifyOTPAndLogin}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#475569",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  6-Digit Code
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <KeyRound
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      width: "1rem",
                      height: "1rem",
                      color: "#334155",
                    }}
                  />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    required
                    maxLength={6}
                    style={{
                      width: "100%",
                      padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                      backgroundColor: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(51,65,85,0.5)",
                      borderRadius: "0.625rem",
                      color: "#e2e8f0",
                      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                      outline: "none",
                      letterSpacing: "0.5rem",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>

              {otpError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: "0.625rem",
                  }}
                >
                  <AlertTriangle
                    style={{
                      width: "0.875rem",
                      height: "0.875rem",
                      color: "#ef4444",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "0.8125rem", color: "#fca5a5" }}>
                    {otpError}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                style={{
                  width: "100%",
                  padding: "0.8125rem",
                  backgroundColor:
                    loading || otp.length !== 6 ? "#1e3a5f" : "#1d4ed8",
                  color: "#dbeafe",
                  borderRadius: "0.625rem",
                  fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                  fontWeight: "600",
                  cursor:
                    loading || otp.length !== 6 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  border: "none",
                }}
              >
                {loading ? (
                  <Loader2
                    style={{
                      width: "1rem",
                      height: "1rem",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <>
                    Verify & Sign In{" "}
                    <ArrowRight style={{ width: "1rem", height: "1rem" }} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resendOTP}
                disabled={otpLoading}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  backgroundColor: "transparent",
                  color: "#3b82f6",
                  borderRadius: "0.625rem",
                  fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                  fontWeight: "500",
                  cursor: otpLoading ? "not-allowed" : "pointer",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                {otpLoading ? "Sending..." : "Resend Code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                  setOtpError("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.375rem",
                  color: "#64748b",
                  fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft style={{ width: "0.875rem", height: "0.875rem" }} />{" "}
                Use different account
              </button>
            </form>
          )}

          {/* ⬇️ ADDED: Legal links */}
          <div
            style={{
              marginTop: "1.25rem",
              textAlign: "center",
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            By signing in, you agree to our{" "}
            <Link
              href="/terms-of-service"
              style={{ color: "#3b82f6", textDecoration: "none" }}
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              style={{ color: "#3b82f6", textDecoration: "none" }}
            >
              Privacy Policy
            </Link>
          </div>

          <div
            style={{
              marginTop: "1rem",
              textAlign: "center",
              fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
              color: "#475569",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
