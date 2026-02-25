import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Google Drive direct image URLs (uc?id=...&export=view)
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    // Use system TLS certificates for Turbopack (required in some environments)
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
