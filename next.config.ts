import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/admin/classes",
        destination: "/admin/teachers",
        permanent: false,
      },
      {
        source: "/admin/teachers/:teacherId/schedule",
        destination: "/admin/teachers/:teacherId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
