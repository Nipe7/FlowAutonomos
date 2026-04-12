import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Netlify handles the output mode via @netlify/plugin-nextjs */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
