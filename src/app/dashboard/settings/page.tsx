"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  User,
  Mail,
  Bell,
  Save,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
  Globe,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { getSettings, saveSettings, type UserSettings } from "@/lib/firestore";
import { detectTimezone } from "@/lib/timezone";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import EmailPreferencesCard from "@/components/EmailPreferencesCard";

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    notifications: { email: true, push: true },
    theme: "light",
    timezone: "UTC",
    marketingEmails: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // CRITICAL FIX: Apply theme immediately on mount before auth loads
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("pulsevault-theme") as
      | "light"
      | "dark"
      | "system"
      | null;
    if (saved) {
      applyTheme(saved);
    } else {
      // Check system preference if nothing saved
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const load = async () => {
      const data = await getSettings();
      const savedTheme =
        (localStorage.getItem("pulsevault-theme") as
          | "light"
          | "dark"
          | "system"
          | null) ||
        data?.theme ||
        "light";

      const authEmail = firebaseUser?.email || data?.email || "";

      setSettings({
        name: data?.name ?? firebaseUser?.displayName ?? "",
        email: authEmail,
        photoURL: data?.photoURL,
        notifications: {
          email: data?.notifications?.email ?? true,
          push: data?.notifications?.push ?? true,
        },
        theme: savedTheme,
        timezone: data?.timezone ?? "UTC",
        marketingEmails: data?.marketingEmails ?? true,
      });

      applyTheme(savedTheme);
      setLoading(false);
    };
    load();
  }, [authReady, firebaseUser]);

  const applyTheme = (theme: "light" | "dark" | "system") => {
    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolved = theme;
    }

    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("pulsevault-theme", theme);
  };

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setSettings((s) => ({ ...s, theme }));
    applyTheme(theme);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (firebaseUser && settings.name !== firebaseUser.displayName) {
      try {
        await updateProfile(firebaseUser, { displayName: settings.name });
      } catch (err) {
        console.error("Failed to update Firebase profile:", err);
      }
    }

    const settingsToSave = {
      ...settings,
      email: firebaseUser?.email || settings.email,
    };

    await saveSettings(settingsToSave);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleMarketingToggle = async (subscribed: boolean) => {
    setSettings((s) => ({ ...s, marketingEmails: subscribed }));

    try {
      const res = await fetch("/api/loops/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscribed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn("[Marketing] Loops sync:", data.error || res.status);
      }
    } catch (err: any) {
      console.warn("[Marketing] Loops unavailable:", err.message);
    }

    await saveSettings({
      ...settings,
      marketingEmails: subscribed,
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const { auth } = await import("@/lib/firebase-client");
      const firebaseAuth = await import("firebase/auth");
      const user = auth.currentUser;

      if (!user)
        throw new Error("You must be signed in to delete your account");

      await firebaseAuth.deleteUser(user);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (err: any) {
      console.error("[DeleteAccount] Error:", err);
      if (err.code === "auth/requires-recent-login") {
        setDeleteError(
          "Please sign out and sign back in before deleting your account",
        );
      } else {
        setDeleteError(
          err.message || "Failed to delete account. Please try again.",
        );
      }
      setDeleteLoading(false);
    }
  };

  const updateNotif = (
    key: keyof UserSettings["notifications"],
    val: boolean,
  ) => {
    setSettings((s) => ({
      ...s,
      notifications: { ...s.notifications, [key]: val },
    }));
  };

  if (loading || !authReady) {
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
          style={{
            width: "2rem",
            height: "2rem",
            color: "#2563eb",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(1rem, 3vw, 1.5rem)",
        padding: "0 clamp(0.5rem, 2vw, 1rem)",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
            fontWeight: "700",
            color: "var(--text-primary)",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
          }}
        >
          Manage your account and preferences
        </p>
      </div>

      <form
        onSubmit={handleSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 3vw, 1.5rem)",
        }}
      >
        {/* Profile Section */}
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
            <User
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
              Profile
            </h2>
          </div>

          {/* Profile Picture */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "1rem 0",
              borderBottom: "1px solid var(--border-light)",
              marginBottom: "1rem",
            }}
          >
            <ProfilePictureUpload
              currentPhotoURL={settings.photoURL}
              userName={settings.name || "User"}
              onUpload={(url) => {
                setSettings((s) => ({ ...s, photoURL: url }));
                if (firebaseUser) {
                  import("firebase/auth").then(({ updateProfile }) => {
                    updateProfile(firebaseUser, { photoURL: url });
                  });
                }
              }}
            />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Your name"
                  style={{
                    width: "100%",
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) 1rem clamp(0.5rem, 2vw, 0.625rem) 2.5rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "clamp(0.875rem, 2vw, 1rem)",
                    height: "clamp(0.875rem, 2vw, 1rem)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="email"
                  value={settings.email}
                  readOnly
                  placeholder="you@company.com"
                  style={{
                    width: "100%",
                    padding:
                      "clamp(0.5rem, 2vw, 0.625rem) 1rem clamp(0.5rem, 2vw, 0.625rem) 2.5rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    boxSizing: "border-box",
                    backgroundColor: "var(--bg-icon)",
                    color: "var(--text-muted)",
                    cursor: "not-allowed",
                  }}
                  title="Email is managed through Firebase Authentication"
                />
              </div>
              <p
                style={{
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                }}
              >
                Email is synced from your Firebase account and cannot be changed
                here
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
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
            <Bell
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
              Notifications
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            {[
              {
                key: "email" as const,
                label: "Email Alerts",
                desc: "Receive alerts via email",
                icon: Mail,
              },
              {
                key: "push" as const,
                label: "Push Notifications",
                desc: "Receive browser push notifications",
                icon: Bell,
              },
            ].map((n) => {
              const Icon = n.icon;
              return (
                <label
                  key={n.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "clamp(0.625rem, 2vw, 0.75rem)",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light)",
                    cursor: "pointer",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: "clamp(1.75rem, 4vw, 2rem)",
                        height: "clamp(1.75rem, 4vw, 2rem)",
                        borderRadius: "0.5rem",
                        backgroundColor: "var(--bg-icon)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        style={{
                          width: "clamp(0.875rem, 2vw, 1rem)",
                          height: "clamp(0.875rem, 2vw, 1rem)",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                          fontWeight: "500",
                          color: "var(--text-primary)",
                        }}
                      >
                        {n.label}
                      </p>
                      <p
                        style={{
                          fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {n.desc}
                      </p>
                    </div>
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
                      checked={settings.notifications[n.key]}
                      onChange={(e) => updateNotif(n.key, e.target.checked)}
                      style={{
                        opacity: 0,
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    />
                    <div
                      style={{
                        width: "2.75rem",
                        height: "1.5rem",
                        borderRadius: "9999px",
                        backgroundColor: settings.notifications[n.key]
                          ? "#2563eb"
                          : "var(--bg-toggle-off)",
                        transition: "background-color 0.2s",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "0.125rem",
                          left: settings.notifications[n.key]
                            ? "1.5rem"
                            : "0.125rem",
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
              );
            })}
          </div>
        </div>

        {/* Email Preferences */}
        <EmailPreferencesCard
          subscribed={settings.marketingEmails ?? true}
          onChange={handleMarketingToggle}
        />

        {/* Theme Section */}
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
            <Sun
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
              Appearance
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              gap: "clamp(0.375rem, 1.5vw, 0.5rem)",
              flexWrap: "wrap",
            }}
          >
            {[
              { key: "light" as const, label: "Light", icon: Sun },
              { key: "dark" as const, label: "Dark", icon: Moon },
              { key: "system" as const, label: "System", icon: Globe },
            ].map((t) => {
              const Icon = t.icon;
              const active = settings.theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleThemeChange(t.key)}
                  style={{
                    flex: 1,
                    minWidth: "80px",
                    padding: "clamp(0.5rem, 2vw, 0.625rem)",
                    borderRadius: "0.5rem",
                    border: active
                      ? "1px solid #2563eb"
                      : "1px solid var(--border-color)",
                    backgroundColor: active
                      ? "rgba(37,99,235,0.08)"
                      : "var(--bg-input)",
                    color: active ? "#2563eb" : "var(--text-secondary)",
                    fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon
                    style={{
                      width: "clamp(0.875rem, 2vw, 1rem)",
                      height: "clamp(0.875rem, 2vw, 1rem)",
                    }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timezone */}
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
              marginBottom: "0.75rem",
            }}
          >
            <Globe
              style={{
                width: "clamp(1rem, 2.5vw, 1.25rem)",
                height: "clamp(1rem, 2.5vw, 1.25rem)",
                color: "#22c55e",
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
              Location & Time
            </h2>
          </div>
          <p
            style={{
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Your timezone is detected automatically:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {detectTimezone()}
            </strong>
          </p>
          <p
            style={{
              fontSize: "clamp(0.6875rem, 1.5vw, 0.75rem)",
              color: "var(--text-muted)",
              marginTop: "0.5rem",
            }}
          >
            All timestamps, alerts, and reports are shown in your local time.
          </p>
        </div>

        {/* Save Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "clamp(0.5rem, 2vw, 0.625rem) clamp(1rem, 3vw, 1.5rem)",
              backgroundColor: saving ? "#93c5fd" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? (
              <Loader2
                style={{
                  width: "clamp(0.875rem, 2vw, 1rem)",
                  height: "clamp(0.875rem, 2vw, 1rem)",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <Save
                style={{
                  width: "clamp(0.875rem, 2vw, 1rem)",
                  height: "clamp(0.875rem, 2vw, 1rem)",
                }}
              />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                color: "#16a34a",
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                fontWeight: "500",
              }}
            >
              <CheckCircle2
                style={{
                  width: "clamp(0.875rem, 2vw, 1rem)",
                  height: "clamp(0.875rem, 2vw, 1rem)",
                }}
              />
              Saved successfully
            </div>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      <div
        style={{
          backgroundColor: "rgba(239,68,68,0.04)",
          borderRadius: "1rem",
          border: "1px solid rgba(239,68,68,0.2)",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <AlertTriangle
            style={{
              width: "clamp(1rem, 2.5vw, 1.25rem)",
              height: "clamp(1rem, 2.5vw, 1.25rem)",
              color: "#ef4444",
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
              fontWeight: "600",
              color: "#ef4444",
            }}
          >
            Danger Zone
          </h2>
        </div>

        <p
          style={{
            fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
            color: "var(--text-muted)",
            marginBottom: "1rem",
          }}
        >
          Once you delete your account, there is no going back. All your data,
          monitored websites, and settings will be permanently removed.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding:
                "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
              backgroundColor: "transparent",
              color: "#ef4444",
              border: "1px solid #ef4444",
              borderRadius: "0.5rem",
              fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
          >
            <Trash2
              style={{
                width: "clamp(0.875rem, 2vw, 1rem)",
                height: "clamp(0.875rem, 2vw, 1rem)",
              }}
            />
            Delete Account
          </button>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              border: "1px solid #fecaca",
              padding: "clamp(1rem, 3vw, 1.25rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                fontWeight: "600",
                color: "#dc2626",
                margin: 0,
              }}
            >
              This action cannot be undone. Type <strong>DELETE</strong> below
              to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError("");
              }}
              placeholder="Type DELETE to confirm"
              style={{
                width: "100%",
                padding: "clamp(0.5rem, 2vw, 0.625rem) 1rem",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                boxSizing: "border-box",
                backgroundColor: "#fef2f2",
                color: "#7f1d1d",
                outline: "none",
              }}
            />

            {deleteError && (
              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.8125rem)",
                  color: "#dc2626",
                  margin: 0,
                }}
              >
                {deleteError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  padding:
                    "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
                  backgroundColor: deleteLoading ? "#fca5a5" : "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  fontWeight: "600",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  whiteSpace: "nowrap",
                }}
              >
                {deleteLoading ? (
                  <Loader2
                    style={{
                      width: "clamp(0.875rem, 2vw, 1rem)",
                      height: "clamp(0.875rem, 2vw, 1rem)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <Trash2
                    style={{
                      width: "clamp(0.875rem, 2vw, 1rem)",
                      height: "clamp(0.875rem, 2vw, 1rem)",
                    }}
                  />
                )}
                {deleteLoading ? "Deleting..." : "Permanently Delete Account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                style={{
                  padding:
                    "clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 3vw, 1.25rem)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  fontSize: "clamp(0.8125rem, 2vw, 0.875rem)",
                  fontWeight: "500",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
