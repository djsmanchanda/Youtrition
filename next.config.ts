import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint checking during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Add any other existing config options you might have here
};

export default nextConfig;