import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "static.licdn.com" },
      { protocol: "https", hostname: "iynirubuonhsnxzzmrry.supabase.co" },
    ],
  },
};

export default nextConfig;
