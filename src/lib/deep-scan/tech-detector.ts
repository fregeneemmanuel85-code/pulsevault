/* ─────────────────────────────────────────────────────────────
   Evidence-Based Tech Stack Detector
   RULE: A technology name appearing in website content is
   NEVER, by itself, evidence that the website uses that tech.
   ───────────────────────────────────────────────────────────── */

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface TechDetection {
  name: string;
  confidence: Confidence;
  evidence: string[];
}

export interface TechStackInput {
  url: string;
  initialHtml: string;
  renderedHtml: string;
  scripts: string[];
  stylesheets: string[];
  globals: Record<string, boolean>;
  resourceUrls: string[];
  headers?: Record<string, string>;
}

/* ─── Internal evidence accumulator ─── */
interface Evidence {
  signal: string;
  weight: number; // 1–10
}

function calcConfidence(evidences: Evidence[]): {
  confidence: Confidence;
  evidence: string[];
} {
  const totalWeight = evidences.reduce((sum, e) => sum + e.weight, 0);
  const signals = evidences.map((e) => e.signal);

  if (totalWeight >= 15) return { confidence: "HIGH", evidence: signals };
  if (totalWeight >= 8) return { confidence: "MEDIUM", evidence: signals };
  if (totalWeight >= 4) return { confidence: "LOW", evidence: signals };
  return { confidence: "LOW", evidence: signals };
}

function addEvidence(evidences: Evidence[], signal: string, weight: number) {
  evidences.push({ signal, weight });
}

