import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Pin the workspace root — two lockfiles (ai-factory/ and typemorph/) made Turbopack
  // infer the wrong root. __dirname is this config's dir = the project root.
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
