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
  skipKB: boolean;
}

const URL_REGEX = /https?:\/\/[^\s]+/i;
const DOMAIN_REGEX =
  /\b[a-z0-9-]+\.(com|net|org|io|app|dev|co|uk|ng|me|website|blog|shop|store)\b/i;

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
  /tell me a joke/i,
  /who are you/i,
];

const REPORT_PATTERNS = [
  /generate (a |the )?report/i,
  /client report/i,
  /summary report/i,
  /detailed report/i,
  /create (a |the )?report/i,
  /pdf/i,
  /export/i,
  /summarize (performance|health|everything|all)/i,
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
  /tell me (about|the status of)/i,
];

const DETAILED_PATTERNS = [
  /explain all/i,
  /explain my \w+ issues/i,
  /what are my (issues|problems|errors)/i,
  /list (all|my)/i,
  /detail/i,
  /breakdown/i,
  /why is my \w+ (low|bad|red|yellow|critical)/i,
  /how do i fix (this|my|all)/i,
  /what is wrong with/i,
  /what's wrong with/i,
];

export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Contains a URL or specific domain? → Always use AI with context
  if (URL_REGEX.test(message) || DOMAIN_REGEX.test(message)) {
    return {
      type: "detailed",
      creditCost: 3,
      label: "Site-Specific Question",
      skipKB: true,
    };
  }

  // Off-topic guard
  for (const p of OFFTOPIC_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "offtopic",
        creditCost: 0,
        label: "Off-topic",
        skipKB: true,
      };
    }
  }

  // Report
  for (const p of REPORT_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "report",
        creditCost: 15,
        label: "Report Generation",
        skipKB: true,
      };
    }
  }

  // Analysis
  for (const p of ANALYSIS_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "analysis",
        creditCost: 10,
        label: "Full Analysis",
        skipKB: true,
      };
    }
  }

  // Detailed
  for (const p of DETAILED_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "detailed",
        creditCost: 3,
        label: "Detailed Explanation",
        skipKB: true,
      };
    }
  }

  // Simple (default) — allow KB
  return {
    type: "simple",
    creditCost: 1,
    label: "Simple Question",
    skipKB: false,
  };
}
