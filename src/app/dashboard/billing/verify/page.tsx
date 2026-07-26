"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    const txRef = searchParams.get("tx_ref");
    const statusParam = searchParams.get("status");

    if (statusParam === "successful" && txRef) {
      setStatus("success");
      setMessage("Payment verified successfully! Your plan has been upgraded.");
    } else if (statusParam === "cancelled") {
      setStatus("failed");
      setMessage("Payment was cancelled. No charges were made.");
    } else {
      setStatus("failed");
      setMessage("Payment verification failed. Please contact support.");
    }
  }, [searchParams]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1.5rem", textAlign: "center" }}>
      {status === "loading" && <Loader2 style={{ width: "3rem", height: "3rem", color: "#2563eb", animation: "spin 1s linear infinite" }} />}
      {status === "success" && <CheckCircle2 style={{ width: "3rem", height: "3rem", color: "#22c55e" }} />}
      {status === "failed" && <XCircle style={{ width: "3rem", height: "3rem", color: "#ef4444" }} />}

      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", marginBottom: "0.5rem" }}>
          {status === "loading" ? "Verifying..." : status === "success" ? "Payment Successful" : "Payment Failed"}
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{message}</p>
      </div>

      <Link href="/dashboard/billing" style={{ padding: "0.75rem 1.5rem", backgroundColor: "#2563eb", color: "white", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: "500", textDecoration: "none" }}>
        Back to Billing
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 style={{ width: "2rem", height: "2rem", color: "#2563eb", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}