import { ASSISTANT_KB, type KBEntry } from "@/data/assistant-kb";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreEntry(entry: KBEntry, query: string): number {
  const queryNorm = normalize(query);
  let matches = 0;

  for (const kw of entry.keywords) {
    const kwNorm = normalize(kw);

    // Exact phrase match = high score
    if (queryNorm.includes(kwNorm)) {
      matches += 2;
      continue;
    }

    // Word overlap match = lower score
    const kwWords = kwNorm.split(" ").filter((w) => w.length > 2);
    const queryWords = queryNorm.split(" ");
    const overlap = kwWords.filter((w) => queryWords.includes(w)).length;

    if (overlap >= kwWords.length * 0.6) {
      matches += 1;
    }
  }

  // Require at least 2 match points
  return matches >= 2 ? Math.min(matches / 4, 1) : 0;
}

export interface KBResult {
  found: boolean;
  answer: string;
  category: string;
  confidence: number;
  entryId: string;
}

export function searchKnowledgeBase(query: string): KBResult {
  if (!query || query.trim().length < 3) {
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
    const score = scoreEntry(entry, query);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  const threshold = 0.5;
  if (best && bestScore >= threshold) {
    return {
      found: true,
      answer: best.answer,
      category: best.category,
      confidence: bestScore,
      entryId: best.id,
    };
  }

  return {
    found: false,
    answer: "",
    category: "",
    confidence: 0,
    entryId: "",
  };
}
