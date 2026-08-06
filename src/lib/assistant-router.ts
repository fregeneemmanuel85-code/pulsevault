export type IntentType =
  | "simple"
  | "detailed"
  | "analysis"
  | "report"
  | "offtopic";

export interface IntentResult {
  type: IntentType;
  creditCost: number;
  label: string;
}

const SIMPLE_PATTERNS = [
  /why is my \w+ (showing|low|bad|red|yellow)/i,
  /what does \w+ (mean|do)/i,
  /how do i fix (this|one|a single)/i,
  /what is \w+/i,
  /how to \w+/i,
  /why \w+/i,
  /meaning of \w+/i,
  /explain (ssl|dns|health|seo|mixed content)/i,
];

const DETAILED_PATTERNS = [
  /explain all/i,
  /explain my \w+ issues/i,
  /tell me about (all|my)/i,
  /what are my (issues|problems|errors)/i,
  /list (all|my)/i,
  /detail/i,
  /breakdown/i,
];

const ANALYSIS_PATTERNS = [
  /analyze/i,
  /review (all|my|everything)/i,
  /check everything/i,
  /full (scan|check|analysis)/i,
  /what should i fix/i,
  /prioritize/i,
  /overview/i,
  /health check/i,
];

const REPORT_PATTERNS = [
  /generate (a |the )?report/i,
  /client report/i,
  /summary report/i,
  /detailed report/i,
  /create (a |the )?report/i,
  /pdf/i,
  /export/i,
  /summarize (performance|health|everything)/i,
];

const OFFTOPIC_PATTERNS = [
  /who won/i,
  /weather/i,
  /news/i,
  /politics/i,
  /sports/i,
  /recipe/i,
  /movie/i,
  /song/i,
  /president/i,
  /election/i,
  /world cup/i,
  /bitcoin/i,
  /stock price/i,
  /chatgpt/i,
  /openai/i,
];

export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Off-topic guard
  for (const p of OFFTOPIC_PATTERNS) {
    if (p.test(lower))
      return { type: "offtopic", creditCost: 0, label: "Off-topic" };
  }

  // Report
  for (const p of REPORT_PATTERNS) {
    if (p.test(lower))
      return { type: "report", creditCost: 15, label: "Report Generation" };
  }

  // Analysis
  for (const p of ANALYSIS_PATTERNS) {
    if (p.test(lower))
      return { type: "analysis", creditCost: 10, label: "Full Analysis" };
  }

  // Detailed
  for (const p of DETAILED_PATTERNS) {
    if (p.test(lower))
      return { type: "detailed", creditCost: 3, label: "Detailed Explanation" };
  }

  // Simple (default)
  for (const p of SIMPLE_PATTERNS) {
    if (p.test(lower))
      return { type: "simple", creditCost: 1, label: "Simple Question" };
  }

  // Heuristic: long messages with multiple questions tend to be detailed/analysis
  const wordCount = lower.split(/\s+/).length;
  const questionCount = (lower.match(/\?/g) || []).length;

  if (questionCount >= 3 || wordCount > 40) {
    return { type: "detailed", creditCost: 3, label: "Detailed Explanation" };
  }

  // Default to simple
  return { type: "simple", creditCost: 1, label: "Simple Question" };
}
