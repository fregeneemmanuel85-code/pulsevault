export interface KBEntry {
  id: string;
  category: string;
  keywords: string[];
  answer: string;
}

export const ASSISTANT_KB: KBEntry[] = [
  // ─── PULSEVAULT BASICS ───
  {
    id: "what-is-pv",
    category: "general",
    keywords: [
      "what is pulsevault",
      "what does pulsevault do",
      "how does pulsevault work",
      "about pulsevault",
      "pulsevault meaning",
    ],
    answer:
      "PulseVault is a website monitoring platform that tracks uptime, SSL health, broken links, JavaScript errors, performance, SEO, domain expiration, and more. It alerts you when something breaks so you can fix it before visitors notice.",
  },
  {
    id: "how-to-add",
    category: "general",
    keywords: [
      "how to add website",
      "how do i add a site",
      "add new website",
      "monitor new site",
      "how to start monitoring",
    ],
    answer:
      "Click the **Add Website** button on your dashboard, enter the URL, and PulseVault will automatically scan it. You can also set a display name, priority level, and domain expiry date.",
  },
  {
    id: "check-interval",
    category: "general",
    keywords: [
      "how often do you check",
      "scan frequency",
      "check interval",
      "how frequently",
      "monitoring interval",
      "how often scanned",
    ],
    answer:
      "Scan frequency depends on your plan:\n- Free: every 30 minutes\n- Starter: every 15 minutes\n- Pro: every 5 minutes\n- Business: every 1 minute\n\nYou can also trigger a manual scan anytime from a website's detail page.",
  },
  {
    id: "what-is-health",
    category: "general",
    keywords: [
      "what is health score",
      "how is health calculated",
      "what does health mean",
      "health score formula",
    ],
    answer:
      "Health Score is a 0-100 rating calculated from HTTP status, broken links, JS errors, plugin status, forms, mixed content, security headers, and page performance. 80+ is good, 60-79 needs attention, below 60 is critical.",
  },
  {
    id: "what-is-ssl",
    category: "general",
    keywords: [
      "what is ssl",
      "what does ssl mean",
      "ssl certificate explained",
      "why ssl matters",
    ],
    answer:
      "SSL (Secure Sockets Layer) encrypts data between your visitors and your server. Without it, browsers show a 'Not Secure' warning. PulseVault tracks SSL expiry and validity.",
  },
  {
    id: "what-is-dns",
    category: "general",
    keywords: [
      "what is dns",
      "what does dns mean",
      "dns explained",
      "why dns matters",
    ],
    answer:
      "DNS (Domain Name System) translates your domain name (like example.com) into an IP address so browsers can find your server. If DNS fails, your site becomes unreachable.",
  },
  {
    id: "what-is-seo",
    category: "general",
    keywords: [
      "what is seo",
      "what does seo mean",
      "seo explained",
      "why seo matters",
    ],
    answer:
      "SEO (Search Engine Optimization) helps your site rank higher on Google. PulseVault checks title tags, meta descriptions, headings, image alt text, Open Graph tags, and page speed.",
  },
  {
    id: "what-is-mixed-content",
    category: "general",
    keywords: [
      "what is mixed content",
      "mixed content explained",
      "why mixed content bad",
    ],
    answer:
      "Mixed content happens when an HTTPS page loads HTTP resources (images, scripts, CSS). Browsers block or warn about these, hurting trust and SEO.",
  },

  // ─── CREDITS ───
  {
    id: "credits-what",
    category: "credits",
    keywords: [
      "what are ai credits",
      "how do credits work",
      "credit system explained",
      "what are credits",
    ],
    answer:
      "AI credits power the PV Assistant. Each question costs credits based on complexity:\n- Simple question: 1 credit\n- Detailed explanation: 3 credits\n- Full analysis: 10 credits\n- Report generation: 15 credits\n\nKnowledge Base answers like this one are free (0 credits). Credits reset every 24 hours.",
  },
  {
    id: "credits-reset",
    category: "credits",
    keywords: [
      "when do credits reset",
      "credit reset time",
      "daily reset",
      "when do i get credits back",
    ],
    answer:
      "Your AI credits reset every 24 hours at midnight UTC. Upgrading your plan increases your daily limit.",
  },
  {
    id: "credits-upgrade",
    category: "credits",
    keywords: [
      "how to get more credits",
      "upgrade credits",
      "increase credit limit",
      "more ai credits",
    ],
    answer:
      "Upgrade your PulseVault plan to get more daily AI credits:\n- Free: 100/day\n- Starter: 500/day\n- Pro: 1,000/day\n- Business: 10,000/day\n\nGo to **Billing** in the sidebar to upgrade.",
  },
  {
    id: "credits-cost",
    category: "credits",
    keywords: [
      "how many credits cost",
      "credit cost",
      "how much does this cost",
      "credits per question",
    ],
    answer:
      "Credit costs depend on question complexity:\n- Simple questions (e.g., 'What does DNS failure mean?'): 1 credit\n- Detailed explanations (e.g., 'Explain all my SSL issues'): 3 credits\n- Full website analysis: 10 credits\n- Report generation: 15 credits\n\nThe cost is shown before you send each message.",
  },

  // ─── PLANS ───
  {
    id: "plans-compare",
    category: "plans",
    keywords: [
      "what plans do you have",
      "compare plans",
      "plan differences",
      "which plan should i choose",
    ],
    answer:
      "PulseVault plans:\n- **Free**: 2 websites, 30-min checks, 100 AI credits/day\n- **Starter**: 5 websites, 15-min checks, 500 AI credits/day\n- **Pro**: 30 websites, 5-min checks, 1,000 AI credits/day\n- **Business**: 100 websites, 1-min checks, 10,000 AI credits/day\n\nHigher plans also unlock priority levels and email alerts.",
  },
];
