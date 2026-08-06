import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import "@/lib/firebase-admin";
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
  try {
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
      const credits = await getOrCreateCredits(userId).catch(() => null);
      return NextResponse.json({
        reply:
          "I only answer questions about your PulseVault dashboard. Ask me about your websites, health scores, alerts, or how to fix issues.",
        creditsUsed: 0,
        source: "knowledge-base",
        remainingCredits: credits?.remaining ?? 0,
      });
    }

    // 2. Try Knowledge Base ONLY if allowed
    if (!intent.skipKB) {
      const kb = searchKnowledgeBase(message);
      if (kb.found) {
        const credits = await getOrCreateCredits(userId).catch(() => null);
        return NextResponse.json({
          reply: kb.answer,
          creditsUsed: 0,
          source: "knowledge-base",
          remainingCredits: credits?.remaining ?? 0,
        });
      }
    }

    // 3. Check credits
    let credits;
    try {
      credits = await getOrCreateCredits(userId);
    } catch (e: any) {
      console.error("[Assistant] Credit check failed:", e.message);
      return NextResponse.json({
        reply: "I couldn't check your AI credits right now. Please try again.",
        creditsUsed: 0,
        source: "knowledge-base",
        remainingCredits: 0,
      });
    }

    if (credits.remaining < intent.creditCost) {
      return NextResponse.json({
        reply: `You don't have enough AI credits for a ${intent.label} (${intent.creditCost} credits needed). You have ${credits.remaining} left. Upgrade your plan or wait until midnight UTC for your daily reset.`,
        creditsUsed: 0,
        source: "knowledge-base",
        remainingCredits: credits.remaining,
      });
    }

    // 4. Build context
    let context: string;
    try {
      const ctx = await buildAssistantContext(userId);
      context = contextToPrompt(ctx);
    } catch (e: any) {
      console.error("[Assistant] Context build failed:", e.message);
      context = "User dashboard data temporarily unavailable.";
    }

    // 5. Call AI
    const ai = await askAIWithFallback(context, message);

    // 6. Deduct credits on success
    if (ai.text && !ai.error) {
      try {
        await deductCredits(userId, intent.creditCost);
      } catch (e: any) {
        console.error("[Assistant] Credit deduction failed:", e.message);
      }
    }

    // 7. Get updated credits
    let updatedCredits;
    try {
      updatedCredits = await getOrCreateCredits(userId);
    } catch {
      updatedCredits = credits;
    }

    return NextResponse.json({
      reply: ai.text || "I couldn't generate a response. Please try again.",
      creditsUsed: ai.error ? 0 : intent.creditCost,
      source: ai.source,
      remainingCredits: updatedCredits.remaining,
    });
  } catch (err: any) {
    console.error("[Assistant] Unhandled error:", err.message);
    return NextResponse.json(
      { error: "Server error: " + err.message },
      { status: 500 },
    );
  }
}
