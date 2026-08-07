"use client";

import { useState, useEffect } from "react";
import { Shield, Zap } from "lucide-react";

interface Props {
  role: "user" | "assistant";
  text: string;
  source?: "knowledge-base" | "gemini" | "groq";
  creditCost?: number;
  isNew?: boolean;
  onAnimationComplete?: () => void;
}

export default function ChatMessage({
  role,
  text,
  source,
  creditCost,
  isNew,
  onAnimationComplete,
}: Props) {
  const isUser = role === "user";
  const [displayedText, setDisplayedText] = useState(isNew ? "" : text);
  const [showMeta, setShowMeta] = useState(!isNew);

  useEffect(() => {
    if (!isNew || isUser) {
      setDisplayedText(text);
      setShowMeta(true);
      return;
    }

    setDisplayedText("");
    setShowMeta(false);
    let i = 0;
    const speed = text.length > 500 ? 8 : text.length > 200 ? 12 : 16;

    const timer = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setShowMeta(true);
        onAnimationComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, isNew, isUser, onAnimationComplete]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="bg-indigo-500/10 p-1.5 rounded-lg mr-2 mt-0.5 shrink-0 h-fit">
          <Shield size={12} className="text-indigo-400" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20"
            : "bg-[#1e293b] text-slate-200 rounded-tl-none border border-white/[0.06]"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{displayedText}</div>

        {!isUser && showMeta && source && (
          <div className="mt-2.5 flex items-center gap-2 text-[11px] opacity-60 border-t border-white/[0.06] pt-2">
            {source === "knowledge-base" && (
              <>
                <Zap size={10} className="text-emerald-400" />
                <span className="text-emerald-400/80">Instant — 0 credits</span>
              </>
            )}
            {source === "gemini" && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-indigo-400" />
                <span className="text-slate-400">
                  PV Assistant{creditCost ? ` — ${creditCost} cr` : ""}
                </span>
              </>
            )}
            {source === "groq" && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-violet-400" />
                <span className="text-slate-400">
                  PV Assistant{creditCost ? ` — ${creditCost} cr` : ""}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
