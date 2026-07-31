import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Shield,
  Globe,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Crown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PulseVault — Website Monitoring & Uptime Tracking",
  description:
    "Monitor your website uptime, SSL certificates, broken links, and performance in real-time. Get instant alerts when your site goes down. Start free today.",
  keywords: [
    "website monitoring",
    "uptime checker",
    "SSL monitoring",
    "DNS monitoring",
    "website health",
    "performance monitoring",
    "broken link checker",
    "server monitoring",
    "website downtime alert",
    "PulseVault",
    "site uptime tracker",
    "API health monitoring",
    "JavaScript error monitoring",
  ],
  authors: [{ name: "PulseVault" }],
  creator: "PulseVault",
  publisher: "PulseVault",
  metadataBase: new URL("https://pulsevault.website"),
  alternates: {
    canonical: "/",
  },
  category: "Technology",
  openGraph: {
    title: "PulseVault — Website Monitoring Made Simple",
    description:
      "Full-stack monitoring for uptime, SSL, DNS, API health, forms, JavaScript errors, plugins, and HTTP errors. Get instant alerts when issues arise.",
    url: "https://pulsevault.website",
    siteName: "PulseVault",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PulseVault Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseVault — Website Monitoring",
    description:
      "Monitor your website's uptime, SSL, DNS, API health, forms, JavaScript errors, and performance — all in one dashboard.",
    images: ["/og-image.png"],
    creator: "@pulsevault01",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Replace after adding to Google Search Console
  },
};

