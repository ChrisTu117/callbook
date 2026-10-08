import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  transpilePackages: ["@callbook/core"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
