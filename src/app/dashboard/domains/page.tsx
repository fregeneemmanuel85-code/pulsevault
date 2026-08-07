"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { subscribeToWebsites, type Website } from "@/lib/firestore";
import DomainExpiryCard from "@/components/domains/DomainExpiryCard";
import { Globe } from "lucide-react";
import Link from "next/link";

export default function DomainMonitorPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    const unsub = subscribeToWebsites((data) => {
      const sorted = [...data].sort((a, b) => {
        const getDays = (w: Website) => {
          if (w.domainExpiryManual) {
            return Math.ceil(
              (new Date(w.domainExpiryManual).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            );
          }
          return w.domainDaysLeft ?? Infinity;
        };
        return getDays(a) - getDays(b);
      });
      setWebsites(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const expiringSoon = websites.filter((w) => {
    if (w.domainExpiryManual) {
      const days = Math.ceil(
        (new Date(w.domainExpiryManual).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return days < 30;
    }
    return (w.domainDaysLeft ?? Infinity) < 30;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-[#1e293b] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
            <Globe size={24} className="text-indigo-400" />
            Domain Monitor
          </h1>
          <p className="text-slate-400 mt-1">
            Track domain expiration across all your websites
          </p>
        </div>
        {expiringSoon.length > 0 && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg text-sm font-medium">
            {expiringSoon.length} domain{expiringSoon.length !== 1 ? "s" : ""}{" "}
            need attention
          </div>
        )}
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-4">
          <h2 className="font-semibold text-rose-300 mb-2">Urgent Renewals</h2>
          <div className="space-y-2">
            {expiringSoon.map((site) => {
              const daysLeft = site.domainExpiryManual
                ? Math.ceil(
                    (new Date(site.domainExpiryManual).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )
                : site.domainDaysLeft;

              return (
                <div
                  key={site.id}
                  className="flex items-center justify-between bg-[#0f172a] rounded-lg p-3 border border-white/[0.06]"
                >
                  <div>
                    <Link
                      href={`/dashboard/websites/${site.id}`}
                      className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {site.name}
                    </Link>
                    <p className="text-sm text-slate-500">{site.url}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-bold">
                      {daysLeft! < 0
                        ? `Expired ${Math.abs(daysLeft!)}d ago`
                        : `${daysLeft} days left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {websites.map((site) => (
          <Link key={site.id} href={`/dashboard/websites/${site.id}`}>
            <div className="hover:shadow-lg hover:shadow-indigo-900/10 transition-all duration-300 rounded-xl bg-[#0f172a] border border-white/[0.06] p-4 hover:border-indigo-500/20">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-100 truncate">
                  {site.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">{site.url}</p>
              </div>
              <DomainExpiryCard
                expiry={site.domainExpiryManual ?? site.domainExpiry ?? null}
                daysLeft={
                  site.domainExpiryManual
                    ? Math.ceil(
                        (new Date(site.domainExpiryManual).getTime() -
                          Date.now()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : (site.domainDaysLeft ?? null)
                }
                registrar={site.domainRegistrar ?? null}
              />
            </div>
          </Link>
        ))}
      </div>

      {websites.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Globe size={48} className="mx-auto mb-4 opacity-30" />
          <p>No websites found. Add a website to monitor domain expiration.</p>
        </div>
      )}
    </div>
  );
}
