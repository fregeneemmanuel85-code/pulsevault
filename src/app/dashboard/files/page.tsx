"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import {
  Loader2,
  Trash2,
  Download,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import FileUploader from "@/components/FileUploader";
import { useToast } from "@/components/ToastProvider";

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  size: number;
  downloadUrl: string;
  createdAt: string;
}

const DEFAULT_QUOTA = {
  used: 0,
  limit: 100 * 1024 * 1024,
  plan: "Free",
  remaining: 100 * 1024 * 1024,
};

export default function FilesPage() {
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [quota, setQuota] = useState(DEFAULT_QUOTA);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    try {
      const [filesRes, quotaRes] = await Promise.all([
        fetch("/api/files"),
        fetch("/api/files/quota"),
      ]);

      if (!filesRes.ok || !quotaRes.ok) {
        console.error("[Files] API error:", filesRes.status, quotaRes.status);
        return;
      }

      const filesData = await filesRes.json();
      const quotaData = await quotaRes.json();

      setFiles(filesData.files || []);
      setQuota({
        used: Number(quotaData.used) || 0,
        limit: Number(quotaData.limit) || DEFAULT_QUOTA.limit,
        plan: quotaData.plan || "Free",
        remaining: Number(quotaData.remaining) || 0,
      });
    } catch (err) {
      console.error("[Files] Failed to load:", err);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadData(user.uid).finally(() => setLoading(false));
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [loadData]);

  const deleteFile = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" });
      if (res.ok && userId) {
        loadData(userId);
      }
    } catch (err) {
      console.error("[Files] Delete failed:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (file: FileItem) => {
    setDownloading(file.id);
    try {
      const res = await fetch(file.downloadUrl);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.name || "download.zip";
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Download started", "success");
    } catch (err) {
      console.error("[Files] Download failed:", err);
      showToast("Download failed. Try again.", "error");
    } finally {
      setDownloading(null);
    }
  };

  const formatBytes = (bytes: number | undefined | null) => {
    const b = Number(bytes) || 0;
    if (b === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const percentUsed =
    quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <Loader2
          size={32}
          style={{ color: "#2563eb", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "64rem",
        margin: "0 auto",
        padding: "clamp(1.5rem, 4vw, 2rem) clamp(1rem, 4vw, 1.5rem)",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: "800",
          color: "#f1f5f9",
          marginBottom: "0.5rem",
        }}
      >
        File Vault
      </h1>
      <p style={{ color: "#64748b", marginBottom: "clamp(1.5rem, 4vw, 2rem)" }}>
        Upload and manage your ZIP backups and archives.
      </p>

      <div
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(51, 65, 85, 0.5)",
          borderRadius: "1rem",
          padding: "clamp(1rem, 3vw, 1.25rem)",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <HardDrive size={18} style={{ color: "#60a5fa" }} />
            <span
              style={{
                fontWeight: "600",
                color: "#f1f5f9",
                fontSize: "0.875rem",
              }}
            >
              Storage ({quota.plan})
            </span>
          </div>
          <span style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>
            {formatBytes(quota.used)} / {formatBytes(quota.limit)}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: "0.5rem",
            backgroundColor: "rgba(51, 65, 85, 0.4)",
            borderRadius: "9999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percentUsed}%`,
              height: "100%",
              backgroundColor:
                percentUsed > 90
                  ? "#ef4444"
                  : percentUsed > 70
                    ? "#f59e0b"
                    : "#22c55e",
              borderRadius: "9999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        {quota.remaining < 50 * 1024 * 1024 && (
          <p
            style={{
              color: "#f87171",
              fontSize: "0.75rem",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <AlertTriangle size={12} />
            Low storage remaining
          </p>
        )}
      </div>

      {userId && (
        <FileUploader
          userId={userId}
          quotaRemaining={quota.remaining}
          onUploadComplete={() => loadData(userId)}
        />
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3
          style={{
            fontWeight: "600",
            color: "#f1f5f9",
            marginBottom: "1rem",
            fontSize: "1rem",
          }}
        >
          Your Files ({files.length})
        </h3>

        {files.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "#64748b",
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(51, 65, 85, 0.4)",
              borderRadius: "1rem",
            }}
          >
            <HardDrive
              size={32}
              style={{ margin: "0 auto 0.75rem", color: "#475569" }}
            />
            <p>No ZIP files yet. Upload your first backup above.</p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(51, 65, 85, 0.5)",
                  borderRadius: "0.75rem",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      color: "#f1f5f9",
                      fontWeight: "500",
                      fontSize: "0.875rem",
                      margin: "0 0 0.25rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.originalName}
                  </p>
                  <p
                    style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}
                  >
                    {formatBytes(file.size)} •{" "}
                    {file.createdAt
                      ? new Date(file.createdAt).toLocaleDateString()
                      : "Just now"}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.5rem 0.875rem",
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
                      color: "#60a5fa",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(37, 99, 235, 0.15)",
                      fontSize: "0.8125rem",
                      fontWeight: "500",
                      cursor: downloading === file.id ? "wait" : "pointer",
                    }}
                  >
                    {downloading === file.id ? (
                      <Loader2
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={14} />
                    )}
                    ZIP
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    disabled={deleting === file.id}
                    style={{
                      padding: "0.5rem",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.15)",
                      color: "#f87171",
                      borderRadius: "0.5rem",
                      cursor: deleting === file.id ? "wait" : "pointer",
                    }}
                  >
                    {deleting === file.id ? (
                      <Loader2
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
