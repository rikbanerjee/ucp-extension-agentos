import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.80'],
  async headers() {
    return [{
      source: '/webmcp-showcase/:path*',
      headers: [{ key: 'Origin-Agent-Cluster', value: '?1' }],
    }, {
      source: '/agent-ready-storefront/:path*',
      headers: [{ key: 'Origin-Agent-Cluster', value: '?1' }],
    }];
  },
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
      // IA redesign: /for-merchants is now the independent-retail solution
      // page under /solutions. Kept as a permanent compatibility redirect so
      // existing inbound links keep working (redirects run before rendering,
      // so no src/app/for-merchants/page.tsx is needed alongside this).
      {
        source: '/for-merchants',
        destination: '/solutions/independent-retail',
        permanent: true,
      },
      // Guided-demo IA: /see-it-work is now the demo-selection hub; its
      // useful scenes were extracted into /guided/{enterprise,independent,platform}.
      // Exact-path match only — does not affect /guided/* child routes.
      {
        source: '/guided',
        destination: '/see-it-work',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
