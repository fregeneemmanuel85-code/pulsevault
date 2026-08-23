import { NextResponse } from "next/server";

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const results: any = {
    env: {
      hasGeminiKey: !!geminiKey,
      geminiKeyPrefix: geminiKey ? geminiKey.slice(0, 8) + "..." : "MISSING",
      hasGroqKey: !!groqKey,
      groqKeyPrefix: groqKey ? groqKey.slice(0, 8) + "..." : "MISSING",
    },
    tests: {} as any,
  };

  // Test Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      results.tests.gemini = {
        status: res.status,
        ok: res.ok,
        error: data.error?.message || null,
        response: data.candidates?.[0]?.content?.parts?.[0]?.text || null,
      };
    } catch (e: any) {
      results.tests.gemini = { error: e.message };
    }
  }

  // Test Groq
  if (groqKey) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Say OK" }],
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      results.tests.groq = {
        status: res.status,
        ok: res.ok,
        error: data.error?.message || null,
        response: data.choices?.[0]?.message?.content || null,
      };
    } catch (e: any) {
      results.tests.groq = { error: e.message };
    }
  }

  return NextResponse.json(results);
}
