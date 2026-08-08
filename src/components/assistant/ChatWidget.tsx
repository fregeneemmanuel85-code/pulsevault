"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Shield, X, Send, Minus, Maximize2, Minimize2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import CreditBadge from "./CreditBadge";
import SuggestionChips from "./SuggestionChips";
import ThinkingIndicator from "./ThinkingIndicator";
import { handleSmallTalk } from "@/lib/assistant/small-talk";

interface Message {
  role: "user" | "assistant";
  text: string;
  source?: "knowledge-base" | "gemini" | "groq";
  creditCost?: number;
  isNew?: boolean;
}

const STORAGE_KEY = "pv-assistant-messages";
const OPENED_KEY = "pv-assistant-opened";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const opened = localStorage.getItem(OPENED_KEY);
    setHasOpenedBefore(!!opened);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, welcomeStep]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const runWelcomeSequence = useCallback(() => {
    setShowWelcome(true);
    setWelcomeStep(0);
    const steps = [1, 2, 3];
    steps.forEach((step, i) => {
      setTimeout(() => setWelcomeStep(step), 400 + i * 350);
    });
    setTimeout(() => {
      setShowWelcome(false);
      const intro: Message = {
        role: "assistant",
        text: "Hi! I'm PV Assistant. Ask me anything about your websites, health scores, alerts, or how to fix issues.",
        source: "knowledge-base",
        isNew: true,
      };
      setMessages([intro]);
    }, 1800);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (!hasOpenedBefore) {
      localStorage.setItem(OPENED_KEY, "true");
      setHasOpenedBefore(true);
      runWelcomeSequence();
    } else if (messages.length === 0) {
      const intro: Message = {
        role: "assistant",
        text: "Hi! I'm PV Assistant. Ask me anything about your websites, health scores, alerts, or how to fix issues.",
        source: "knowledge-base",
      };
      setMessages([intro]);
    }
  };

  const handleMinimize = () => {
    setOpen(false);
    setIsMaximized(false);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || loading) return;

    // ── Small talk: local, no API, no credits ──
    const smallTalk = handleSmallTalk(text);
    if (smallTalk.handled) {
      const userMsg: Message = { role: "user", text };
      const assistantMsg: Message = {
        role: "assistant",
        text: smallTalk.response,
        source: "knowledge-base",
        creditCost: 0,
        isNew: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      if (!textOverride) setInput("");
      return;
    }

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { error: "Server returned invalid JSON" };
      }

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.error || `Server error (${res.status})`,
            source: "gemini",
            isNew: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply,
            source: data.source as any,
            creditCost: data.creditsUsed,
            isNew: true,
          },
        ]);
        setRefreshKey((k) => k + 1);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Network error: ${err.message || "Could not reach server"}`,
          source: "gemini",
          isNew: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const panelClasses = isMaximized
    ? "fixed inset-0 sm:inset-4 md:inset-6 sm:max-w-5xl sm:max-h-[85vh] sm:mx-auto sm:my-auto rounded-none sm:rounded-2xl"
    : "fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-0 sm:w-[400px] sm:h-[580px] rounded-none sm:rounded-2xl";

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <style jsx global>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(1.5px, -2px);
          }
          50% {
            transform: translate(-1px, 1.5px);
          }
          75% {
            transform: translate(2px, 0.5px);
          }
        }
        @keyframes panelIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes shieldIn {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes glowPulse {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);
          }
          50% {
            box-shadow: 0 0 32px rgba(99, 102, 241, 0.45);
          }
        }
        .pv-breathe {
          animation:
            breathe 5s ease-in-out infinite,
            float 8s ease-in-out infinite;
        }
        .pv-glow {
          animation: glowPulse 4s ease-in-out infinite;
        }
        .pv-panel-in {
          animation: panelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pv-shield-in {
          animation: shieldIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .pv-fade-up {
          opacity: 0;
          animation: fadeSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {!open ? (
        <button
          onClick={handleOpen}
          className="pv-breathe pv-glow relative bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ease-out"
          aria-label="Open PV Assistant"
        >
          <Shield size={24} strokeWidth={2} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      ) : (
        <div
          className={`
            ${panelClasses}
            bg-[#0b0f19]
            shadow-2xl
            border border-white/[0.06]
            flex flex-col
            overflow-hidden
            pv-panel-in
            transition-all
            duration-300
          `}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#312e81] text-white px-4 py-3.5 flex items-center justify-between shrink-0 sm:rounded-t-2xl border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 p-1.5 rounded-lg">
                <Shield size={16} className="text-indigo-300" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-wide">
                  PV Assistant
                </span>
                <p className="text-[10px] text-indigo-200/70 -mt-0.5">
                  Always monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CreditBadge refreshKey={refreshKey} />
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors duration-200 hidden sm:block"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                onClick={handleMinimize}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors duration-200"
                title="Minimize"
              >
                <Minus size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 min-w-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {showWelcome ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                <div
                  className={`pv-shield-in ${welcomeStep >= 0 ? "" : "opacity-0"}`}
                >
                  <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-5 rounded-2xl border border-indigo-500/20">
                    <Shield
                      size={40}
                      className="text-indigo-400"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p
                    className="pv-fade-up text-lg font-semibold text-slate-100"
                    style={{
                      animationDelay: "0ms",
                      opacity: welcomeStep >= 1 ? undefined : 0,
                    }}
                  >
                    🛡️ PV Assistant
                  </p>
                  <p
                    className="pv-fade-up text-sm text-slate-400"
                    style={{
                      animationDelay: "80ms",
                      opacity: welcomeStep >= 2 ? undefined : 0,
                    }}
                  >
                    Hello there 👋
                  </p>
                  <p
                    className="pv-fade-up text-xs text-slate-500 max-w-[260px] leading-relaxed"
                    style={{
                      animationDelay: "160ms",
                      opacity: welcomeStep >= 3 ? undefined : 0,
                    }}
                  >
                    I monitor your website, explain issues, and help you fix
                    problems.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <ChatMessage
                    key={i}
                    role={m.role}
                    text={m.text}
                    source={m.source}
                    creditCost={m.creditCost}
                    isNew={m.isNew}
                    onAnimationComplete={() => {
                      setMessages((prev) =>
                        prev.map((msg, idx) =>
                          idx === i ? { ...msg, isNew: false } : msg,
                        ),
                      );
                    }}
                  />
                ))}
                {loading && (
                  <div className="flex items-start gap-3 py-2">
                    <div className="bg-indigo-500/10 p-1.5 rounded-lg mt-0.5">
                      <Shield size={12} className="text-indigo-400" />
                    </div>
                    <div className="bg-[#1e293b] border border-white/[0.06] rounded-2xl rounded-tl-none px-4 py-3">
                      <ThinkingIndicator />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] p-3.5 shrink-0 bg-[#0b0f19]">
            {!showWelcome && (
              <SuggestionChips
                onSelect={(t) => sendMessage(t)}
                disabled={loading}
              />
            )}
            <div className="flex gap-2 mt-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendMessage()
                }
                placeholder="Ask about your dashboard..."
                disabled={loading || showWelcome}
                className="flex-1 min-w-0 bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim() || showWelcome}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all duration-200 shrink-0 shadow-lg shadow-indigo-900/20"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
