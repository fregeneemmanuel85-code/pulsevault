import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ToastProvider from "@/components/ToastProvider";
import ActivityTracker from "@/components/ActivityTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PulseVault — Is Your Website Down? Free Health Check",
    template: "%s | PulseVault",
  },
  description:
    "Check if your website is working in 5 seconds. Free instant scan for downtime, slow speed, broken links, and SSL issues. Get alerts before your customers notice. No tech skills needed.",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PulseVault — Is Your Website Working Right Now?",
    description:
      "Free instant website health check. Downtime, speed, broken links, SSL — checked in seconds. No signup required.",
    url: "https://pulsevault.website",
    siteName: "PulseVault",
    images: [
      {
        url: "https://pulsevault.website/opengraph-image.png",
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
    images: ["https://pulsevault.website/opengraph-image.png"],
    creator: "@pulsevault",
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
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PulseVault",
              applicationCategory: "WebApplication",
              operatingSystem: "Any",
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
                "Free instant website health checker. Check if your site is down, slow, or broken in seconds. Get alerts before your customers notice.",
              url: "https://pulsevault.website",
              featureList: [
                "Instant website health check",
                "Uptime monitoring",
                "SSL certificate tracking",
                "Broken link detection",
                "Page speed analysis",
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <GoogleAnalytics />
          <ActivityTracker>{children}</ActivityTracker>
        </ToastProvider>
      </body>
    </html>
  );
}