/* ─── Main detector ─── */
export function detectTechStack(input: TechStackInput): TechDetection[] {
  const detections: TechDetection[] = [];
  const {
    url,
    initialHtml,
    renderedHtml,
    scripts,
    stylesheets,
    globals,
    resourceUrls,
  } = input;

  const allText = initialHtml + renderedHtml;
  const allResources = [...scripts, ...stylesheets, ...resourceUrls];
  const lowerResources = allResources.map((r) => r.toLowerCase());

  /* ═══════════════════════════════════════════════════════
     BASE TECHNOLOGIES (always structural)
     ═══════════════════════════════════════════════════════ */
  detections.push({
    name: "HTML",
    confidence: "HIGH",
    evidence: ["Document structure present"],
  });

  const hasCss = stylesheets.length > 0 || /<style[>\s]/i.test(allText);
  if (hasCss) {
    detections.push({
      name: "CSS",
      confidence: "HIGH",
      evidence: ["Stylesheets or style tags present"],
    });
  }

  const hasJs =
    scripts.length > 0 ||
    /<script[>\s]/i.test(allText) ||
    Object.values(globals).some(Boolean);
  if (hasJs) {
    detections.push({
      name: "JavaScript",
      confidence: "HIGH",
      evidence: ["Script execution or script tags present"],
    });
  }

  /* ═══════════════════════════════════════════════════════
     REACT
     ═══════════════════════════════════════════════════════ */
  const reactEvidences: Evidence[] = [];
  if (globals.React)
    addEvidence(reactEvidences, "React global object detected", 10);
  if (globals.ReactDOM)
    addEvidence(reactEvidences, "ReactDOM global object detected", 10);
  if (
    allResources.some((r) =>
      /react[.\-]dom|react\.production|react\.development/i.test(r),
    )
  ) {
    addEvidence(reactEvidences, "React bundle URL detected", 8);
  }
  if (/data-reactroot|data-reactid|_reactListening/i.test(allText)) {
    addEvidence(reactEvidences, "React DOM attributes detected", 8);
  }
  const reactRes = calcConfidence(reactEvidences);
  if (reactRes.confidence !== "LOW" || reactEvidences.length >= 2) {
    detections.push({ name: "React", ...reactRes });
  }

  /* ═══════════════════════════════════════════════════════
     NEXT.JS
     ═══════════════════════════════════════════════════════ */
  const nextEvidences: Evidence[] = [];
  if (globals.__NEXT_DATA__)
    addEvidence(nextEvidences, "__NEXT_DATA__ global detected", 10);
  if (globals.Next) addEvidence(nextEvidences, "Next global detected", 8);
  if (lowerResources.some((r) => /\/_next\//.test(r))) {
    addEvidence(nextEvidences, "/_next/ asset paths detected", 10);
  }
  if (allResources.some((r) => /next\/font|next\/link|next\/image/i.test(r))) {
    addEvidence(nextEvidences, "Next.js-specific resource detected", 8);
  }
  if (/id="__next"|__NEXT_DATA__/i.test(renderedHtml)) {
    addEvidence(nextEvidences, "Next.js DOM markers detected", 7);
  }
  const nextRes = calcConfidence(nextEvidences);
  if (nextRes.confidence !== "LOW" || nextEvidences.length >= 2) {
    detections.push({ name: "Next.js", ...nextRes });
  }

  /* ═══════════════════════════════════════════════════════
     VUE
     ═══════════════════════════════════════════════════════ */
  const vueEvidences: Evidence[] = [];
  if (globals.Vue) addEvidence(vueEvidences, "Vue global object detected", 10);
  if (/__VUE__|__VUE_OPTIONS__|__VUE_PROD_DEVTOOLS__/i.test(allText)) {
    addEvidence(vueEvidences, "Vue-specific runtime markers detected", 8);
  }
  if (allResources.some((r) => /vue[.\-]\d|vue\.min|vue\.esm/i.test(r))) {
    addEvidence(vueEvidences, "Vue bundle URL detected", 8);
  }
  if (/data-v-[a-f0-9]{8}/i.test(renderedHtml)) {
    addEvidence(vueEvidences, "Vue scoped style attributes detected", 7);
  }
  const vueRes = calcConfidence(vueEvidences);
  if (vueRes.confidence !== "LOW" || vueEvidences.length >= 2) {
    detections.push({ name: "Vue", ...vueRes });
  }

  /* ═══════════════════════════════════════════════════════
     ANGULAR
     ═══════════════════════════════════════════════════════ */
  const angularEvidences: Evidence[] = [];
  if (globals.angular)
    addEvidence(angularEvidences, "Angular global object detected", 10);
  if (/_ngcontent-[a-z0-9]+|_nghost-[a-z0-9]+/i.test(renderedHtml)) {
    addEvidence(
      angularEvidences,
      "Angular component encapsulation attributes detected",
      9,
    );
  }
  if (
    allResources.some((r) => /angular[.\-]\d|@angular\/|angular\.min/i.test(r))
  ) {
    addEvidence(angularEvidences, "Angular bundle URL detected", 8);
  }
  const angularRes = calcConfidence(angularEvidences);
  if (angularRes.confidence !== "LOW" || angularEvidences.length >= 2) {
    detections.push({ name: "Angular", ...angularRes });
  }

  /* ═══════════════════════════════════════════════════════
     WORDPRESS
     ═══════════════════════════════════════════════════════ */
  const wpEvidences: Evidence[] = [];
  if (
    lowerResources.some((r) =>
      /\/wp-content\/|\/wp-includes\/|\/wp-admin\//.test(r),
    )
  ) {
    addEvidence(wpEvidences, "WordPress directory structure detected", 10);
  }
  if (/wp-json\/|wp-json\/wp\/v2\//i.test(allText)) {
    addEvidence(wpEvidences, "WordPress REST API endpoints detected", 9);
  }
  if (
    /<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*WordPress/i.test(
      allText,
    )
  ) {
    addEvidence(wpEvidences, "WordPress generator meta tag detected", 8);
  }
  if (/wp-block|wp-block-group|wp-element/i.test(renderedHtml)) {
    addEvidence(wpEvidences, "WordPress block classes detected", 7);
  }
  if (globals.wp) addEvidence(wpEvidences, "WordPress global (wp) detected", 8);
  const wpRes = calcConfidence(wpEvidences);
  if (wpRes.confidence !== "LOW" || wpEvidences.length >= 2) {
    detections.push({ name: "WordPress", ...wpRes });
  }

  /* ═══════════════════════════════════════════════════════
     SHOPIFY  —  CRITICAL: never detect from text alone
     ═══════════════════════════════════════════════════════ */
  const shopifyEvidences: Evidence[] = [];
  if (/myshopify\.com|\.shopify\.com/i.test(url)) {
    addEvidence(shopifyEvidences, "Shopify domain detected", 10);
  }
  if (globals.Shopify)
    addEvidence(shopifyEvidences, "Shopify global object detected", 10);
  if (lowerResources.some((r) => /cdn\.shopify\.com|shopifycdn\.com/.test(r))) {
    addEvidence(shopifyEvidences, "Shopify CDN assets detected", 10);
  }
  if (/__SHOPIFY|shopify-checkout|shopify-payment-button/i.test(allText)) {
    addEvidence(
      shopifyEvidences,
      "Shopify-specific runtime signatures detected",
      8,
    );
  }
  if (globals.__SHOPIFY)
    addEvidence(shopifyEvidences, "__SHOPIFY global detected", 9);
  const shopifyRes = calcConfidence(shopifyEvidences);
  if (shopifyRes.confidence !== "LOW" || shopifyEvidences.length >= 2) {
    detections.push({ name: "Shopify", ...shopifyRes });
  }

  /* ═══════════════════════════════════════════════════════
     TAILWIND CSS
     ═══════════════════════════════════════════════════════ */
  const twEvidences: Evidence[] = [];
  if (
    allResources.some((r) =>
      /tailwindcss|tailwind\.css|tailwindcss\.com/i.test(r),
    )
  ) {
    addEvidence(twEvidences, "Tailwind CSS resource URL detected", 10);
  }

  const classText =
    renderedHtml.match(/class=["']([^"']+)["']/g)?.join(" ") || "";
  const allClasses = classText.match(/[^"'\s]+/g) || [];
  const variantClasses = allClasses.filter((c) =>
    /^(sm|md|lg|xl|2xl|hover|focus|active|dark|group-hover|disabled):/.test(c),
  );
  const arbitraryClasses = allClasses.filter((c) => /\[[^\]]+\]/.test(c));
  const twSpecific = allClasses.filter((c) =>
    /^(prose|sr-only|not-sr-only|ring-|outline-|divide-|space-x-|space-y-|placeholder-|selection-|marker-|file:|backdrop-|scroll-|snap-|touch-|will-change|isolate|aspect-|columns-|break-after|box-decoration)/.test(
      c,
    ),
  );

  if (variantClasses.length >= 3) {
    addEvidence(
      twEvidences,
      `${variantClasses.length} Tailwind variant classes (responsive/state prefixes)`,
      9,
    );
  }
  if (twSpecific.length >= 2) {
    addEvidence(
      twEvidences,
      `Tailwind-specific utilities: ${twSpecific.slice(0, 3).join(", ")}`,
      9,
    );
  }
  if (arbitraryClasses.length >= 2) {
    addEvidence(
      twEvidences,
      `${arbitraryClasses.length} arbitrary value classes (e.g., ${arbitraryClasses[0]})`,
      8,
    );
  }
  const twRes = calcConfidence(twEvidences);
  if (twRes.confidence !== "LOW" || twEvidences.length >= 2) {
    detections.push({ name: "Tailwind CSS", ...twRes });
  }

  /* ═══════════════════════════════════════════════════════
     BOOTSTRAP
     ═══════════════════════════════════════════════════════ */
  const bsEvidences: Evidence[] = [];
  if (
    allResources.some((r) =>
      /bootstrap[.\-]\d|bootstrap\.min|bootstrap\.bundle|bootstrapcdn/i.test(r),
    )
  ) {
    addEvidence(bsEvidences, "Bootstrap CSS/JS bundle detected", 10);
  }

  const bs5Attrs = (renderedHtml.match(/data-bs-[a-z]+=/g) || []).length;
  if (bs5Attrs >= 3)
    addEvidence(bsEvidences, `${bs5Attrs} Bootstrap 5 data-bs-* attributes`, 9);

  const bs4Attrs = (
    renderedHtml.match(/data-toggle=|data-target=|data-dismiss=/g) || []
  ).length;
  if (bs4Attrs >= 2)
    addEvidence(bsEvidences, `${bs4Attrs} Bootstrap 4 data-* attributes`, 7);

  const bsClasses = [
    "container",
    "container-fluid",
    "row",
    "col",
    "col-auto",
    "btn",
    "btn-primary",
    "card",
    "card-body",
    "navbar",
    "navbar-expand",
    "modal",
    "modal-dialog",
    "alert",
    "alert-primary",
    "badge",
    "bg-primary",
    "breadcrumb",
    "carousel",
    "dropdown",
    "dropdown-menu",
    "form-control",
    "form-select",
    "input-group",
    "list-group",
    "list-group-item",
    "pagination",
    "progress",
    "progress-bar",
    "spinner-border",
    "spinner-grow",
    "table",
    "table-striped",
    "toast",
    "tooltip",
  ];
  const foundBs = bsClasses.filter((c) =>
    new RegExp(`\\b${c}\\b`).test(renderedHtml),
  );
  if (foundBs.length >= 5) {
    addEvidence(
      bsEvidences,
      `${foundBs.length} Bootstrap component classes detected`,
      8,
    );
  }

  const bsRes = calcConfidence(bsEvidences);
  if (bsRes.confidence !== "LOW" || bsEvidences.length >= 2) {
    detections.push({ name: "Bootstrap", ...bsRes });
  }

  /* ═══════════════════════════════════════════════════════
     JQUERY
     ═══════════════════════════════════════════════════════ */
  const jqEvidences: Evidence[] = [];
  if (globals.jQuery)
    addEvidence(jqEvidences, "jQuery global object detected", 10);
  if (
    allResources.some((r) => /jquery[.\-]\d|jquery\.min|jquery\.slim/i.test(r))
  ) {
    addEvidence(jqEvidences, "jQuery script URL detected", 9);
  }
  const jqRes = calcConfidence(jqEvidences);
  if (jqRes.confidence !== "LOW" || jqEvidences.length >= 2) {
    detections.push({ name: "jQuery", ...jqRes });
  }

  /* ═══════════════════════════════════════════════════════
     ASTRO
     ═══════════════════════════════════════════════════════ */
  const astroEvidences: Evidence[] = [];
  if (globals.astro) addEvidence(astroEvidences, "Astro global detected", 8);
  if (/data-astro-cid-[a-z0-9]+/i.test(renderedHtml)) {
    addEvidence(astroEvidences, "Astro component scope attributes detected", 9);
  }
  if (allResources.some((r) => /\/_astro\//i.test(r))) {
    addEvidence(astroEvidences, "/_astro/ asset path detected", 9);
  }
  const astroRes = calcConfidence(astroEvidences);
  if (astroRes.confidence !== "LOW" || astroEvidences.length >= 2) {
    detections.push({ name: "Astro", ...astroRes });
  }

  /* ═══════════════════════════════════════════════════════
     SVELTEKIT
     ═══════════════════════════════════════════════════════ */
  const skEvidences: Evidence[] = [];
  if (globals.__sveltekit)
    addEvidence(skEvidences, "__sveltekit global detected", 9);
  if (/data-sveltekit-/i.test(renderedHtml)) {
    addEvidence(skEvidences, "SvelteKit data attributes detected", 8);
  }
  if (allResources.some((r) => /\/_app\/immutable\//i.test(r))) {
    addEvidence(skEvidences, "SvelteKit immutable asset path detected", 8);
  }
  const skRes = calcConfidence(skEvidences);
  if (skRes.confidence !== "LOW" || skEvidences.length >= 2) {
    detections.push({ name: "SvelteKit", ...skRes });
  }

  /* ═══════════════════════════════════════════════════════
     REMIX
     ═══════════════════════════════════════════════════════ */
  const remixEvidences: Evidence[] = [];
  if (globals.__remixContext)
    addEvidence(remixEvidences, "__remixContext global detected", 10);
  if (
    allResources.some((r) =>
      /\/build\/_shared\/chunk-|\/build\/manifest/i.test(r),
    )
  ) {
    addEvidence(remixEvidences, "Remix build asset pattern detected", 8);
  }
  const remixRes = calcConfidence(remixEvidences);
  if (remixRes.confidence !== "LOW" || remixEvidences.length >= 2) {
    detections.push({ name: "Remix", ...remixRes });
  }

  /* ═══════════════════════════════════════════════════════
     GATSBY
     ═══════════════════════════════════════════════════════ */
  const gatsbyEvidences: Evidence[] = [];
  if (globals.___gatsby)
    addEvidence(gatsbyEvidences, "___gatsby global detected", 10);
  if (
    /___gatsby|gatsby-focus-wrapper|gatsby-image-wrapper/i.test(renderedHtml)
  ) {
    addEvidence(gatsbyEvidences, "Gatsby DOM markers detected", 8);
  }
  const gatsbyRes = calcConfidence(gatsbyEvidences);
  if (gatsbyRes.confidence !== "LOW" || gatsbyEvidences.length >= 2) {
    detections.push({ name: "Gatsby", ...gatsbyRes });
  }

  /* ═══════════════════════════════════════════════════════
     WEBFLOW
     ═══════════════════════════════════════════════════════ */
  const wfEvidences: Evidence[] = [];
  if (globals.Webflow) addEvidence(wfEvidences, "Webflow global detected", 9);
  if (globals.__WEBFLOW_CURRENCY_SETTINGS) {
    addEvidence(wfEvidences, "Webflow currency settings global detected", 10);
  }
  if (
    /data-w-id|data-wf-page|data-wf-site|w-nav|w-slider|w-tabs|w-dyn-list/i.test(
      renderedHtml,
    )
  ) {
    addEvidence(wfEvidences, "Webflow-specific attributes/classes detected", 9);
  }
  if (
    allResources.some((r) =>
      /cdn\.prod\.website-files\.com|assets-global\.website-files\.com/i.test(
        r,
      ),
    )
  ) {
    addEvidence(wfEvidences, "Webflow CDN assets detected", 9);
  }
  const wfRes = calcConfidence(wfEvidences);
  if (wfRes.confidence !== "LOW" || wfEvidences.length >= 2) {
    detections.push({ name: "Webflow", ...wfRes });
  }

  /* ═══════════════════════════════════════════════════════
     FILTER: Only report technologies with sufficient evidence.
     LOW confidence is dropped unless multiple signals exist.
     ═══════════════════════════════════════════════════════ */
  const final = detections.filter((d) => {
    if (d.confidence === "HIGH") return true;
    if (d.confidence === "MEDIUM") return true;
    return d.confidence === "LOW" && d.evidence.length >= 2;
  });

  const seen = new Set<string>();
  return final.filter((d) => {
    if (seen.has(d.name)) return false;
    seen.add(d.name);
    return true;
  });
}
