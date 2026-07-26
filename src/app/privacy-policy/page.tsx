import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "PulseVault privacy policy — how we collect, use, and protect your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem)",
      }}
    >
      <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#2563eb",
            textDecoration: "none",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            fontWeight: "500",
            marginBottom: "clamp(1.5rem, 4vw, 2rem)",
          }}
        >
          <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
          Back to home
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "clamp(1rem, 3vw, 1.5rem)",
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: "#eff6ff",
              borderRadius: "0.75rem",
            }}
          >
            <Shield
              style={{
                width: "clamp(1.25rem, 3vw, 1.5rem)",
                height: "clamp(1.25rem, 3vw, 1.5rem)",
                color: "#2563eb",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            Privacy Policy
          </h1>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "clamp(1.25rem, 3vw, 2rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.25rem, 3vw, 1.5rem)",
          }}
        >
          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              1. Information We Collect
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We collect information you provide directly (email, name, website
              URLs) and data generated through monitoring (uptime status,
              response times, SSL certificates). We also collect usage data and
              device information to improve our service.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              2. How We Use Your Information
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We use your data to provide monitoring services, send alerts,
              process payments, and improve PulseVault. We do not sell your
              personal information to third parties.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              3. Data Security
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We implement industry-standard security measures including
              encryption, secure servers, and regular security audits. All data
              is stored on Firebase with enterprise-grade security.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              4. Cookies
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We use cookies to maintain your session and remember preferences.
              You can disable cookies in your browser, but some features may not
              work properly.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              5. Third-Party Services
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We use Firebase for data storage, Paystack for payments, and
              Vercel for hosting. These services have their own privacy policies
              and security practices.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              6. Your Rights
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              You can access, update, or delete your account data at any time
              through your dashboard settings. Contact us at
              support@pulsevault.website for data deletion requests.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              7. Changes to This Policy
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              We may update this policy periodically. Changes will be posted on
              this page with an updated effective date.
            </p>
          </section>

          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#64748b",
                margin: 0,
              }}
            >
              Last updated: July 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
