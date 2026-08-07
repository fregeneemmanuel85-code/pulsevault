import { sendHealthDropAlert, sendSiteOfflineAlert } from "./email";

interface MonitorData {
  to: string;
  userName: string;
  websiteUrl: string;
  websiteName: string;
  healthScore?: number;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
}

export async function notifyHealthDrop(data: MonitorData) {
  if (!data.healthScore) return;

  console.log(
    `[Alert] Health drop detected for ${data.websiteName}: ${data.healthScore}%`,
  );

  return sendHealthDropAlert({
    to: data.to,
    userName: data.userName,
    target: data.websiteUrl,
    healthScore: data.healthScore,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}

export async function notifySiteOffline(data: MonitorData) {
  console.log(`[Alert] Site offline detected for ${data.websiteName}`);

  return sendSiteOfflineAlert({
    to: data.to,
    userName: data.userName,
    target: data.websiteUrl,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}
