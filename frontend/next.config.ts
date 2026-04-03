import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "..");

const nextConfig: NextConfig = {
  // Produce a self-contained .next/standalone folder that can run on any VPS
  // without the full node_modules tree. The standalone server is started with:
  //   node .next/standalone/server.js
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
