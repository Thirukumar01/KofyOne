import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'media.kofyone.com',
      },
      {
        protocol: 'https',
        hostname: 'learn.microsoft.com',
      },
      {
        protocol: 'https',
        hostname: '**.microsoft.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazon.com',
      },
      {
        protocol: 'https',
        hostname: '**.google.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
