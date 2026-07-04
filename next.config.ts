import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.80'],
  async redirects() {
    return [
      // /home retired — the root `/` is the single front door (Story-first).
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      // SWP-6: /readiness is a lightweight alias for the AI-readiness score tool.
      {
        source: '/readiness',
        destination: '/aeo-score',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
