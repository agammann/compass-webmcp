import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return ['/', '/about', '/contact', '/docs', '/pricing', '/privacy'].map((source) => ({
      source,
      headers: [{
        key: 'Cache-Control',
        value: 'private, no-cache, max-age=0, must-revalidate',
      }],
    }));
  },
};

export default nextConfig;
