import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  serverExternalPackages: ["@bytecodealliance/jco"],
  // Hide the dev indicator so demo recordings (against `npm run dev`) are clean.
  devIndicators: false,
};

export default nextConfig;
