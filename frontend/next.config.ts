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
};

export default withPWA(nextConfig);
