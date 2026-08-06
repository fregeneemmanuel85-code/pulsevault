"use client";

interface Props {
  role: "user" | "assistant";
  text: string;
  source?: "knowledge-base" | "gemini" | "groq";
  creditCost?: number;
}

export default function ChatMessage({ role, text, source, creditCost }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>

        {!isUser && source && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            {source === "knowledge-base" && (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Instant (0 credits)</span>
              </>
            )}
            {source === "gemini" && (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Gemini {creditCost ? `(${creditCost} cr)` : ""}</span>
              </>
            )}
            {source === "groq" && (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Groq {creditCost ? `(${creditCost} cr)` : ""}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
