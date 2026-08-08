import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  buildAssistantContext,
  contextToPrompt,
} from "@/lib/assistant-context";
import { searchKnowledgeBase } from "@/lib/assistant-kb";
import { classifyIntent } from "@/lib/assistant/intent";
import {
  getOrCreateCredits,
  deductCredits,
  refundCredits,
} from "@/lib/assistant-credits";
import { askAIWithFallback } from "@/lib/assistant-ai";

const CODE_SYSTEM_PROMPT = `You are PV Assistant, an expert developer. The user wants working code to fix issues or build features.

RULES:
1. Provide complete, copy-pasteable code.
2. Use markdown code blocks with the language specified.
3. Prefer JavaScript, TypeScript, React, or Next.js unless the user asks for another language.
4. After the code, give a 2-3 sentence explanation of what it does.
5. If the user mentions an error or bug but hasn't pasted their code, tell them: "Please paste the code snippet that has the error, and I'll fix it for you."
6. If the user pasted code, analyze it, fix the bugs, and return the corrected version.
7. Never omit imports or critical setup steps.

RESPONSE FORMAT:
\`\`\`language
// complete code here
\`\`\`

**Explanation:** [2-3 sentences]`;

const DEEP_CODE_SYSTEM_PROMPT = `You are PV Assistant, a senior full-stack engineer. The user wants a production-ready, complete implementation.

RULES:
1. Provide the FULL file contents — no placeholders, no "..." shortcuts.
2. Include all imports, types, error handling, and comments.
3. Prefer JavaScript, TypeScript, React, or Next.js unless the user asks for another language.
4. Use markdown code blocks with the language specified.
5. After the code, give a brief architecture explanation.
6. If multiple files are needed, label each block with the filename.
7. If the user mentions an error but hasn't pasted code, tell them: "Please paste the code snippet that has the error, and I'll provide a complete fix."

RESPONSE FORMAT:
\`\`\`language
// filename: path/to/file.ext
// complete production code
\`\`\`

**Architecture:** [brief explanation]`;

const DEFAULT_SYSTEM_PROMPT = `You are PV Assistant, an expert DevOps and web performance analyst embedded inside PulseVault. You help users with their dashboard, websites, hosting, SSL, DNS, SEO, performance, monitoring, and code issues.

RULES:
1. Always cite specific data points from the context provided.
2. Give actionable, step-by-step fix recommendations.
3. Be concise. Use bullet points and numbered steps.
4. If data is missing, say "I don't see that data in your dashboard yet."
5. End every response with a Priority label: Low, Medium, High, or Critical.
6. Never hallucinate website names or metrics not present in the context.
7. If the user asks about something completely unrelated to tech, websites, code, or monitoring (e.g., weather, sports, politics, jokes), reply EXACTLY: "I only answer questions about your PulseVault dashboard. Ask me about your websites, health scores, alerts, or how to fix issues."`;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = await getAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const intent = classifyIntent(message);

    // Off-topic
    if (intent.type === "offtopic") {
      return NextResponse.json({
        reply:
          "I only answer questions about your PulseVault dashboard. Ask me about your websites, health scores, alerts, or how to fix issues.",
        source: "gemini",
        creditsUsed: 0,
      });
    }

    // Check credits
    const credits = await getOrCreateCredits(userId);
    if (credits.remaining < intent.creditCost) {
      return NextResponse.json({
        reply: `You've used all your AI credits for today (${credits.dailyLimit}/${credits.dailyLimit}). Upgrade your plan or try again tomorrow.`,
        source: "gemini",
        creditsUsed: 0,
      });
    }

    // Try knowledge base for simple questions
    if (!intent.skipKB) {
      const kb = searchKnowledgeBase(message);
      if (kb.found) {
        return NextResponse.json({
          reply: kb.answer,
          source: "knowledge-base",
          creditsUsed: 0,
        });
      }
    }

    // Deduct credits
    const deducted = await deductCredits(userId, intent.creditCost);
    if (!deducted) {
      return NextResponse.json({
        reply: "Failed to deduct credits. Please try again.",
        source: "gemini",
        creditsUsed: 0,
      });
    }

    // Build context
    const context = await buildAssistantContext(userId);
    const contextPrompt = contextToPrompt(context);

    // Choose system prompt based on intent
    let systemPrompt: string;
    if (intent.type === "code") {
      systemPrompt = CODE_SYSTEM_PROMPT;
    } else if (intent.type === "deep-code") {
      systemPrompt = DEEP_CODE_SYSTEM_PROMPT;
    } else {
      systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    // Call AI
    const ai = await askAIWithFallback(
      `${systemPrompt}\n\n${contextPrompt}`,
      message,
    );

    if (ai.error || !ai.text) {
      // Refund on failure
      await refundCredits(userId, intent.creditCost);
      return NextResponse.json({
        reply:
          ai.error ||
          "AI providers are temporarily unavailable. Please try again in a moment.",
        source: "gemini",
        creditsUsed: 0,
      });
    }

    return NextResponse.json({
      reply: ai.text,
      source: ai.source,
      creditsUsed: intent.creditCost,
    });
  } catch (err: any) {
    console.error("[Assistant API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
