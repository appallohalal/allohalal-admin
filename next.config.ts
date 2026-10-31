import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.10.71",
    "localhost",
    "192.168.10.*",
  ],
};

export default nextConfig;
