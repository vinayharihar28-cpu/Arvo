import type { NextConfig } from "next";
import withPWA from "next-pwa";

const baseConfig: NextConfig = {
  // Existing config options can be added here (e.g., reactStrictMode: true)
  // Enable future webpack5 features if needed
};

const pwaConfig = {
  dest: "public",
  register: false, // We'll manually register in InstallPrompt
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
};

export default withPWA(baseConfig, pwaConfig);

