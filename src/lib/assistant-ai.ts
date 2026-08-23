const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `You are PV Assistant, an expert DevOps and web performance analyst embedded inside PulseVault. You ONLY answer questions about the user's PulseVault dashboard, websites, monitoring data, and how to fix technical issues.

RULES:
1. If the user asks anything unrelated to their dashboard, websites, hosting, SSL, DNS, SEO, performance, or monitoring, reply EXACTLY: "I only answer questions about your PulseVault dashboard. Ask me about your websites, health scores, alerts, or how to fix issues."
2. Always cite specific data points from the context provided.
3. Give actionable, step-by-step fix recommendations.
4. Be concise. Use bullet points and numbered steps.
5. If data is missing, say "I don't see that data in your dashboard yet."
6. End every response with a Priority label: Low, Medium, High, or Critical.
7. Never hallucinate website names or metrics not present in the context.

RESPONSE FORMAT:
**Observation:** [What the data shows in 1 sentence]
**Root Cause:** [Why it's happening]
**Fix Steps:**
1. [Step]
2. [Step]
3. [Step]
**Priority:** [Low / Medium / High / Critical]`;

export interface AIResponse {
  text: string;
  source: "gemini" | "groq" | "none";
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── GEMINI ───
export async function askGemini(
  context: string,
  userMessage: string,
): Promise<AIResponse> {
  if (!GEMINI_API_KEY) {
    return { text: "", source: "none", error: "Gemini API key not configured" };
  }

  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\n${context}\n\nUser question: ${userMessage}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      },
      10000,
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();

    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      throw new Error("Gemini returned empty text");
    }

    return { text, source: "gemini" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { text: "", source: "none", error: "Gemini timed out" };
    }
    console.error("[AI] Gemini failed:", err.message);
    return { text: "", source: "none", error: err.message };
  }
}

// ─── GROQ ───
export async function askGroq(
  context: string,
  userMessage: string,
): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    return { text: "", source: "none", error: "Groq API key not configured" };
  }

  try {
    const res = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `${context}\n\nUser question: ${userMessage}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      },
      10000,
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Groq returned empty text");
    }

    return { text, source: "groq" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { text: "", source: "none", error: "Groq timed out" };
    }
    console.error("[AI] Groq failed:", err.message);
    return { text: "", source: "none", error: err.message };
  }
}

// ─── FALLBACK: Gemini → Groq ───
export async function askAIWithFallback(
  context: string,
  userMessage: string,
): Promise<AIResponse> {
  // Try Gemini first
  const gemini = await askGemini(context, userMessage);
  if (gemini.text && !gemini.error) {
    return gemini;
  }

  console.log("[AI] Gemini failed:", gemini.error, "| Trying Groq...");

  // Fallback to Groq
  const groq = await askGroq(context, userMessage);
  if (groq.text && !groq.error) {
    return groq;
  }

  console.log("[AI] Groq failed:", groq.error);

  // Both failed — return a helpful message to the user
  return {
    text: `AI is temporarily unavailable. Please try again in a moment.`,
    source: "none",
    error: `Gemini: ${gemini.error || "OK"} | Groq: ${groq.error || "OK"}`,
  };
}
