"use client";

import { createContext, useContext, useState, useCallback } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#15803d",
    icon: "#22c55e",
  },
  error: {
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#b91c1c",
    icon: "#ef4444",
  },
  warning: {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#b45309",
    icon: "#f59e0b",
  },
  info: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1d4ed8",
    icon: "#3b82f6",
  },
};

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        style={{
          position: "fixed",
          top: "clamp(1rem, 3vw, 1.5rem)",
          right: "clamp(1rem, 3vw, 1.5rem)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const c = COLORS[toast.type];

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding:
                  "clamp(0.625rem, 2vw, 0.875rem) clamp(0.875rem, 2.5vw, 1rem)",
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: "0.75rem",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                color: c.text,
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                fontWeight: "500",
                minWidth: "clamp(200px, 40vw, 280px)",
                maxWidth: "90vw",
                animation: "slideIn 0.3s ease",
                transition: "all 0.3s ease",
              }}
            >
              <Icon
                style={{
                  width: 18,
                  height: 18,
                  color: c.icon,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.125rem",
                  color: c.text,
                  opacity: 0.6,
                  display: "flex",
                  flexShrink: 0,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
