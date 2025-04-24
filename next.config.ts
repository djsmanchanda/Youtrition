import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint:    { ignoreDuringBuilds: true },
  // no more outputFileTracingIncludes or SQLite env here
};

export default nextConfig;
