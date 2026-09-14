import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.run.app",
    "*.e2b.app",
    "ais-dev-jfmzvs4yr45kcjwrulobzf-429633149903.asia-southeast1.run.app",
    "ais-pre-jfmzvs4yr45kcjwrulobzf-429633149903.asia-southeast1.run.app",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
