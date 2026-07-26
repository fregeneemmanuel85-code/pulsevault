import tls from "tls";

export interface SSLCheckResult {
  valid: boolean;
  expiryDate: string | null;
  daysLeft: number;
  issuer: string;
  subject: string;
}

function toString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || "Unknown";
  return val || "Unknown";
}

export function checkSSLCertificate(
  hostname: string,
  port: number = 443,
): Promise<SSLCheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      port,
      hostname,
      {
        servername: hostname,
        rejectUnauthorized: false, // 🔥 Allow expired/invalid certs so we can inspect them
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          resolve({
            valid: false,
            expiryDate: null,
            daysLeft: 0,
            issuer: "Unknown",
            subject: hostname,
          });
          return;
        }

        const expiryDate = cert.valid_to ? new Date(cert.valid_to) : null;
        const now = new Date();
        const daysLeft = expiryDate
          ? Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;

        resolve({
          valid: !cert.valid_to || daysLeft > 0,
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
          daysLeft,
          issuer: toString(cert.issuer?.O),
          subject: toString(cert.subject?.CN) || hostname,
        });
      },
    );

    socket.on("error", (err) => {
      console.error("[SSL Check] Error for", hostname, err.message);
      socket.destroy();
      resolve({
        valid: false,
        expiryDate: null,
        daysLeft: 0,
        issuer: "Unknown",
        subject: hostname,
      });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve({
        valid: false,
        expiryDate: null,
        daysLeft: 0,
        issuer: "Unknown",
        subject: hostname,
      });
    });
  });
}
