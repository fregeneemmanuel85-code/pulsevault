export interface KBEntry {
  id: string;
  category: string;
  keywords: string[];
  answer: string;
  relatedQuestions?: string[];
}

export const ASSISTANT_KB: KBEntry[] = [
  // ─── SSL ───
  {
    id: "ssl-expired",
    category: "ssl",
    keywords: [
      "ssl expired",
      "certificate expired",
      "ssl red",
      "ssl invalid",
      "certificate invalid",
    ],
    answer:
      "Your SSL certificate has expired or is invalid. Browsers will block visitors with a security warning.\n\n**Fix:**\n1. Log into your hosting provider (e.g., Hostinger, Namecheap, Bluehost).\n2. Go to **SSL/TLS** settings.\n3. Renew or re-install the certificate (Let's Encrypt is free).\n4. Verify at [SSL Labs](https://www.ssllabs.com/ssltest/).\n\n**Priority:** Critical",
  },
  {
    id: "ssl-expiring",
    category: "ssl",
    keywords: [
      "ssl expiring",
      "ssl warning",
      "certificate warning",
      "ssl yellow",
      "ssl soon",
    ],
    answer:
      "Your SSL certificate is still valid but expires soon. Renew it before it lapses to avoid downtime.\n\n**Fix:**\n1. Check expiry date in your PulseVault dashboard.\n2. Renew through your hosting provider or certificate authority.\n3. Set a calendar reminder 7 days before expiry.\n\n**Priority:** High",
  },
  {
    id: "ssl-valid",
    category: "ssl",
    keywords: ["ssl valid", "certificate valid", "ssl green", "ssl good"],
    answer:
      "Your SSL certificate is valid and properly installed. No action needed.",
  },

  // ─── DNS ───
  {
    id: "dns-failed",
    category: "dns",
    keywords: [
      "dns failed",
      "dns error",
      "not resolving",
      "dns lookup failed",
      "domain not found",
    ],
    answer:
      "Your domain's DNS records are failing to resolve. Visitors cannot reach your site.\n\n**Fix:**\n1. Check your DNS settings at your registrar (Cloudflare, Namecheap, etc.).\n2. Ensure your A record points to the correct server IP.\n3. Verify nameservers are correct.\n4. DNS changes can take up to 24–48 hours to propagate.\n\n**Priority:** Critical",
  },
  {
    id: "dns-ok",
    category: "dns",
    keywords: ["dns ok", "dns resolved", "dns working", "domain resolving"],
    answer:
      "Your DNS is resolving correctly. Your domain points to a valid IP address.",
  },

  // ─── HEALTH ───
  {
    id: "health-low",
    category: "health",
    keywords: [
      "health low",
      "health score low",
      "why is health",
      "health 30",
      "health bad",
      "critical health",
    ],
    answer:
      "A low health score means multiple issues are stacking up. PulseVault calculates health from HTTP status, broken links, JS errors, plugins, forms, mixed content, and performance.\n\n**Common causes:**\n- HTTP 4xx/5xx errors\n- Broken links or images\n- JavaScript console errors\n- Missing security headers\n- Slow load time (>3s)\n- Mixed content (HTTP on HTTPS)\n\n**Fix:** Check your website detail page to see the exact issues, then fix them one by one. Start with critical (red) items.",
  },
  {
    id: "health-offline",
    category: "health",
    keywords: [
      "site offline",
      "website down",
      "offline",
      "unreachable",
      "not loading",
    ],
    answer:
      "Your website is completely unreachable. This could be a server crash, DNS issue, or hosting outage.\n\n**Fix:**\n1. Check if your hosting provider has a status page.\n2. Verify your server is running (restart if needed).\n3. Check DNS settings in your domain registrar.\n4. Review firewall rules — your server may be blocking PulseVault's IP.\n\n**Priority:** Critical",
  },

  // ─── PERFORMANCE ───
  {
    id: "performance-slow",
    category: "performance",
    keywords: [
      "slow load",
      "performance low",
      "load time high",
      "page slow",
      "speed bad",
      "performance score",
    ],
    answer:
      "Slow load times hurt SEO and user experience. PulseVault measures this from TTFB, page size, and render time.\n\n**Fix:**\n1. Compress images (use WebP, not PNG/JPG).\n2. Enable caching (Cloudflare, browser cache headers).\n3. Minify CSS and JavaScript.\n4. Remove unused plugins/scripts.\n5. Use a CDN for static assets.\n6. Consider upgrading your hosting plan.\n\n**Priority:** Medium",
  },
  {
    id: "page-size-large",
    category: "performance",
    keywords: [
      "page size large",
      "heavy page",
      "big page",
      "mb page",
      "page too big",
    ],
    answer:
      "Your page size is larger than recommended. Large pages load slowly, especially on mobile.\n\n**Fix:**\n1. Compress images (TinyPNG, Squoosh).\n2. Lazy-load images and videos.\n3. Remove unused CSS/JS.\n4. Enable Gzip/Brotli compression on your server.\n\n**Priority:** Medium",
  },

  // ─── LINKS ───
  {
    id: "broken-links",
    category: "links",
    keywords: [
      "broken links",
      "dead links",
      "404 links",
      "link error",
      "links not working",
    ],
    answer:
      "Broken links hurt SEO and user trust. They usually point to deleted pages or mistyped URLs.\n\n**Fix:**\n1. Open your website detail page to see the exact broken URLs.\n2. Update or remove dead links.\n3. Use 301 redirects if a page moved.\n4. Check for typos in href attributes.\n\n**Priority:** Medium",
  },

  // ─── JS ERRORS ───
  {
    id: "js-errors",
    category: "js",
    keywords: [
      "js errors",
      "javascript error",
      "console error",
      "script error",
      "js bad",
    ],
    answer:
      "JavaScript errors can break forms, buttons, and interactive features.\n\n**Fix:**\n1. Open browser DevTools → Console to see exact error messages.\n2. Check for missing variables or null references.\n3. Ensure all external scripts load correctly (no 404s).\n4. Test with browser extensions disabled (they sometimes inject broken scripts).\n5. Update outdated libraries (jQuery, React, Vue).\n\n**Priority:** High",
  },

  // ─── MIXED CONTENT ───
  {
    id: "mixed-content",
    category: "mixed_content",
    keywords: [
      "mixed content",
      "http on https",
      "insecure resource",
      "mixed content error",
    ],
    answer:
      "Mixed content means your HTTPS page loads HTTP resources (images, scripts, CSS). Browsers block or warn about these.\n\n**Fix:**\n1. Change all `http://` URLs to `https://` in your HTML.\n2. Use protocol-relative URLs (`//example.com/image.jpg`).\n3. Search your codebase for `http://` and replace with `https://`.\n4. Update CDN links and third-party embeds.\n\n**Priority:** High",
  },

  // ─── DOMAIN ───
  {
    id: "domain-expiring",
    category: "domain",
    keywords: [
      "domain expiring",
      "domain expires",
      "renew domain",
      "domain soon",
      "domain warning",
    ],
    answer:
      "Your domain registration expires soon. If it lapses, someone else can buy it and your site goes offline.\n\n**Fix:**\n1. Log into your domain registrar.\n2. Renew for 1+ years.\n3. Enable auto-renewal.\n4. Update payment method if expired.\n\n**Priority:** High",
  },
  {
    id: "domain-expired",
    category: "domain",
    keywords: ["domain expired", "domain gone", "registration expired"],
    answer:
      "Your domain has expired. Your website is offline and email may stop working.\n\n**Fix:**\n1. Contact your registrar IMMEDIATELY.\n2. Pay renewal + redemption fee if within grace period.\n3. If someone else bought it, you may need to negotiate or choose a new domain.\n\n**Priority:** Critical",
  },

  // ─── SEO ───
  {
    id: "seo-low",
    category: "seo",
    keywords: [
      "seo low",
      "seo score bad",
      "seo issues",
      "why is seo",
      "seo problems",
    ],
    answer:
      "A low SEO score means search engines may not rank your site well.\n\n**Common issues:**\n- Missing or short meta description\n- Missing title tag\n- No H1 heading\n- Images without alt text\n- Missing Open Graph tags\n- No canonical URL\n- Slow page speed\n\n**Fix:** Add the missing tags and content. PulseVault lists the exact issues on your website detail page under the SEO section.\n\n**Priority:** Medium",
  },
  {
    id: "missing-meta",
    category: "seo",
    keywords: [
      "meta description",
      "missing meta",
      "no description",
      "meta tag",
    ],
    answer:
      'A meta description helps search engines understand your page and improves click-through rates.\n\n**Fix:**\n1. Add `<meta name="description" content="Your compelling summary here">` inside `<head>`.\n2. Keep it between 150–160 characters.\n3. Include your target keyword naturally.\n\n**Priority:** Medium',
  },

  // ─── FORMS ───
  {
    id: "forms-broken",
    category: "forms",
    keywords: [
      "form broken",
      "form not working",
      "form error",
      "submit not working",
    ],
    answer:
      'Your form is missing required attributes or the endpoint is broken.\n\n**Fix:**\n1. Ensure the `<form>` tag has an `action` attribute.\n2. Add `method="POST"` (or GET if appropriate).\n3. Check that the submit URL returns 200 OK.\n4. Verify CSRF tokens if using a framework (Laravel, Django, etc.).\n\n**Priority:** High',
  },

  // ─── PLUGINS ───
  {
    id: "plugins-broken",
    category: "plugins",
    keywords: [
      "plugin broken",
      "wordpress plugin",
      "plugin error",
      "plugin failed",
    ],
    answer:
      "A WordPress plugin is returning 404 or causing errors.\n\n**Fix:**\n1. Log into your WordPress admin.\n2. Deactivate plugins one by one to find the culprit.\n3. Update all plugins to the latest version.\n4. Remove unused plugins.\n5. Check plugin compatibility with your WordPress version.\n\n**Priority:** Medium",
  },

  // ─── GENERAL ───
  {
    id: "what-is-pv",
    category: "general",
    keywords: [
      "what is pulsevault",
      "how does pulsevault work",
      "what does pulsevault do",
      "about pulsevault",
    ],
    answer:
      "PulseVault is a website monitoring platform that tracks uptime, SSL health, broken links, JavaScript errors, performance, SEO, domain expiration, and more. It alerts you when something breaks so you can fix it before visitors notice.",
  },
  {
    id: "how-to-add",
    category: "general",
    keywords: [
      "how to add website",
      "add site",
      "new website",
      "monitor new site",
    ],
    answer:
      "Click the **Add Website** button on your dashboard, enter the URL, and PulseVault will automatically scan it. You can also set a display name and priority level.",
  },
  {
    id: "check-interval",
    category: "general",
    keywords: [
      "how often",
      "check interval",
      "scan frequency",
      "how frequently",
    ],
    answer:
      "Scan frequency depends on your plan:\n- Free: every 30 minutes\n- Starter: every 15 minutes\n- Pro: every 5 minutes\n- Business: every 1 minute\n\nYou can also trigger a manual scan anytime from a website's detail page.",
  },

  // ─── CREDITS ───
  {
    id: "credits-what",
    category: "credits",
    keywords: [
      "what are credits",
      "ai credits",
      "how do credits work",
      "credit system",
    ],
    answer:
      "AI credits power the PV Assistant. Each question costs credits based on complexity:\n- Simple question: 1 credit\n- Detailed explanation: 3 credits\n- Full analysis: 10 credits\n- Report generation: 15 credits\n\nKnowledge Base answers are free (0 credits). Credits reset every 24 hours based on your plan.",
  },
  {
    id: "credits-reset",
    category: "credits",
    keywords: [
      "when do credits reset",
      "credit reset",
      "daily reset",
      "credits back",
    ],
    answer:
      "Your AI credits reset every 24 hours at midnight UTC. Upgrading your plan increases your daily limit.",
  },
  {
    id: "credits-upgrade",
    category: "credits",
    keywords: [
      "upgrade credits",
      "more credits",
      "increase limit",
      "credit limit",
    ],
    answer:
      "Upgrade your PulseVault plan to get more daily AI credits:\n- Free: 100/day\n- Starter: 500/day\n- Pro: 1,000/day\n- Business: 10,000/day\n\nGo to **Billing** in the sidebar to upgrade.",
  },
];
