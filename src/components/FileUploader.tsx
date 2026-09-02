"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, X, AlertTriangle, FileArchive } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface FileUploaderProps {
  userId: string;
  onUploadComplete: () => void;
  quotaRemaining: number;
}

export default function FileUploader({
  onUploadComplete,
  quotaRemaining,
}: FileUploaderProps) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isZip = (file: File | null | undefined): boolean => {
    if (!file) return false;
    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    return name.endsWith(".zip") || type.includes("zip");
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(isZip);
    const invalid = selected.filter((f) => !isZip(f));

    if (invalid.length > 0) {
      const names = invalid.map((f) => `"${f.name}"`).join(", ");
      showToast(`Only ZIP files allowed. Rejected: ${names}`, "error");
    }

    if (valid.length > 0) {
      setFiles((prev) => [...prev, ...valid]);
      setError("");
    }

    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    setProgress(0);

    try {
      const file = files[0];
      if (!isZip(file)) {
        showToast("Only ZIP files are allowed.", "error");
        return;
      }

      if (file.size > quotaRemaining) {
        throw new Error(
          `Not enough quota. Need ${formatBytes(file.size)}, have ${formatBytes(quotaRemaining)} remaining.`,
        );
      }

      // 1. Get presigned URL from server (plan check happens here)
      setProgress(10);
      const sigRes = await fetch("/api/files/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/zip",
        }),
      });

      if (!sigRes.ok) {
        const errData = await sigRes.json();
        throw new Error(errData.error || "Upload failed");
      }

      const sigData = await sigRes.json();

      // 2. Upload directly to R2 via PUT
      setProgress(30);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 55) + 30;
            setProgress(Math.min(pct, 85));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload")),
        );

        xhr.open("PUT", sigData.signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/zip");
        xhr.send(file);
      });

      // 3. Confirm with server to save metadata
      setProgress(90);
      const confirmRes = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: sigData.key,
          publicUrl: sigData.publicUrl,
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          originalSize: file.size,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json();
        throw new Error(errData.error || "Failed to finalize upload");
      }

      setProgress(100);
      setFiles([]);
      showToast("ZIP uploaded successfully!", "success");
      onUploadComplete();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "1rem",
        padding: "clamp(1.25rem, 3vw, 1.5rem)",
      }}
    >
      <h3
        style={{
          fontWeight: "600",
          color: "var(--text-primary)",
          marginBottom: "1rem",
          fontSize: "1rem",
        }}
      >
        Upload ZIP Archive
      </h3>

      {/* Notice banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 0.875rem",
          backgroundColor: "var(--bg-badge-blue)",
          border: "1px solid var(--border-color)",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
          color: "var(--text-blue)",
          fontSize: "0.8125rem",
          fontWeight: "500",
        }}
      >
        <FileArchive
          size={16}
          style={{ color: "var(--text-blue)", flexShrink: 0 }}
        />
        <span>
          Only <strong>.zip</strong> files are accepted. Please compress your
          files with WinRAR or any ZIP tool before uploading.
        </span>
      </div>

      {/* Click to browse zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: "2px dashed var(--border-color)",
          borderRadius: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--bg-body)",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "border-color 0.2s",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <Upload
          style={{
            width: "2rem",
            height: "2rem",
            color: "var(--text-muted)",
            margin: "0 auto 0.75rem",
          }}
        />
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            margin: "0 0 0.5rem",
          }}
        >
          Click to browse for a ZIP file
        </p>
        <p
          style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0 }}
        >
          Max size based on your plan quota
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleSelect}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </div>

      {/* Selected file list */}
      {files.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {files.map((file, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 0.875rem",
                backgroundColor: "var(--bg-input)",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minWidth: 0,
                }}
              >
                <FileArchive
                  size={16}
                  style={{ color: "var(--text-blue)", flexShrink: 0 }}
                />
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.8125rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {formatBytes(file.size)}
                </span>
              </div>
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}

          {/* Progress bar */}
          {uploading && progress > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <div
                style={{
                  width: "100%",
                  height: "0.375rem",
                  backgroundColor: "var(--border-color)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "var(--text-blue)",
                    borderRadius: "9999px",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                  textAlign: "center",
                }}
              >
                {progress < 20
                  ? "Checking plan limits..."
                  : progress < 90
                    ? "Uploading to secure storage..."
                    : "Finalizing..."}
              </p>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              Total: {formatBytes(totalSize)}
            </span>
            <button
              onClick={upload}
              disabled={uploading}
              style={{
                backgroundColor: uploading
                  ? "var(--border-color)"
                  : "var(--text-blue)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.25rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: uploading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {uploading ? (
                <>
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Uploading...
                </>
              ) : (
                <>Upload ZIP</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            backgroundColor: "var(--bg-badge-red)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-red)",
            fontSize: "0.8125rem",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
