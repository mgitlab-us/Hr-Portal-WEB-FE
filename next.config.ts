import type { NextConfig } from "next";

const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || "http://15.252.233.152").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;