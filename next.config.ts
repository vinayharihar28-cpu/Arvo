import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Add any existing config options here
};

export default withPWA(nextConfig, {
  dest: "public",
  register: true,
  skipWaiting: true,
  // Disable PWA in development for faster builds
  disable: process.env.NODE_ENV === "development",
});
