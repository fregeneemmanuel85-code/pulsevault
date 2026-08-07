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
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <Globe size={24} className="text-blue-600 dark:text-blue-400" />
            Domain Monitor
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Track domain expiration across all your websites
          </p>
        </div>
        {expiringSoon.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800/50">
            {expiringSoon.length} domain{expiringSoon.length !== 1 ? "s" : ""}{" "}
            need attention
          </div>
        )}
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <h2 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            Urgent Renewals
          </h2>
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
                  className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border dark:border-white/[0.06]"
                >
                  <div>
                    <Link
                      href={`/dashboard/websites/${site.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {site.name}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {site.url}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 dark:text-red-400 font-bold">
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
            <div className="bg-white dark:bg-slate-900 border dark:border-white/[0.06] hover:shadow-md dark:hover:shadow-slate-900/50 transition-all rounded-xl p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                  {site.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {site.url}
                </p>
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
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <Globe size={48} className="mx-auto mb-4 opacity-50" />
          <p>No websites found. Add a website to monitor domain expiration.</p>
        </div>
      )}
    </div>
  );
}
