export type IntentType =
  | "simple"
  | "detailed"
  | "analysis"
  | "report"
  | "code"
  | "deep-code"
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
  /what is wrong with/i,
  /what's wrong with/i,
  /what website has/i,
  /which (site|website) has/i,
  /where is (this|that|the) code/i,
];

const DEEP_CODE_PATTERNS = [
  /full implementation/i,
  /complete (solution|code|implementation)/i,
  /production.ready/i,
  /production ready/i,
  /deep (code|implementation)/i,
  /complex (code|solution)/i,
  /entire (file|component|module)/i,
  /write the full/i,
  /full (page|api|route|function)/i,
  /step by step code/i,
  /detailed implementation/i,
  /end to end/i,
  /working example/i,
  /production grade/i,
  /advanced (code|implementation)/i,
];

const CODE_PATTERNS = [
  /write (me |a |some )?code/i,
  /give me (the |a )?code/i,
  /show me (the )?code/i,
  /code for/i,
  /fix my code/i,
  /how to (implement|build|create|write)/i,
  /create a (function|component|script|route)/i,
  /script for/i,
  /example code/i,
  /code snippet/i,
  /generate code/i,
  /help me code/i,
  /programming help/i,
  /css fix/i,
  /js fix/i,
  /react component/i,
  /next\.?js/i,
  /tailwind/i,
  /html for/i,
  /typescript for/i,
  /config for/i,
  /nginx config/i,
  /dockerfile/i,
  /middleware/i,
  /api route/i,
  /fix (this|my) (error|bug|issue)/i,
  /how do i (solve|fix)/i,
  /(solve|fix) (this|it|that|problem)/i,
  /code to (fix|solve)/i,
  /show me (how|the way) to (fix|solve)/i,
  /what'?s the (fix|solution|code)/i,
  /help me (fix|solve)/i,
  /give me (the |a )?(fix|solution)/i,
  /implement (a |the )?fix/i,
  /write (a |the )?(fix|solution)/i,
  /can you (fix|solve)/i,
  /need (code|script) (to|for)/i,
  /\buse code\b/i,
  /\bcan you code\b/i,
  /\bcode please\b/i,
  /\bshow code\b/i,
  /\bi want code\b/i,
  /\bi need code\b/i,
  /\bneed code\b/i,
  /\bwrite code\b/i,
  /\bget code\b/i,
  /\bmake code\b/i,
  /\bproduce code\b/i,
  /\bcode (now|up)\b/i,
  /\bcode me\b/i,
  /\bcode for this\b/i,
  /\bdebug\b/i,
  /\bbug in\b/i,
  /\berror in\b/i,
  /\btraceback\b/i,
  /\bconsole\.(log|error)\b/i,
  /\brefactor\b/i,
];

// Detect raw pasted code snippets
function looksLikePastedCode(message: string): boolean {
  // Contains code block
  if (/```[\s\S]*?```/.test(message)) return true;
  // Contains function declaration
  if (/\bfunction\s+\w+\s*\(/.test(message)) return true;
  // Contains arrow function or const assignment with code structure
  if (/\b(const|let|var)\s+\w+\s*=/.test(message) && /[{};]/.test(message))
    return true;
  // Contains imports/exports
  if (/\b(import|export)\s+/.test(message)) return true;
  // Contains class or interface
  if (/\b(class|interface|type)\s+\w+/.test(message)) return true;
  // Contains HTML tags
  if (/<\/?[a-z][\s\S]*?>/.test(message) && message.includes(">")) return true;
  return false;
}

export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Pasted code always = code fix mode
  if (looksLikePastedCode(message)) {
    return {
      type: "code",
      creditCost: 10,
      label: "Code Fix",
      skipKB: true,
    };
  }

  if (URL_REGEX.test(message) || DOMAIN_REGEX.test(message)) {
    return {
      type: "detailed",
      creditCost: 3,
      label: "Site-Specific Question",
      skipKB: true,
    };
  }

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

  for (const p of DEEP_CODE_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "deep-code",
        creditCost: 15,
        label: "Deep Code Generation",
        skipKB: true,
      };
    }
  }

  for (const p of CODE_PATTERNS) {
    if (p.test(lower)) {
      return {
        type: "code",
        creditCost: 10,
        label: "Code Generation",
        skipKB: true,
      };
    }
  }

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

  return {
    type: "simple",
    creditCost: 1,
    label: "Simple Question",
    skipKB: false,
  };
}
