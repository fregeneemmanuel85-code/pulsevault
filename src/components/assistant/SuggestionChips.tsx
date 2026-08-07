"use client";

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
  return (
    <div className="flex flex-wrap gap-2 mb-3">
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
  );
}
