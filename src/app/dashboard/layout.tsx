import type { Metadata } from "next";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your website monitoring, view alerts, track performance, and configure settings — all from your PulseVault dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          marginLeft: "var(--sidebar-width, 16rem)",
          transition: "margin-left 0.3s ease",
        }}
      >
        <DashboardHeader />
        <main
          style={{
            flex: 1,
            padding: "clamp(0.75rem, 3vw, 1.5rem)",
            boxSizing: "border-box",
            minHeight: "calc(100vh - 4rem)",
            overflowX: "hidden",
            width: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
