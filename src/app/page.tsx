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
  Activity,
  Link2,
  Clock,
  Mail,
} from "lucide-react";
import HeroChecker from "@/components/HeroChecker";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: {
    default: "PulseVault — Is Your Website Down? Free Health Check",
    template: "%s | PulseVault",
  },
  description:
    "Check if your website is working in 5 seconds. Free instant scan for downtime, slow speed, broken links, and SSL issues. No signup needed. Get alerts before your customers notice.",
  keywords: [
    "is my website down",
    "website down checker",
    "check my website",
    "website health check",
    "site speed test",
    "broken link checker",
    "SSL certificate check",
    "website monitoring",
    "uptime tracker",
    "website not working",
    "fix my website",
    "PulseVault",
  ],
  authors: [{ name: "PulseVault" }],
  creator: "PulseVault",
  publisher: "PulseVault",
  metadataBase: new URL("https://pulsevault.website"),
  alternates: { canonical: "/" },
  category: "Technology",
  openGraph: {
    title: "PulseVault — Is Your Website Working Right Now?",
    description:
      "Free instant website health check. Downtime, speed, broken links, SSL — checked in seconds. No signup required.",
    url: "https://pulsevault.website",
    siteName: "PulseVault",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "PulseVault — Free Website Health Check",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseVault — Is Your Website Down?",
    description:
      "Check your website health in 5 seconds. Free scan for downtime, speed, broken links, and SSL issues.",
    images: ["/opengraph-image.png"],
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
  verification: { google: "your-google-verification-code" },
};

