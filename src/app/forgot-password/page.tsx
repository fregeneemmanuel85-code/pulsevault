"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { auth } = await import("@/lib/firebase-client");
      const firebaseAuth = await import("firebase/auth");
      await firebaseAuth.sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      console.error("[ForgotPassword] Error:", err.code, err.message);
      if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "clamp(0.75rem, 3vw, 1rem)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1.5rem, 5vw, 2rem)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "clamp(1rem, 3vw, 1.5rem)",
          }}
        >
          <div
            style={{
              width: "clamp(2.5rem, 7vw, 3rem)",
              height: "clamp(2.5rem, 7vw, 3rem)",
              borderRadius: "0.75rem",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto clamp(0.75rem, 2vw, 1rem)",
            }}
          >
            <Mail
              style={{
                width: "clamp(1.25rem, 3vw, 1.5rem)",
                height: "clamp(1.25rem, 3vw, 1.5rem)",
                color: "white",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
              fontWeight: "700",
              color: "#0f172a",
              margin: 0,
            }}
          >
            Reset Password
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              marginTop: "0.5rem",
            }}
          >
            {sent
              ? "Check your inbox for the reset link"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "clamp(2.5rem, 7vw, 3rem)",
                height: "clamp(2.5rem, 7vw, 3rem)",
                borderRadius: "50%",
                backgroundColor: "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto clamp(0.75rem, 2vw, 1rem)",
              }}
            >
              <CheckCircle2
                style={{
                  width: "clamp(1.25rem, 3vw, 1.5rem)",
                  height: "clamp(1.25rem, 3vw, 1.5rem)",
                  color: "#22c55e",
                }}
              />
            </div>
            <p
              style={{
                color: "#334155",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                marginBottom: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                marginBottom: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setSent(false);
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  fontWeight: "500",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                try again
              </button>
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#2563eb",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                fontWeight: "500",
                textDecoration: "none",
              }}
            >
              <ArrowLeft
                style={{
                  width: "clamp(0.875rem, 2vw, 1rem)",
                  height: "clamp(0.875rem, 2vw, 1rem)",
                }}
              />
              Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.75rem, 2vw, 1rem)",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  color: "#334155",
                  marginBottom: "0.375rem",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: "100%",
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) 1rem clamp(0.5rem, 2vw, 0.625rem) 2.5rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#2563eb";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding:
                    "clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                  color: "#dc2626",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                }}
              >
                <AlertCircle
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    flexShrink: 0,
                  }}
                />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "clamp(0.625rem, 2vw, 0.75rem)",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                fontWeight: "500",
                cursor: loading || !email ? "not-allowed" : "pointer",
                opacity: loading || !email ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {loading ? (
                <Loader2
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Send
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                  }}
                />
              )}
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div style={{ textAlign: "center" }}>
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  color: "#64748b",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <ArrowLeft
                  style={{
                    width: "clamp(0.75rem, 2vw, 0.875rem)",
                    height: "clamp(0.75rem, 2vw, 0.875rem)",
                  }}
                />
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