const plans = [
  {
    name: "Free",
    price: "₦0",
    desc: "For hobby projects",
    features: [
      "2 websites",
      "30-min checks",
      "In-app alerts",
      "Basic dashboard",
    ],
  },
  {
    name: "Starter",
    price: "₦3,000",
    desc: "For small projects",
    features: [
      "5 websites",
      "15-min checks",
      "Email alerts",
      "Daily summaries",
    ],
  },
  {
    name: "Pro",
    price: "₦12,000",
    desc: "For growing teams",
    features: [
      "30 websites",
      "5-min checks",
      "Health scores",
      "Priority queue",
      "Performance insights",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "₦22,500",
    desc: "For large organizations",
    features: [
      "100 websites",
      "1-min checks",
      "Team collaboration",
      "Shared dashboards",
      "Role-based access",
      "Multi-client management",
    ],
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: "PulseVault",
                applicationCategory: "DeveloperApplication",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "NGN",
                },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.8",
                  ratingCount: "150",
                },
                description:
                  "Real-time website monitoring, SSL tracking, and performance alerts.",
                url: "https://pulsevault.website",
                image: "https://pulsevault.website/og-image.png",
              },
              {
                "@type": "Organization",
                name: "PulseVault",
                url: "https://pulsevault.website",
                logo: "https://pulsevault.website/logo.png",
                sameAs: [
                  "https://x.com/PulseVault01",
                  "https://www.instagram.com/pulsevaultio",
                ],
              },
            ],
          }),
        }}
      />
      <div style={{ minHeight: "100vh", backgroundColor: "#020617" }}>
        {/* Navigation */}
        <nav style={{ borderBottom: "1px solid rgba(51, 65, 85, 0.5)" }}>
          <div
            style={{
              maxWidth: "80rem",
              margin: "0 auto",
              padding: "0 clamp(1rem, 4vw, 1.5rem)",
              height: "clamp(3.5rem, 10vw, 4rem)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "clamp(2rem, 6vw, 2.5rem)",
                  height: "clamp(2rem, 6vw, 2.5rem)",
                  backgroundColor: "#1d4ed8",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Zap
                  style={{
                    width: "clamp(1.25rem, 4vw, 1.5rem)",
                    height: "clamp(1.25rem, 4vw, 1.5rem)",
                    color: "white",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "clamp(1rem, 3vw, 1.25rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  whiteSpace: "nowrap",
                }}
              >
                PulseVault
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.5rem, 2vw, 1rem)",
                flexShrink: 0,
              }}
            >
              <Link
                href="/login"
                style={{
                  color: "#94a3b8",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                style={{
                  backgroundColor: "#1d4ed8",
                  color: "white",
                  padding:
                    "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
                  borderRadius: "0.75rem",
                  fontWeight: "500",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section
          style={{
            padding:
              "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem) clamp(5rem, 12vw, 8rem)",
          }}
        >
          <div
            style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                color: "#60a5fa",
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                fontWeight: "500",
                marginBottom: "clamp(1.5rem, 4vw, 2rem)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
              }}
            >
              <span
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              Now monitoring 10,000+ websites
            </div>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 6vw, 3rem)",
                fontWeight: "800",
                color: "#f1f5f9",
                marginBottom: "clamp(1rem, 3vw, 1.5rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Monitor your website&apos;s{" "}
              <span style={{ color: "#3b82f6" }}>pulse</span>
            </h1>
            <p
              style={{
                fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                color: "#64748b",
                marginBottom: "clamp(1.5rem, 4vw, 2.5rem)",
                maxWidth: "42rem",
                margin: "0 auto clamp(1.5rem, 4vw, 2.5rem)",
                lineHeight: 1.7,
                padding: "0 clamp(0.5rem, 2vw, 1rem)",
              }}
            >
              Full-stack monitoring for uptime, SSL, DNS, API health, forms,
              JavaScript errors, plugins, and HTTP errors — all in one
              dashboard.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(0.75rem, 2vw, 1rem)",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/register"
                style={{
                  backgroundColor: "#1d4ed8",
                  color: "white",
                  padding:
                    "clamp(0.75rem, 2.5vw, 1rem) clamp(1.25rem, 4vw, 2rem)",
                  borderRadius: "0.75rem",
                  fontWeight: "600",
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  whiteSpace: "nowrap",
                }}
              >
                Start Free Trial
                <ArrowRight
                  style={{
                    width: "clamp(1rem, 3vw, 1.25rem)",
                    height: "clamp(1rem, 3vw, 1.25rem)",
                  }}
                />
              </Link>
              <Link
                href="/login"
                style={{
                  border: "1px solid rgba(51, 65, 85, 0.5)",
                  color: "#94a3b8",
                  padding:
                    "clamp(0.75rem, 2.5vw, 1rem) clamp(1.25rem, 4vw, 2rem)",
                  borderRadius: "0.75rem",
                  fontWeight: "600",
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            backgroundColor: "rgba(15, 23, 42, 0.4)",
          }}
        >
          <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: "clamp(2rem, 6vw, 4rem)",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(1.25rem, 4vw, 1.875rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "clamp(0.5rem, 2vw, 1rem)",
                }}
              >
                Everything you need to monitor
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                Comprehensive checks for every layer of your stack
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              {[
                {
                  icon: Globe,
                  title: "Uptime Monitoring",
                  desc: "Track availability with sub-minute checks",
                },
                {
                  icon: Shield,
                  title: "SSL Validation",
                  desc: "Certificate expiry and chain verification",
                },
                {
                  icon: BarChart3,
                  title: "Health Score",
                  desc: "Single 0-100 metric for quick assessment",
                },
                {
                  icon: Zap,
                  title: "Instant Alerts",
                  desc: "Get notified via email when issues arise",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  style={{
                    padding: "clamp(1.25rem, 3vw, 1.5rem)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "clamp(2.5rem, 7vw, 3rem)",
                      height: "clamp(2.5rem, 7vw, 3rem)",
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
                      borderRadius: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                      border: "1px solid rgba(37, 99, 235, 0.15)",
                    }}
                  >
                    <feature.icon
                      style={{
                        width: "clamp(1.25rem, 4vw, 1.5rem)",
                        height: "clamp(1.25rem, 4vw, 1.5rem)",
                        color: "#3b82f6",
                      }}
                    />
                  </div>
                  <h3
                    style={{
                      fontWeight: "600",
                      color: "#f1f5f9",
                      marginBottom: "0.5rem",
                      fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#64748b",
                    }}
                  >
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          style={{ padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)" }}
        >
          <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: "clamp(2rem, 6vw, 4rem)",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(1.25rem, 4vw, 1.875rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "clamp(0.5rem, 2vw, 1rem)",
                }}
              >
                Simple pricing
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                Start free, scale as you grow
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  style={{
                    padding: "clamp(1.5rem, 4vw, 2rem)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: plan.popular
                      ? "2px solid #2563eb"
                      : "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "1rem",
                    position: "relative",
                  }}
                >
                  {plan.popular && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-0.75rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        padding: "0.25rem 1rem",
                        borderRadius: "9999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      MOST POPULAR
                    </span>
                  )}
                  {plan.name === "Business" && (
                    <Crown
                      style={{
                        position: "absolute",
                        top: "clamp(1rem, 3vw, 1.5rem)",
                        right: "clamp(1rem, 3vw, 1.5rem)",
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "#d97706",
                      }}
                    />
                  )}
                  <h3
                    style={{
                      fontSize: "clamp(1rem, 3vw, 1.125rem)",
                      fontWeight: "600",
                      color: "#f1f5f9",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.25rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(1.75rem, 5vw, 2.25rem)",
                        fontWeight: "700",
                        color: "#f1f5f9",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      }}
                    >
                      /month
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#64748b",
                      marginBottom: "clamp(1rem, 3vw, 1.5rem)",
                    }}
                  >
                    {plan.desc}
                  </p>
                  <ul
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      marginBottom: "clamp(1.5rem, 4vw, 2rem)",
                      listStyle: "none",
                      padding: 0,
                    }}
                  >
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                          color: "#94a3b8",
                        }}
                      >
                        <CheckCircle2
                          style={{
                            width: "1rem",
                            height: "1rem",
                            color: "#22c55e",
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      fontWeight: "500",
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      textDecoration: "none",
                      backgroundColor: plan.popular ? "#1d4ed8" : "transparent",
                      color: plan.popular ? "white" : "#94a3b8",
                      border: plan.popular
                        ? "none"
                        : "1px solid rgba(51, 65, 85, 0.5)",
                    }}
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(51, 65, 85, 0.5)",
            padding: "clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
          }}
        >
          <div
            style={{
              maxWidth: "80rem",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              {/* ... your logo ... */}
              <span
                style={{
                  fontWeight: "700",
                  color: "#f1f5f9",
                  fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                }}
              >
                PulseVault
              </span>
            </div>

            {/* ADD THESE LINKS */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              <Link
                href="/privacy-policy"
                style={{
                  color: "#64748b",
                  textDecoration: "none",
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
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
                }}
              >
                Terms of Service
              </Link>
            </div>

            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#64748b",
              }}
            >
              © 2026 PulseVault. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
