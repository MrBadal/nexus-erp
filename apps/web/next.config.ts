import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin tracing root to the monorepo root (two levels up from apps/web).
  // Without this, Next.js infers root from the longest common ancestor of touched
  // files, which on Windows includes the OneDrive prefix and produces a broken
  // .next/standalone/OneDrive/Desktop/... layout.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
