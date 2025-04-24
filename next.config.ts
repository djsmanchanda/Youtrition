import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript and ESLint checks during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Provide the location of the SQLite file as an environment variable
  env: {
    DATABASE_URL: `file:${path.join(process.cwd(), "dev.db")}`,
  },

  // Use Next.js file tracing to include the SQLite file in serverless functions
  experimental: {
    outputFileTracing: true,
    // Root directory for tracing
    outputFileTracingRoot: path.join(__dirname),
    // Include the SQLite database in all traced functions
    outputFileTracingIncludes: {
      // "./" ensures dev.db bundles into every server function
      "./": ["dev.db"],
    },
  },
};

  // Ensure dev.db is included in all serverless function bundles
  experimental: {
    outputFileTracing: true,
    outputFileTracingRoot: path.join(__dirname),
    outputFileTracingIncludes: {
      // "." key points to the project root
      ".": ["dev.db"],
    },
  },
};

export default nextConfig;
