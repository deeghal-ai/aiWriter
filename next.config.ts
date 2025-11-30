import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Exclude implement-supabase folder from build
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

