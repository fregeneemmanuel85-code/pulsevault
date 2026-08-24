"use client";

import { useState, useRef } from "react";
import {
  Loader2,
  Upload,
  File,
  X,
  AlertTriangle,
  FileArchive,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface FileUploaderProps {
  userId: string;
  onUploadComplete: () => void;
  quotaRemaining: number;
}

export default function FileUploader({
  userId,
  onUploadComplete,
  quotaRemaining,
}: FileUploaderProps) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
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

      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("originalName", file.name);
      formData.append("originalSize", String(file.size));

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      setFiles([]);
      showToast("ZIP uploaded successfully!", "success");
      onUploadComplete();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(51, 65, 85, 0.5)",
        borderRadius: "1rem",
        padding: "clamp(1.25rem, 3vw, 1.5rem)",
      }}
    >
      <h3
        style={{
          fontWeight: "600",
          color: "#f1f5f9",
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
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
          color: "#93bbfc",
          fontSize: "0.8125rem",
          fontWeight: "500",
        }}
      >
        <FileArchive size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
        <span>
          Only <strong>.zip</strong> files are accepted. Please compress your
          files with WinRAR or any ZIP tool before uploading.
        </span>
      </div>

      {/* Click to browse zone */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed rgba(51, 65, 85, 0.6)",
          borderRadius: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "rgba(30, 41, 59, 0.3)",
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
      >
        <Upload
          style={{
            width: "2rem",
            height: "2rem",
            color: "#64748b",
            margin: "0 auto 0.75rem",
          }}
        />
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.875rem",
            margin: "0 0 0.5rem",
          }}
        >
          Click to browse for a ZIP file
        </p>
        <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
          Max size based on your plan quota
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleSelect}
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
                backgroundColor: "rgba(30, 41, 59, 0.5)",
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
                  style={{ color: "#60a5fa", flexShrink: 0 }}
                />
                <span
                  style={{
                    color: "#cbd5e1",
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
                    color: "#64748b",
                    fontSize: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                onClick={() => removeFile(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ color: "#64748b", fontSize: "0.8125rem" }}>
              Total: {formatBytes(totalSize)}
            </span>
            <button
              onClick={upload}
              disabled={uploading}
              style={{
                backgroundColor: uploading ? "#1e40af" : "#1d4ed8",
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
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#fca5a5",
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
