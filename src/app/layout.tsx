import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PulseVault — Website Monitoring & Uptime Tracking",
    template: "%s | PulseVault",
  },
  description:
    "Monitor your website uptime, SSL certificates, broken links, and performance in real-time. Get instant alerts when your site goes down. Trusted by developers and businesses worldwide.",
  keywords: [
    "website monitoring",
    "uptime tracker",
    "SSL monitor",
    "site checker",
    "performance monitoring",
    "website health",
    "broken link checker",
    "server monitoring",
    "website downtime alert",
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
    title: "PulseVault — Website Monitoring Made Simple",
    description:
      "Never let your website go down unnoticed. Real-time uptime monitoring, SSL tracking, and instant alerts.",
    url: "https://pulsevault.website",
    siteName: "PulseVault",
    images: [
      {
        url: "https://pulsevault.website/og-image.png",
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
      "Monitor uptime, SSL, broken links, and performance. Get instant alerts.",
    images: ["https://pulsevault.website/og-image.png"],
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
    google: "your-google-verification-code", // ← Replace with your actual code from Search Console
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
