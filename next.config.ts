import type { NextConfig } from "next";

// Proxying is opt-in. A default production target here makes a local web server
// silently read and write production data whenever it is started without the API.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!API_PROXY_TARGET) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
