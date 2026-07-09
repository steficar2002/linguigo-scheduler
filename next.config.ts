import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
