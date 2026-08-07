"use client";

export default function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-slate-400 font-medium tracking-wide">
        Analyzing your website
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-indigo-400"
            style={{
              animation: `thinkingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes thinkingDot {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
