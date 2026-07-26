import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "PulseVault terms of service — rules and conditions for using our platform.",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
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
            <FileText
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
            Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              By accessing or using PulseVault, you agree to be bound by these
              Terms of Service. If you do not agree, you may not use the
              service.
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
              2. Account Registration
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              You must provide accurate information when creating an account.
              You are responsible for maintaining the security of your account
              credentials. Notify us immediately of any unauthorized access.
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
              3. Service Description
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              PulseVault provides website monitoring services including uptime
              checks, SSL monitoring, performance tracking, and alerting. We do
              not guarantee 100% uptime of our own service, but we strive for
              high availability.
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
              4. Payment and Billing
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Paid plans are billed monthly. Payments are processed through
              Paystack. You can cancel your subscription at any time from your
              billing settings. No refunds for partial months.
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
              5. Acceptable Use
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              You may not use PulseVault to monitor illegal websites, send spam,
              or overload our systems. We reserve the right to suspend accounts
              violating these rules.
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
              6. Limitation of Liability
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              PulseVault is provided &quot;as is&quot; without warranties. We
              are not liable for damages arising from service interruptions,
              data loss, or monitoring failures. Your use of the service is at
              your own risk.
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
              7. Termination
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Either party may terminate the service at any time. Upon
              termination, your data will be retained for 30 days then
              permanently deleted.
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
              8. Governing Law
            </h2>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              These terms are governed by the laws of the Federal Republic of
              Nigeria. Any disputes will be resolved in Nigerian courts.
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
