"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";

interface EmailPreferencesCardProps {
  subscribed: boolean;
  onChange: (subscribed: boolean) => Promise<void>;
  disabled?: boolean;
}

export default function EmailPreferencesCard({
  subscribed,
  onChange,
  disabled,
}: EmailPreferencesCardProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onChange(!subscribed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "1rem",
        border: "1px solid var(--border-color)",
        padding: "clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "clamp(0.75rem, 2vw, 1.25rem)",
        }}
      >
        <Mail
          style={{
            width: "clamp(1rem, 2.5vw, 1.25rem)",
            height: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#2563eb",
            flexShrink: 0,
          }}
        />
        <h2
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            fontWeight: "600",
            color: "var(--text-primary)",
          }}
        >
          Email Preferences
        </h2>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(0.625rem, 2vw, 0.75rem)",
          borderRadius: "0.5rem",
          border: "1px solid var(--border-light)",
          cursor: disabled || loading ? "not-allowed" : "pointer",
          flexWrap: "wrap",
          gap: "0.75rem",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight: "500",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Subscribe to PulseVault updates
          </p>
          <p
            style={{
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              color: "var(--text-muted)",
              margin: "0.125rem 0 0",
            }}
          >
            Product updates, new features, maintenance notices, and promotional
            emails
          </p>
        </div>

        <div
          style={{
            position: "relative",
            width: "2.75rem",
            height: "1.5rem",
            flexShrink: 0,
          }}
        >
          <input
            type="checkbox"
            checked={subscribed}
            onChange={handleToggle}
            disabled={loading || disabled}
            style={{
              opacity: 0,
              width: "100%",
              height: "100%",
              position: "absolute",
              cursor: disabled || loading ? "not-allowed" : "pointer",
              zIndex: 1,
            }}
          />
          <div
            style={{
              width: "2.75rem",
              height: "1.5rem",
              borderRadius: "9999px",
              backgroundColor: subscribed ? "#2563eb" : "var(--bg-toggle-off)",
              transition: "background-color 0.2s",
              position: "relative",
            }}
          >
            {loading && (
              <Loader2
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "0.875rem",
                  height: "0.875rem",
                  color: "white",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                top: "0.125rem",
                left: subscribed ? "1.5rem" : "0.125rem",
                width: "1.25rem",
                height: "1.25rem",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </label>
    </div>
  );
}
