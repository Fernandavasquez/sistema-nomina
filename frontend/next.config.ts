import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genera .next/standalone con solo lo necesario para producción (imagen Docker liviana).
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
