import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A small, self-contained server bundle for the production Docker image.
  // Affects `next build` output only — `next dev` is unchanged.
  output: "standalone",
};

export default nextConfig;
