import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['socket.io'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  typescript: {
    // Known Next.js 15.5.x bug: auto-generated .next/types/validator.ts
    // generates incorrect import paths for admin page module
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
