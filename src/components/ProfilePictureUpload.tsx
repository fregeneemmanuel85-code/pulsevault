"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  currentPhotoURL?: string;
  userName: string;
  onUpload: (url: string) => void;
}

export default function ProfilePictureUpload({
  currentPhotoURL,
  userName,
  onUpload,
}: Props) {
  const [preview, setPreview] = useState<string | null>(
    currentPhotoURL || null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload via API
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUpload(data.url);
    } catch (err: any) {
      setError(err.message);
      setPreview(currentPhotoURL || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      {/* Circle */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          position: "relative",
          width: "clamp(5rem, 15vw, 7rem)",
          height: "clamp(5rem, 15vw, 7rem)",
          borderRadius: "50%",
          backgroundColor: preview ? "transparent" : "#2563eb",
          backgroundImage: preview ? `url(${preview})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          border: "3px solid #e2e8f0",
        }}
      >
        {!preview && (
          <span
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontWeight: "700",
              color: "white",
            }}
          >
            {getInitials(userName)}
          </span>
        )}

        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader2
              style={{
                width: "1.5rem",
                height: "1.5rem",
                color: "white",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={uploading}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
          backgroundColor: "white",
          color: "#475569",
          fontSize: "0.875rem",
          fontWeight: "500",
          cursor: uploading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Camera style={{ width: "0.875rem", height: "0.875rem" }} />
        {uploading ? "Uploading..." : "Change Photo"}
      </button>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>
          {error}
        </p>
      )}

      <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
        JPG, PNG, GIF. Max 2MB.
      </p>
    </div>
  );
}
