import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  experimental: {
    // Allow a 3 MB attachment plus multipart overhead; keep requests bounded.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
