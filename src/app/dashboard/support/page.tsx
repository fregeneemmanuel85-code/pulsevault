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
    a: "Health Score is a weighted composite metric (0-100) combining uptime (30%), API health (20%), SSL certificate (10%), DNS resolution (10%), forms (10%), JS errors (10%), and plugins (10%).",
  },
  {
    q: "Can I monitor private or internal websites?",
    a: "Yes, but you'll need to whitelist our monitoring IP addresses in your firewall or use a reverse proxy so PulseVault can reach your internal endpoints.",
  },
  {
    q: "How do I set up email alerts?",
    a: "Go to Settings → Notifications and toggle Email alerts. Make sure your email address is verified. Email alerts are available on Starter plans and above.",
  },
  {
    q: "Why am I not receiving alert emails?",
    a: "Check your spam/junk folder first. Then verify that email alerts are enabled in Settings → Notifications, and that your plan supports email alerts (Starter+).",
  },
  {
    q: "What happens when my website goes offline?",
    a: "PulseVault detects the outage, creates a critical alert, and sends you an email (if enabled). The site status changes to Offline and health drops to 0%.",
  },
  {
    q: "How does the PV Assistant work?",
    a: "PV Assistant is an AI chatbot that answers questions about your dashboard, explains issues, and suggests fixes. It uses your live website data to give contextual advice.",
  },
  {
    q: "Can I change how often a single site is checked?",
    a: "Check interval is set per plan, not per site. Upgrade your plan for faster intervals, or set site Priority (Pro+) to ensure critical sites are scanned first.",
  },
  {
    q: "What technologies can PulseVault detect?",
    a: "PulseVault detects React, Next.js, Vue, Angular, Svelte, WordPress, Shopify, Webflow, jQuery, Bootstrap, Tailwind CSS, Node.js, PHP, Nginx, Apache, Cloudflare, and more.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is stored in Firebase Firestore with row-level security. We never store your passwords, and SSL checks use read-only certificate inspection.",
  },

  {
    q: "What browsers does PulseVault use for scans?",
    a: "Scans use standard HTTP requests with browser-like headers. Deep scans analyze HTML, CSS, and JavaScript without executing client-side code.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full overflow-x-hidden box-border">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">
          Support
        </h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
          Get help with PulseVault
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {/* Twitter/X */}
        <a
          href="https://x.com/PulseVault01"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 p-4 md:p-5 flex flex-col gap-3 no-underline hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
            >
              <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
              <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm md:text-base mb-1">
              Twitter / X
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              @PulseVault01
            </p>
          </div>
        </a>

        {/* Telegram */}
        <a
          href="https://t.me/PulseVaultsupport"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 p-4 md:p-5 flex flex-col gap-3 no-underline hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-sky-500 dark:text-sky-400"
            >
              <path d="M21.5 4.5l-3.5 16.5l-9.5 -6.5l-3.5 -1.5l16.5 -8.5z" />
              <path d="M14.5 14l-3.5 -3.5l-6.5 3.5" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm md:text-base mb-1">
              Telegram
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              @PulseVaultsupport
            </p>
          </div>
        </a>

        {/* Email Support */}
        <a
          href="mailto:support.pulsevault@gmail.com"
          className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 p-4 md:p-5 flex flex-col gap-3 no-underline hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl w-fit">
            <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm md:text-base mb-1">
              Email Support
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              support.pulsevault@gmail.com
            </p>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 p-4 md:p-5 w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-3 md:p-4 text-left bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100 pr-2">
                  {faq.q}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
                    openFaq === i ? "rotate-90" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-3 md:px-4 pb-3 md:pb-4">
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-200 dark:border-slate-700 mt-2">
        <Link
          href="/privacy-policy"
          className="text-gray-500 dark:text-slate-400 text-sm font-medium hover:text-gray-700 dark:hover:text-slate-200 no-underline"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms-of-service"
          className="text-gray-500 dark:text-slate-400 text-sm font-medium hover:text-gray-700 dark:hover:text-slate-200 no-underline"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
