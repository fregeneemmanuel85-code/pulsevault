"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import CreditBadge from "./CreditBadge";
import SuggestionChips from "./SuggestionChips";

interface Message {
  role: "user" | "assistant";
  text: string;
  source?: "knowledge-base" | "gemini" | "groq";
  creditCost?: number;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm PV Assistant. Ask me anything about your websites, health scores, alerts, or how to fix issues.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || loading) return;

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

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.error, source: "gemini" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply,
            source: data.source as any,
            creditCost: data.creditsUsed,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Please try again.",
          source: "gemini",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle size={24} />
        </button>
      ) : (
        <div
          className="
            fixed inset-0
            sm:absolute sm:inset-auto sm:bottom-0 sm:right-0
            sm:w-[380px] sm:h-[550px]
            bg-white
            sm:rounded-2xl
            shadow-2xl
            border-0 sm:border
            flex flex-col
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between shrink-0 sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">PV Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditBadge />
              <button
                onClick={() => setOpen(false)}
                className="hover:bg-white/20 p-1.5 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 min-w-0"
          >
            {messages.map((m, i) => (
              <ChatMessage key={i} {...m} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 shrink-0 bg-white">
            <SuggestionChips
              onSelect={(t) => sendMessage(t)}
              disabled={loading}
            />
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about your dashboard..."
                className="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
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
