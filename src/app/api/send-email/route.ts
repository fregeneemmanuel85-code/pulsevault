import { NextRequest, NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/email-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      to,
      userName,
      alertType,
      severity,
      message,
      target,
      timestamp,
      // Scan data fields
      healthScore,
      brokenLinks,
      totalLinks,
      brokenPlugins,
      totalPlugins,
      jsErrors,
      formsWorking,
      totalForms,
      mixedContent,
      loadTime,
      pageSize,
      httpStatus,
      sslStatus,
      sslDaysLeft,
      // NEW fields
      techStack,
      runtimeErrors,
      spaCrashes,
      redirectChain,
    } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendAlertEmail({
      to,
      userName,
      alertType,
      severity,
      message,
      target,
      timestamp,
      healthScore,
      brokenLinks,
      totalLinks,
      brokenPlugins,
      totalPlugins,
      jsErrors,
      formsWorking,
      totalForms,
      mixedContent,
      loadTime,
      pageSize,
      httpStatus,
      sslStatus,
      sslDaysLeft,
      // NEW
      techStack,
      runtimeErrors,
      spaCrashes,
      redirectChain,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Email API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
