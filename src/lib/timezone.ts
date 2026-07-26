import { getSettings, saveSettings } from "./firestore";

let cachedTimezone: string | null = null;

/** Auto-detect timezone from browser — no manual setting needed */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Get user's timezone (auto-detected, cached) */
export async function getUserTimezone(): Promise<string> {
  if (cachedTimezone) return cachedTimezone;

  // Try Firestore first (in case they moved countries and we stored it)
  try {
    const settings = await getSettings();
    if (settings?.timezone && settings.timezone !== "UTC") {
      cachedTimezone = settings.timezone;
      return cachedTimezone;
    }
  } catch {
    // ignore
  }

  // Auto-detect from browser
  const detected = detectTimezone();
  cachedTimezone = detected;

  // Silently save to Firestore so backend emails use it too
  // Fetch existing settings first, then merge to avoid TS error
  try {
    const existing = await getSettings();
    await saveSettings({
      name: existing?.name ?? "",
      email: existing?.email ?? "",
      notifications: existing?.notifications ?? { email: true, push: true },
      theme: existing?.theme ?? "light",
      timezone: detected,
    });
  } catch {
    // ignore
  }

  return detected;
}

export function clearTimezoneCache() {
  cachedTimezone = null;
}

/** Format any date to the user's local timezone */
export function formatInTimezone(
  date: Date | string | number,
  timezone?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const tz = timezone || detectTimezone();
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    hour12: false,
  };

  return new Intl.DateTimeFormat("en-US", {
    ...defaultOptions,
    ...options,
  }).format(d);
}

/** Format relative time like "2 min ago" */
export function timeAgo(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatInTimezone(d, undefined, { month: "short", day: "numeric" });
}
