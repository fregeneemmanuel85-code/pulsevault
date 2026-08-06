import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { searchKnowledgeBase } from "@/lib/assistant-kb";
import {
  buildAssistantContext,
  contextToPrompt,
} from "@/lib/assistant-context";
import { getOrCreateCredits, deductCredits } from "@/lib/assistant-credits";
import { classifyIntent } from "@/lib/assistant-router";
import { askAIWithFallback } from "@/lib/assistant-ai";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET required");

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let userId: string;
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
    );
    userId = verified.payload.uid as string;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // 1. Classify intent
  const intent = classifyIntent(message);

  // Off-topic guard
  if (intent.type === "offtopic") {
    return NextResponse.json({
      reply:
        "I only answer questions about your PulseVault dashboard. Ask me about your websites, health scores, alerts, or how to fix issues.",
      creditsUsed: 0,
      source: "knowledge-base",
      remainingCredits: (await getOrCreateCredits(userId)).remaining,
    });
  }

  // 2. Try Knowledge Base (free)
  const kb = searchKnowledgeBase(message);
  if (kb.found) {
    return NextResponse.json({
      reply: kb.answer,
      creditsUsed: 0,
      source: "knowledge-base",
      remainingCredits: (await getOrCreateCredits(userId)).remaining,
    });
  }

  // 3. Check credits
  const credits = await getOrCreateCredits(userId);
  if (credits.remaining < intent.creditCost) {
    return NextResponse.json({
      reply: `You don't have enough AI credits for a ${intent.label} (${intent.creditCost} credits needed). You have ${credits.remaining} left. Upgrade your plan or wait until midnight UTC for your daily reset.`,
      creditsUsed: 0,
      source: "knowledge-base",
      remainingCredits: credits.remaining,
    });
  }

  // 4. Build context
  const context = await buildAssistantContext(userId);
  const prompt = contextToPrompt(context);

  // 5. Call AI
  const ai = await askAIWithFallback(prompt, message);

  // 6. Deduct credits on success
  if (ai.text && !ai.error) {
    const ok = await deductCredits(userId, intent.creditCost);
    if (!ok) {
      // Race condition or bug — still return answer but log it
      console.error("[Assistant] Credit deduction failed after AI success");
    }
  }

  const updatedCredits = await getOrCreateCredits(userId);

  return NextResponse.json({
    reply: ai.text,
    creditsUsed: ai.error ? 0 : intent.creditCost,
    source: ai.source,
    remainingCredits: updatedCredits.remaining,
  });
}
