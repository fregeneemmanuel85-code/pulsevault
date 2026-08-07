"use client";

import { useState } from "react";
import { X, Lightbulb } from "lucide-react";

interface Props {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  "Check my website health",
  "How to fix SSL issues?",
  "Analyze all my sites",
  "Explain broken links",
  "What should I fix first?",
];

export default function SuggestionChips({ onSelect, disabled }: Props) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1 rounded-full transition-all duration-200 mb-2 w-fit"
      >
        <Lightbulb size={12} />
        Show suggestions
      </button>
    );
  }

  return (
    <div className="relative mb-3">
      <div className="flex items-center justify-between mb-1.5 pr-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Quick questions
        </span>
        <button
          onClick={() => setMinimized(true)}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          title="Hide suggestions"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="text-[11px] bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-white/[0.06] px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-40 hover:border-indigo-500/30"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
