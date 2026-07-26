/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost"],
  },
  // FIX: Externalize ws/bufferutil so Baileys works in Next.js
  experimental: {
    serverComponentsExternalPackages: [
      "@whiskeysockets/baileys",
      "ws",
      "bufferutil",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("ws", "bufferutil");
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
        ],
      },
      {
        source: "/api/cron/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
