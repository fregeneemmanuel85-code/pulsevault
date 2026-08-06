import { ASSISTANT_KB, type KBEntry } from "@/data/assistant-kb";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreEntry(entry: KBEntry, queryTokens: string[]): number {
  const entryTokens = Array.from(
    new Set([
      ...entry.keywords.flatMap((k) => tokenize(k)),
      ...tokenize(entry.answer),
    ]),
  );

  let hits = 0;
  for (const qt of queryTokens) {
    for (const et of entryTokens) {
      if (et.includes(qt) || qt.includes(et)) {
        hits += 1;
        break;
      }
    }
  }

  return hits / Math.max(queryTokens.length, 1);
}

export interface KBResult {
  found: boolean;
  answer: string;
  category: string;
  confidence: number;
  entryId: string;
}

export function searchKnowledgeBase(query: string): KBResult {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return {
      found: false,
      answer: "",
      category: "",
      confidence: 0,
      entryId: "",
    };
  }

  let best: KBEntry | null = null;
  let bestScore = 0;

  for (const entry of ASSISTANT_KB) {
    const score = scoreEntry(entry, queryTokens);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  const threshold = 0.35;
  if (best && bestScore >= threshold) {
    return {
      found: true,
      answer: best.answer,
      category: best.category,
      confidence: bestScore,
      entryId: best.id,
    };
  }

  return { found: false, answer: "", category: "", confidence: 0, entryId: "" };
}