const plans = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    desc: "For personal sites & portfolios",
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
    name: "Starter",
    price: "₦3,000",
    period: "month",
    desc: "For freelancers & small teams",
    features: [
      "5 websites monitoring",
      "15-minute check interval",
      "All Free features",
      "SEO monitoring",
      "Domain expiration monitoring",
      "Email alerts",
      "Daily/weekly summaries",
      "AI Assistant: 500 credits/day",
      "Incident history tracking",
      "File Vault: 300 MB storage",
    ],
  },
  {
    name: "Pro",
    price: "₦12,000",
    period: "month",
    desc: "For growing businesses",
    features: [
      "30 websites monitoring",
      "5-minute check interval",
      "All Starter features",
      "Priority monitoring queue",
      "AI Assistant: 1,000 credits/day",
      "Advanced reporting",
      "Faster detection",
      "File Vault: 500 GB storage",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "₦22,500",
    period: "month",
    desc: "For agencies & large orgs",
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

const faqs = [
  {
    q: "How do I know if my website is down?",
    a: "Enter your URL above for an instant free check. PulseVault tests if your site is online, measures load speed, checks your SSL certificate, and finds broken links — all in under 5 seconds.",
  },
  {
    q: "Is PulseVault free to use?",
    a: "Yes. You can run unlimited free health checks without signing up. For automatic monitoring every 30 minutes and email alerts, our free plan covers 2 websites forever.",
  },
  {
    q: "What does a website health check include?",
    a: "Our scan checks if your site is online, measures page load speed, validates your SSL certificate, detects broken links, checks form functionality, and scans for JavaScript errors.",
  },
  {
    q: "Do I need technical skills to use PulseVault?",
    a: "Not at all. PulseVault is built for business owners, bloggers, job seekers, and creators — not just developers. If you have a website, you can use it.",
  },
  {
    q: "How often does PulseVault check my site?",
    a: "Free plans check every 30 minutes. Paid plans range from 15 minutes down to 1 minute depending on your tier. You get instant alerts the moment an issue is detected.",
  },
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 0 20px 8px rgba(37, 99, 235, 0.15); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes resultSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease forwards;
          opacity: 0;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        
        .card-3d {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        .card-3d:hover {
          transform: translateY(-8px) rotateX(2deg) rotateY(-2deg) translateZ(20px);
          box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.15);
        }
        
        .pricing-3d {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
          transform-style: preserve-3d;
        }
        .pricing-3d:hover {
          transform: translateY(-12px) translateZ(30px) scale(1.02);
          box-shadow: 0 30px 60px -15px rgba(37, 99, 235, 0.2);
        }
        
        .btn-3d {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transform-style: preserve-3d;
        }
        .btn-3d:hover {
          transform: translateY(-2px) translateZ(10px);
          box-shadow: 0 10px 30px -10px rgba(37, 99, 235, 0.4);
        }
        .btn-3d:active {
          transform: translateY(0) translateZ(0);
        }
        
        .float-orb {
          animation: float 6s ease-in-out infinite;
        }
        .float-orb-delayed {
          animation: float 8s ease-in-out infinite;
          animation-delay: -2s;
        }
        
        .shimmer-text {
          background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #60a5fa 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        
        .nav-link {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 500;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          white-space: nowrap;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #f1f5f9; }
        
        .footer-link {
          color: #64748b;
          text-decoration: none;
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          transition: color 0.2s;
        }
        .footer-link:hover { color: #f1f5f9; }
        
        .cta-banner {
          transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px);
          transition: transform 0.5s ease;
        }
        .cta-banner:hover {
          transform: perspective(1000px) rotateX(2deg) rotateY(-1deg) translateZ(20px);
        }

        @media (max-width: 640px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                name: "PulseVault",
                applicationCategory: "WebApplication",
                operatingSystem: "Any",
                offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.8",
                  ratingCount: "150",
                },
                description:
                  "Free instant website health checker. Check if your site is down, slow, or broken in seconds. Get alerts before your customers notice.",
                url: "https://pulsevault.website",
                image: "https://pulsevault.website/opengraph-image.png",
                featureList: [
                  "Instant website health check",
                  "Uptime monitoring",
                  "SSL certificate tracking",
                  "Broken link detection",
                  "Page speed analysis",
                  "Form monitoring",
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
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

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Animated background orbs */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            className="float-orb"
            style={{
              position: "absolute",
              top: "10%",
              left: "10%",
              width: "300px",
              height: "300px",
              background:
                "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(40px)",
            }}
          />
          <div
            className="float-orb-delayed"
            style={{
              position: "absolute",
              top: "60%",
              right: "5%",
              width: "400px",
              height: "400px",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(60px)",
            }}
          />
          <div
            className="float-orb"
            style={{
              position: "absolute",
              bottom: "10%",
              left: "40%",
              width: "250px",
              height: "250px",
              background:
                "radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(50px)",
              animationDelay: "-4s",
            }}
          />
        </div>

        {/* Navigation */}
        <nav
          style={{
            borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
            position: "relative",
            zIndex: 10,
          }}
        >
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
                minWidth: 0,
                flexShrink: 0,
              }}
            >
              <Logo variant="light" size="small" showTagline={false} />
            </div>
            <div
              className="nav-links"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.5rem, 2vw, 1rem)",
                flexShrink: 0,
              }}
            >
              <Link href="/login" className="nav-link">
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-3d"
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
                  display: "inline-block",
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
              "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem) clamp(4rem, 10vw, 6rem)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}
          >
            <div
              className="animate-fade-in-up"
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
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
              Free instant website health checks
            </div>
            <h1
              className="animate-fade-in-up delay-100"
              style={{
                fontSize: "clamp(1.75rem, 6vw, 3rem)",
                fontWeight: "800",
                color: "#f1f5f9",
                marginBottom: "clamp(1rem, 3vw, 1.5rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Is your website <span className="shimmer-text">working</span>{" "}
              right now?
            </h1>
            <p
              className="animate-fade-in-up delay-200"
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
              Check any site in 5 seconds — no signup needed. See if it&apos;s
              down, slow, broken, or insecure. Then set up free monitoring so
              you never get caught off guard.
            </p>

            <div className="animate-fade-in-up delay-300">
              <HeroChecker />
            </div>

            <div
              className="animate-fade-in delay-500"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(1rem, 3vw, 1.5rem)",
                flexWrap: "wrap",
                marginTop: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              {[
                "No credit card required",
                "Free plan available",
                "Checks in 5 seconds",
              ].map((t) => (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    color: "#64748b",
                    fontSize: "clamp(0.6875rem, 2vw, 0.75rem)",
                  }}
                >
                  <CheckCircle2
                    style={{
                      width: "0.875rem",
                      height: "0.875rem",
                      color: "#22c55e",
                    }}
                  />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: "clamp(2rem, 6vw, 3rem)",
              }}
            >
              <h2
                className="animate-fade-in-up"
                style={{
                  fontSize: "clamp(1.25rem, 4vw, 1.875rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "clamp(0.5rem, 2vw, 1rem)",
                }}
              >
                How it works
              </h2>
              <p
                className="animate-fade-in-up delay-100"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                From first check to ongoing monitoring in 3 steps
              </p>
            </div>
            <div
              className="steps-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
                gap: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              {[
                {
                  step: "1",
                  title: "Check instantly",
                  desc: "Paste any URL above. We scan uptime, speed, SSL, links, and forms in seconds.",
                },
                {
                  step: "2",
                  title: "See the report",
                  desc: "Get a clear health score with specific issues — no technical jargon.",
                },
                {
                  step: "3",
                  title: "Monitor automatically",
                  desc: "Sign up free and we check every 30 minutes. You only hear from us when something breaks.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={`animate-fade-in-up delay-${(i + 1) * 200} card-3d`}
                  style={{
                    padding: "clamp(1.25rem, 3vw, 1.5rem)",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "1rem",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "50%",
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
                      border: "1px solid rgba(37, 99, 235, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1rem",
                      color: "#60a5fa",
                      fontWeight: "700",
                      fontSize: "1rem",
                    }}
                  >
                    {item.step}
                  </div>
                  <h3
                    style={{
                      fontWeight: "600",
                      color: "#f1f5f9",
                      marginBottom: "0.5rem",
                      fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            position: "relative",
            zIndex: 1,
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
                className="animate-fade-in-up"
                style={{
                  fontSize: "clamp(1.25rem, 4vw, 1.875rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "clamp(0.5rem, 2vw, 1rem)",
                }}
              >
                Everything we watch for you
              </h2>
              <p
                className="animate-fade-in-up delay-100"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                So you can focus on your business, not your server
              </p>
            </div>
            <div
              className="feature-grid"
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
                  desc: "Know the second your site goes offline. We check every 1–30 minutes depending on your plan.",
                },
                {
                  icon: Shield,
                  title: "SSL Validation",
                  desc: "Don't let an expired certificate scare away customers. We track expiry and alert you 30 days early.",
                },
                {
                  icon: BarChart3,
                  title: "Health Score",
                  desc: "One simple 0-100 score. No technical background needed to understand if your site is okay.",
                },
                {
                  icon: Link2,
                  title: "Broken Links",
                  desc: "Dead links hurt your credibility and SEO. We find them across every page we scan.",
                },
                {
                  icon: Activity,
                  title: "Form Monitoring",
                  desc: "Your contact form is your money-maker. We verify it actually submits and reaches your inbox.",
                },
                {
                  icon: Clock,
                  title: "Speed Tracking",
                  desc: "Slow sites lose visitors. We measure load time and flag anything over 3 seconds.",
                },
                {
                  icon: Mail,
                  title: "Email Alerts",
                  desc: "Get notified instantly when something breaks — not when a customer complains.",
                },
                {
                  icon: Zap,
                  title: "JS Error Detection",
                  desc: "Catch JavaScript crashes before they break your checkout or signup flow.",
                },
              ].map((feature, i) => (
                <div
                  key={feature.title}
                  className={`animate-fade-in-up delay-${((i % 4) + 1) * 100} card-3d`}
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
                      lineHeight: 1.6,
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
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            position: "relative",
            zIndex: 1,
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
                className="animate-fade-in-up"
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
                className="animate-fade-in-up delay-100"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                Start free. Upgrade when you grow.
              </p>
            </div>
            <div
              className="pricing-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
                gap: "clamp(1rem, 3vw, 1.5rem)",
              }}
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.name}
                  className={`animate-fade-in-up delay-${(i + 1) * 150} pricing-3d`}
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
                      /{plan.period}
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
                    className="btn-3d"
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
                    {plan.name === "Free" ? "Start Free" : "Get Started"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: "clamp(2rem, 6vw, 3rem)",
              }}
            >
              <h2
                className="animate-fade-in-up"
                style={{
                  fontSize: "clamp(1.25rem, 4vw, 1.875rem)",
                  fontWeight: "700",
                  color: "#f1f5f9",
                  marginBottom: "clamp(0.5rem, 2vw, 1rem)",
                }}
              >
                Questions? Answered.
              </h2>
              <p
                className="animate-fade-in-up delay-100"
                style={{
                  color: "#64748b",
                  fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                }}
              >
                Everything you need to know to get started
              </p>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`animate-fade-in-up delay-${(i + 1) * 100} card-3d`}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "1rem",
                    padding: "clamp(1.25rem, 3vw, 1.5rem)",
                  }}
                >
                  <h3
                    style={{
                      fontWeight: "600",
                      color: "#f1f5f9",
                      fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {faq.q}
                  </h3>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section
          style={{
            padding: "clamp(3rem, 8vw, 5rem) clamp(1rem, 4vw, 1.5rem)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="animate-scale-in cta-banner"
            style={{
              maxWidth: "48rem",
              margin: "0 auto",
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              borderRadius: "1.5rem",
              padding: "clamp(2rem, 6vw, 3rem)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "1rem",
              }}
            >
              Stop wondering if your site is broken.
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
                marginBottom: "1.5rem",
                maxWidth: "32rem",
                margin: "0 auto 1.5rem",
              }}
            >
              Check it free right now. Then let us watch it for you — so you can
              sleep.
            </p>
            <Link
              href="/register"
              className="btn-3d"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "#1d4ed8",
                color: "white",
                padding:
                  "clamp(0.75rem, 2.5vw, 1rem) clamp(1.25rem, 4vw, 2rem)",
                borderRadius: "0.75rem",
                fontWeight: "600",
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                textDecoration: "none",
              }}
            >
              Start Free Monitoring
              <ArrowRight style={{ width: "1.25rem", height: "1.25rem" }} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(51, 65, 85, 0.5)",
            padding: "clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              maxWidth: "80rem",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <Logo variant="light" size="small" showTagline={false} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(1rem, 3vw, 1.5rem)",
                }}
              >
                <Link href="/privacy-policy" className="footer-link">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="footer-link">
                  Terms of Service
                </Link>
              </div>
            </div>
            <p
              style={{
                fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                color: "#475569",
                margin: 0,
              }}
            >
              © 2026 PulseVault. Built for anyone with a website.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
