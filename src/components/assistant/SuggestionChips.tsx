"use client";

interface Props {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  "Why is my health score low?",
  "How do I fix my SSL issue?",
  "Analyze my websites",
  "Explain my broken links",
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
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
