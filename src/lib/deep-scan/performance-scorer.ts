/* ─────────────────────────────────────────────────────────────
   Lighthouse-Style Performance Scorer
   Weights: FCP 10% | SI 10% | LCP 25% | TBT 30% | CLS 25%
   Uses log-normal CDF curves (same methodology as Lighthouse)
   ───────────────────────────────────────────────────────────── */

export interface RawMetrics {
  fcp: number; // ms
  si: number; // ms
  lcp: number; // ms
  tbt: number; // ms
  cls: number; // unitless
  pageSize: number; // bytes
  responseTime: number; // ms
  loadTime: number; // ms
}

export interface ScoredMetric {
  value: number;
  score: number; // 0–100
  display: string;
}

export interface PerformanceReport {
  score: number; // 0–100
  metrics: {
    fcp: ScoredMetric;
    si: ScoredMetric;
    lcp: ScoredMetric;
    tbt: ScoredMetric;
    cls: ScoredMetric;
    pageSize: { value: number; display: string };
    responseTime: { value: number; display: string };
    loadTime: { value: number; display: string };
  };
}

/* ─── Error function for standard normal CDF ─── */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function standardNormalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/* ─── Log-normal scoring curve (Lighthouse v10/v11) ───
 * median = value that scores 50
 * p10    = value that scores ~90.8
 */
function scoreFromLogNormal(
  value: number,
  median: number,
  p10: number,
): number {
  if (value <= 0) return 100;
  const mu = Math.log(median);
  const sigma = Math.abs(Math.log(p10) - mu) / 1.2815515655446004; // Φ⁻¹(0.9)
  const z = (Math.log(value) - mu) / sigma;
  const score = 1 - standardNormalCDF(z);
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

/* ─── Lighthouse scoring parameters ─── */
const CURVES = {
  fcp: { median: 3000, p10: 1800 },
  si: { median: 5800, p10: 3387 },
  lcp: { median: 4000, p10: 2500 },
  tbt: { median: 600, p10: 200 },
  cls: { median: 0.25, p10: 0.1 },
};

const WEIGHTS = {
  fcp: 0.1,
  si: 0.1,
  lcp: 0.25,
  tbt: 0.3,
  cls: 0.25,
};

export function calculatePerformanceScore(
  metrics: RawMetrics,
): PerformanceReport {
  const fcpScore = scoreFromLogNormal(
    metrics.fcp,
    CURVES.fcp.median,
    CURVES.fcp.p10,
  );
  const siScore = scoreFromLogNormal(
    metrics.si,
    CURVES.si.median,
    CURVES.si.p10,
  );
  const lcpScore = scoreFromLogNormal(
    metrics.lcp,
    CURVES.lcp.median,
    CURVES.lcp.p10,
  );
  const tbtScore = scoreFromLogNormal(
    metrics.tbt,
    CURVES.tbt.median,
    CURVES.tbt.p10,
  );
  const clsScore = scoreFromLogNormal(
    metrics.cls,
    CURVES.cls.median,
    CURVES.cls.p10,
  );

  const weighted =
    fcpScore * WEIGHTS.fcp +
    siScore * WEIGHTS.si +
    lcpScore * WEIGHTS.lcp +
    tbtScore * WEIGHTS.tbt +
    clsScore * WEIGHTS.cls;

  const finalScore = Math.max(0, Math.min(100, Math.round(weighted)));

  return {
    score: finalScore,
    metrics: {
      fcp: {
        value: metrics.fcp,
        score: fcpScore,
        display: `${(metrics.fcp / 1000).toFixed(1)}s`,
      },
      si: {
        value: metrics.si,
        score: siScore,
        display: `${(metrics.si / 1000).toFixed(1)}s`,
      },
      lcp: {
        value: metrics.lcp,
        score: lcpScore,
        display: `${(metrics.lcp / 1000).toFixed(1)}s`,
      },
      tbt: {
        value: metrics.tbt,
        score: tbtScore,
        display: `${metrics.tbt.toFixed(0)}ms`,
      },
      cls: {
        value: metrics.cls,
        score: clsScore,
        display: metrics.cls.toFixed(3),
      },
      pageSize: {
        value: metrics.pageSize,
        display: formatBytes(metrics.pageSize),
      },
      responseTime: {
        value: metrics.responseTime,
        display: `${(metrics.responseTime / 1000).toFixed(2)}s`,
      },
      loadTime: {
        value: metrics.loadTime,
        display: `${(metrics.loadTime / 1000).toFixed(2)}s`,
      },
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
