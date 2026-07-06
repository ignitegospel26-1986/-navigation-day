import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for container hosts
  // like Cloud Run / Fly / Render. Vercel ignores this and uses its own build.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
