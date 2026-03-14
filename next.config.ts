import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling native binaries
      config.externals = config.externals || [];
      config.externals.push("fluent-ffmpeg", "ffmpeg-static");
    }
    return config;
  },
  // Allow video files to be served
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
