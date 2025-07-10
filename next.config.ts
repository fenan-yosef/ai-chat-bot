import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
  typescript: {
    // Temporarily ignore build errors to get past the current issue
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Add this to help with the route parameter issue
  async redirects() {
    return []
  },
}

export default nextConfig
