import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  sassOptions: {
    loadPaths: [path.join(process.cwd(), "src/styles")],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
