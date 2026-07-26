"use client";

import { useState } from "react";
import { HelpCircle, Mail, ChevronRight } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    q: "How often does PulseVault check my website?",
    a: "Check frequency depends on your plan. Free plans check every 30 minutes, Starter every 15 minutes, Pro every 5 minutes, and Business every minute.",
  },
  {
    q: "What is the Health Score?",
    a: "Health Score is a weighted composite metric (0-100) combining uptime (30%), API (20%), SSL (10%), DNS (10%), forms (10%), JS errors (10%), and plugins (10%).",
  },
  {
    q: "Can I monitor private/internal websites?",
    a: "Yes, but you'll need to whitelist our monitoring IP addresses in your firewall.",
  },
  {
    q: "How do I set up email alerts?",
    a: "Go to Settings → Notifications and toggle Email alerts. Make sure your email is verified.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      <div>
        <h1
          style={{
            fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          Support
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            marginTop: "0.25rem",
          }}
        >
          Get help with PulseVault
        </p>
      </div>

      {/* Contact Options */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "clamp(0.75rem, 2vw, 1rem)",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Twitter/X */}
        <a
          href="https://x.com/PulseVault01"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.5rem)",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            transition: "box-shadow 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 6px -1px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#eff6ff",
              borderRadius: "0.75rem",
              width: "fit-content",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
              }}
            >
              <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
              <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.25rem",
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
              }}
            >
              Twitter / X
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              @PulseVault01
            </p>
          </div>
        </a>

        {/* Telegram */}
        <a
          href="https://t.me/PulseVaultsupport"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.5rem)",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            transition: "box-shadow 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 6px -1px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#f0f9ff",
              borderRadius: "0.75rem",
              width: "fit-content",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
              }}
            >
              <path d="M21.5 4.5l-3.5 16.5l-9.5 -6.5l-3.5 -1.5l16.5 -8.5z" />
              <path d="M14.5 14l-3.5 -3.5l-6.5 3.5" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.25rem",
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
              }}
            >
              Telegram
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              @PulseVaultsupport
            </p>
          </div>
        </a>

        {/* Email Support */}
        <a
          href="mailto:pulsevault.io@gmail.com"
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1rem, 3vw, 1.5rem)",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            transition: "box-shadow 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 6px -1px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#f0fdf4",
              borderRadius: "0.75rem",
              width: "fit-content",
            }}
          >
            <Mail
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#16a34a",
              }}
            />
          </div>
          <div>
            <h3
              style={{
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.25rem",
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
              }}
            >
              Email Support
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
              }}
            >
              pulsevault.io@gmail.com
            </p>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(1rem, 3vw, 1.5rem)",
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
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#fffbeb",
              borderRadius: "0.75rem",
            }}
          >
            <HelpCircle
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#d97706",
              }}
            />
          </div>
          <h2
            style={{
              fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
              fontWeight: "600",
              color: "#0f172a",
            }}
          >
            Frequently Asked Questions
          </h2>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #f1f5f9",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "clamp(0.75rem, 2vw, 1rem)",
                  textAlign: "left",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    color: "#0f172a",
                    paddingRight: "0.5rem",
                  }}
                >
                  {faq.q}
                </span>
                <ChevronRight
                  style={{
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    color: "#94a3b8",
                    flexShrink: 0,
                    transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {openFaq === i && (
                <div
                  style={{
                    padding:
                      "0 clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1rem)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#475569",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ⬇️ ADDED: Footer links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1rem, 3vw, 1.5rem)",
          padding: "clamp(0.75rem, 2vw, 1rem) 0",
          borderTop: "1px solid #e2e8f0",
          marginTop: "0.5rem",
        }}
      >
        <Link
          href="/privacy-policy"
          style={{
            color: "#64748b",
            textDecoration: "none",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            fontWeight: "500",
          }}
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms-of-service"
          style={{
            color: "#64748b",
            textDecoration: "none",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            fontWeight: "500",
          }}
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
