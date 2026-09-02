"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileArchive, CheckCircle } from "lucide-react";

const PLAN_LIMITS = {
  free: 100 * 1024 * 1024,
  starter: 300 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
  business: 1024 * 1024 * 1024,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface FileUploadProps {
  userPlan?: string;
  onUploadComplete?: () => void;
}

export default function FileUpload({
  userPlan = "free",
  onUploadComplete,
}: FileUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan = userPlan.toLowerCase();
  const maxSize =
    PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

  const validateFile = (selectedFile: File): string | null => {
    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      return "Only ZIP files are allowed";
    }
    if (selectedFile.size > maxSize) {
      return `File too large. ${plan} plan max: ${formatBytes(maxSize)}`;
    }
    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);
      setSuccess(false);

      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
    },
    [plan, maxSize],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(selectedFile);
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Get presigned URL from your server
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
        throw new Error(errData.error || "Failed to get upload URL");
      }

      const sigData = await sigRes.json();

      // 2. Upload directly to R2 via PUT (bypasses your server entirely)
      setProgress(30);
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 50) + 30;
            setProgress(Math.min(pct, 80));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`R2 upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload")),
        );

        xhr.open("PUT", sigData.signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/zip");
        xhr.send(file);
      });

      setProgress(85);

      // 3. Confirm with your server to save metadata
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
        throw new Error(errData.error || "Failed to confirm upload");
      }

      setProgress(100);
      setSuccess(true);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploadComplete?.();
      router.refresh();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ width: "100%", maxWidth: "600px" }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragging ? "var(--text-blue)" : "var(--border-color)"
          }`,
          borderRadius: "1rem",
          padding: "2rem",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          backgroundColor: isDragging
            ? "rgba(59,130,246,0.05)"
            : "var(--bg-card)",
          transition: "all 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <Upload
          size={32}
          style={{
            color: "var(--text-blue)",
            margin: "0 auto 1rem",
            opacity: uploading ? 0.5 : 1,
          }}
        />
        <p
          style={{
            color: "var(--text-primary)",
            fontWeight: 500,
            marginBottom: "0.5rem",
          }}
        >
          {isDragging ? "Drop ZIP file here" : "Click or drag ZIP file here"}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          Max size: {formatBytes(maxSize)} ({plan} plan)
        </p>
      </div>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--bg-badge-red)",
            color: "var(--text-red)",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <X size={16} />
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--bg-badge-green)",
            color: "var(--text-green)",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CheckCircle size={16} />
          File uploaded successfully!
        </div>
      )}

      {file && !success && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <FileArchive size={20} style={{ color: "var(--text-blue)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {formatBytes(file.size)}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {uploading && (
            <div style={{ marginTop: "0.75rem" }}>
              <div
                style={{
                  width: "100%",
                  height: "0.5rem",
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
                    transition: "width 0.3s ease",
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
                  ? "Validating plan..."
                  : progress < 80
                    ? "Uploading to vault..."
                    : progress < 100
                      ? "Saving metadata..."
                      : "Complete!"}
              </p>
            </div>
          )}

          {!uploading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                uploadFile();
              }}
              style={{
                width: "100%",
                marginTop: "0.75rem",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "var(--text-blue)",
                color: "white",
                fontWeight: 500,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Upload File
            </button>
          )}
        </div>
      )}
    </div>
  );
}
