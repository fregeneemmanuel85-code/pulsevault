"use client";

import { useState } from "react";
import {
  ArrowRight,
  Loader2,
  Globe,
  Shield,
  Link2,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function HeroChecker() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;

    try {
      const res = await fetch("/api/check-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      if (!res.ok) throw new Error("Check failed");

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError("Could not reach that site. Make sure the URL is correct.");
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Healthy";
    if (score >= 50) return "Needs Attention";
    return "Critical Issues";
  };

  return (
    <div style={{ width: "100%", maxWidth: "40rem", margin: "0 auto" }}>
      {/* Input */}
      <form
        onSubmit={check}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "0.5rem",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(51, 65, 85, 0.6)",
          borderRadius: "1rem",
          padding: "0.5rem",
          backdropFilter: "blur(8px)",
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          disabled={loading}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "#f1f5f9",
            fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
            padding: "0.75rem 1rem",
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            backgroundColor: loading ? "#1e40af" : "#1d4ed8",
            color: "white",
            border: "none",
            borderRadius: "0.75rem",
            padding: "0.75rem 1.5rem",
            fontWeight: "600",
            fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            whiteSpace: "nowrap",
            opacity: loading || !url.trim() ? 0.7 : 1,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            flexShrink: 0,
          }}
        >
          {loading ? (
            <>
              <Loader2
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span style={{ display: "inline" }}>Scanning...</span>
            </>
          ) : (
            <>
              <span style={{ display: "inline" }}>Check</span>
              <ArrowRight style={{ width: "1.25rem", height: "1.25rem" }} />
            </>
          )}
        </button>
      </form>

      {/* Mobile: stack the button below on very small screens via CSS */}
      <style>{`
        @media (max-width: 400px) {
          form { flex-direction: column !important; }
          form button { width: 100%; justify-content: center; }
        }
        @keyframes resultSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .result-animate {
          animation: resultSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "0.75rem",
            color: "#fca5a5",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            animation: "resultSlideIn 0.4s ease forwards",
          }}
        >
          <AlertTriangle
            style={{ width: "1rem", height: "1rem", flexShrink: 0 }}
          />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div
          className="result-animate"
          style={{
            marginTop: "1.5rem",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(51, 65, 85, 0.5)",
            borderRadius: "1rem",
            padding: "clamp(1.25rem, 3vw, 1.5rem)",
            textAlign: "left",
            transform: "perspective(1000px)",
            transition: "transform 0.4s ease, box-shadow 0.4s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform =
              "perspective(1000px) rotateX(1deg) rotateY(-1deg) translateZ(10px)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 20px 40px -10px rgba(37, 99, 235, 0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform =
              "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                }}
              >
                SCAN RESULT
              </p>
              <p
                style={{
                  color: "#f1f5f9",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  wordBreak: "break-all",
                }}
              >
                {url}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontWeight: "800",
                  color: getHealthColor(result.healthScore || 0),
                  lineHeight: 1,
                }}
              >
                {typeof result.healthScore === "number"
                  ? result.healthScore
                  : 0}
                %
              </p>
              <p style={{ color: "#64748b", fontSize: "0.75rem" }}>
                {getHealthLabel(result.healthScore || 0)}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              {
                label: "Status",
                value:
                  result.status === "healthy"
                    ? "Online"
                    : result.status === "offline"
                      ? "Offline"
                      : "Issues",
                icon: Globe,
                color:
                  result.status === "healthy"
                    ? "#22c55e"
                    : result.status === "offline"
                      ? "#ef4444"
                      : "#f59e0b",
              },
              {
                label: "Load Time",
                value: result.responseTime ? `${result.responseTime}ms` : "—",
                icon: Clock,
                color:
                  (result.responseTime || 0) < 1000
                    ? "#22c55e"
                    : (result.responseTime || 0) < 3000
                      ? "#f59e0b"
                      : "#ef4444",
              },
              {
                label: "SSL",
                value: result.ssl?.valid ? "Valid" : "Issue",
                icon: Shield,
                color: result.ssl?.valid ? "#22c55e" : "#ef4444",
              },
              {
                label: "Broken Links",
                value: result.links?.broken || 0,
                icon: Link2,
                color:
                  (result.links?.broken || 0) === 0 ? "#22c55e" : "#f59e0b",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: "rgba(30, 41, 59, 0.5)",
                    borderRadius: "0.75rem",
                    padding: "0.875rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px) scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0) scale(1)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Icon
                      style={{
                        width: "0.875rem",
                        height: "0.875rem",
                        color: item.color,
                      }}
                    />
                    <span style={{ color: "#64748b", fontSize: "0.7rem" }}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#f1f5f9",
                      fontWeight: "700",
                      fontSize: "1rem",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.12)",
              borderRadius: "0.75rem",
              padding: "0.875rem 1rem",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
            }}
          >
            <AlertTriangle
              style={{
                width: "1rem",
                height: "1rem",
                color: "#f59e0b",
                flexShrink: 0,
                marginTop: "0.125rem",
              }}
            />
            <p
              style={{
                color: "#d4d4d8",
                fontSize: "0.8125rem",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This is a quick surface check. For full diagnostics — forms,
              JavaScript errors, plugins, security headers, and deep crawling —{" "}
              <a
                href="/register"
                style={{
                  color: "#fbbf24",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                run a deep scan →
              </a>
            </p>
          </div>

          {/* CTA */}
          <div
            style={{
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              borderRadius: "0.75rem",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <CheckCircle2
              style={{
                width: "1.25rem",
                height: "1.25rem",
                color: "#60a5fa",
                flexShrink: 0,
              }}
            />
            <p style={{ color: "#93c5fd", fontSize: "0.875rem", margin: 0 }}>
              Want automatic checks every 30 minutes?{" "}
              <a
                href="/register"
                style={{
                  color: "#60a5fa",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                Monitor free →
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
