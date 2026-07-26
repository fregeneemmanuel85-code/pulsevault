"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Lock,
  Eye,
} from "lucide-react";
import {
  subscribeToTeam,
  inviteMember,
  removeMember,
  updateMemberRole,
  getUserPlan,
  type TeamMember,
} from "@/lib/firestore";

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  // Wait for Firebase Auth before touching Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Team] Auth ready, UID:", user.uid);
        setAuthReady(true);
      } else {
        console.log("[Team] No Firebase user — redirecting to login");
        window.location.href = "/login";
      }
    });
    return () => unsubscribe();
  }, []);

  // Only subscribe to Firestore AFTER auth is ready
  useEffect(() => {
    if (!authReady) return;

    console.log("[Team] Subscribing to Firestore...");
    const unsub = subscribeToTeam((data) => {
      setMembers(data);
      setLoading(false);
    });

    getUserPlan().then((p) => {
      setPlan(p);
      setIsBusiness(p?.planId === "business");
    });

    return () => unsub();
  }, [authReady]);

  const currentCount = members.length;
  const maxTeam = 5;
  const canInvite = isBusiness && currentCount < maxTeam;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || inviting) return;

    setInviting(true);
    setError("");

    try {
      await inviteMember({
        name: name.trim(),
        email: email.trim(),
        role,
      });
      setName("");
      setEmail("");
      setRole("member");
      setShowInvite(false);
    } catch (err: any) {
      setError(err.message);
    }

    setInviting(false);
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner")
      return (
        <Crown style={{ width: "1rem", height: "1rem", color: "#d97706" }} />
      );
    if (role === "admin")
      return (
        <Shield style={{ width: "1rem", height: "1rem", color: "#2563eb" }} />
      );
    return <Eye style={{ width: "1rem", height: "1rem", color: "#94a3b8" }} />;
  };

  const getRoleColor = (role: string) => {
    if (role === "owner")
      return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
    if (role === "admin")
      return { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" };
    return { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  };

  // Show spinner while waiting for Firebase Auth
  if (!authReady) {
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

  // Locked state for non-Business
  if (!isBusiness && !loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1
            style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" }}
          >
            Team
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Collaborate with your team
          </p>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "4rem",
            textAlign: "center",
          }}
        >
          <Lock
            style={{
              width: "3rem",
              height: "3rem",
              color: "#94a3b8",
              margin: "0 auto 1rem",
            }}
          />
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "#0f172a",
              marginBottom: "0.5rem",
            }}
          >
            Team Collaboration Locked
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.875rem",
              maxWidth: "24rem",
              margin: "0 auto 1.5rem",
            }}
          >
            Team collaboration is only available on the{" "}
            <strong>Business plan</strong>. Upgrade to invite up to 5 team
            members with Admin and Member roles.
          </p>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: "0.5rem",
              textAlign: "left",
              backgroundColor: "#f8fafc",
              padding: "1rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              color: "#475569",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Shield
                style={{ width: "1rem", height: "1rem", color: "#2563eb" }}
              />
              <strong>Admin</strong> — Manage websites, team, and settings
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Eye
                style={{ width: "1rem", height: "1rem", color: "#94a3b8" }}
              />
              <strong>Member</strong> — View-only access to dashboards and
              alerts
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1
            style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" }}
          >
            Team
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            {currentCount} of {maxTeam} members · Business plan
          </p>
        </div>
        {canInvite ? (
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: "0.625rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <UserPlus style={{ width: "1rem", height: "1rem" }} />
            Invite Member
          </button>
        ) : (
          <div
            style={{
              padding: "0.625rem 1.25rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle style={{ width: "1rem", height: "1rem" }} />
            Limit Reached
          </div>
        )}
      </div>

      {/* Limit Warning */}
      {!canInvite && currentCount >= maxTeam && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "0.75rem",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertTriangle
            style={{
              width: "1.25rem",
              height: "1.25rem",
              color: "#f59e0b",
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: "0.875rem", color: "#92400e" }}>
            Team limit reached ({currentCount}/{maxTeam}). You cannot add more
            members.
          </p>
        </div>
      )}

      {/* Role Legend */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          fontSize: "0.875rem",
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield style={{ width: "1rem", height: "1rem", color: "#2563eb" }} />
          <strong>Admin</strong> — Can add/delete websites and manage team
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Eye style={{ width: "1rem", height: "1rem", color: "#94a3b8" }} />
          <strong>Member</strong> — View-only, cannot add or delete anything
        </div>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "4rem",
            textAlign: "center",
          }}
        >
          <Users
            style={{
              width: "3rem",
              height: "3rem",
              color: "#94a3b8",
              margin: "0 auto 1rem",
            }}
          />
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#0f172a",
            }}
          >
            No team members yet
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            Invite people to collaborate on monitoring
          </p>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {members.map((member) => {
            const rc = getRoleColor(member.role);
            const isMember = member.role === "member";
            return (
              <div
                key={member.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    backgroundColor:
                      member.role === "owner"
                        ? "#fef3c7"
                        : member.role === "admin"
                          ? "#eff6ff"
                          : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {getRoleIcon(member.role)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {member.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: "600",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "0.25rem",
                        backgroundColor: rc.bg,
                        color: rc.text,
                        border: `1px solid ${rc.border}`,
                        textTransform: "capitalize",
                      }}
                    >
                      {member.role}
                    </span>
                    {member.status === "pending" && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        Pending
                      </span>
                    )}
                    {member.status === "invited" && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: "600",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.25rem",
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                        }}
                      >
                        Invited
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      marginTop: "0.125rem",
                    }}
                  >
                    {member.email}
                  </p>
                  {isMember && (
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        color: "#94a3b8",
                        marginTop: "0.125rem",
                      }}
                    >
                      View-only access · Cannot add or delete websites
                    </p>
                  )}
                  {member.role === "admin" && (
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        color: "#2563eb",
                        marginTop: "0.125rem",
                      }}
                    >
                      Full access · Can manage websites and team
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {member.role !== "owner" && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMemberRole(
                            member.id,
                            e.target.value as TeamMember["role"],
                          )
                        }
                        style={{
                          padding: "0.375rem 0.5rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.375rem",
                          fontSize: "0.75rem",
                          backgroundColor: "white",
                          cursor: "pointer",
                        }}
                      >
                        <option value="member">Member (View-only)</option>
                        <option value="admin">Admin (Full access)</option>
                      </select>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.name} from the team?`)) {
                            removeMember(member.id);
                          }
                        }}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#fef2f2",
                          border: "none",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          color: "#dc2626",
                        }}
                        title="Remove member"
                      >
                        <Trash2 style={{ width: "1rem", height: "1rem" }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
          onClick={() => setShowInvite(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "28rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#0f172a",
                }}
              >
                Invite Team Member
              </h2>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X style={{ width: "1.25rem", height: "1.25rem" }} />
              </button>
            </div>

            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                marginTop: "0.25rem",
              }}
            >
              {currentCount} of {maxTeam} members used
            </p>

            {error && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                  color: "#dc2626",
                  backgroundColor: "#fef2f2",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                }}
              >
                {error}
              </p>
            )}

            <form
              onSubmit={handleInvite}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#334155",
                    marginBottom: "0.25rem",
                  }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#334155",
                    marginBottom: "0.25rem",
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Role selection */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#334155",
                    marginBottom: "0.25rem",
                  }}
                >
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "member")
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    backgroundColor: "white",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="member">
                    Member — View dashboards and alerts only
                  </option>
                  <option value="admin">
                    Admin — Full access to manage everything
                  </option>
                </select>
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}
              >
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  style={{
                    flex: 1,
                    padding: "0.625rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    backgroundColor: "white",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{
                    flex: 1,
                    padding: "0.625rem",
                    border: "none",
                    borderRadius: "0.5rem",
                    backgroundColor: "#2563eb",
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: inviting ? "not-allowed" : "pointer",
                    opacity: inviting ? 0.6 : 1,
                  }}
                >
                  {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
