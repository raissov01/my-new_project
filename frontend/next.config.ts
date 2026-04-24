import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "..");

const withPWA = withPWAInit({
  dest: "public",
  // Only register the SW in production so hot-reload isn't affected in dev.
  disable: process.env.NODE_ENV !== "production",
  register: true,
  reloadOnOnline: true,
  // Cache all Next.js static chunks (JS, CSS) with a long-lived strategy.
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Produce a self-contained .next/standalone folder that can run on any VPS
  // without the full node_modules tree. The standalone server is started with:
  //   node .next/standalone/server.js
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,

  // These packages use native bindings or Node.js APIs that break when bundled.
  // They must be loaded from node_modules at runtime instead.
  serverExternalPackages: ["mammoth", "pdf-parse"],

  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  turbopack: {
    root: workspaceRoot,
  },

  async redirects() {
    return [
      // Legacy/alias routes → canonical destinations
      { source: "/ai-chat", destination: "/chat", permanent: true },
      { source: "/ielts/quiz", destination: "/quizzes", permanent: true },
      { source: "/ielts/quizzes", destination: "/quizzes", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/learn", destination: "/learn/map", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: lh3.googleusercontent.com",
              "connect-src 'self' https://studywithraissov.com wss://studywithraissov.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
