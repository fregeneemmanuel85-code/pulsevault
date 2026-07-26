"use client";

import { useState } from "react";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const sendTest = async () => {
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "🔥 PulseVault Test Email",
          text: "If you received this, your email is working!",
          html: "<h1>🔥 PulseVault Test</h1><p>If you received this, your email is working!</p>",
        }),
      });

      const data = await res.json();
      console.log("[Test Email] Response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }

      setStatus("sent");
      setMessage(`Email sent! ID: ${data.id || "N/A"}`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#020617",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(15,23,42,0.8)",
          padding: "2rem",
          borderRadius: "1rem",
          border: "1px solid rgba(51,65,85,0.5)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1
          style={{
            color: "#f1f5f9",
            fontSize: "1.5rem",
            fontWeight: "700",
            marginBottom: "0.5rem",
          }}
        >
          Test Email
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          Send a test email to verify your setup
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(51,65,85,0.5)",
            borderRadius: "0.5rem",
            color: "#e2e8f0",
            fontSize: "0.875rem",
            marginBottom: "1rem",
            outline: "none",
          }}
        />

        <button
          onClick={sendTest}
          disabled={!email || status === "sending"}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: status === "sending" ? "#1e3a5f" : "#1d4ed8",
            color: "#dbeafe",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {status === "sending" ? "Sending..." : "Send Test Email"}
        </button>

        {message && (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: status === "sent" ? "#22c55e" : "#ef4444",
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "rgba(15,23,42,0.6)",
            borderRadius: "0.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              marginBottom: "0.5rem",
            }}
          >
            Required .env variables:
          </p>
          <code
            style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}
          >
            RESEND_API_KEY=re_xxxxxxxx
            <br />
            EMAIL_FROM=onboarding@resend.dev
          </code>
        </div>
      </div>
    </div>
  );
}
