// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import createNextIntlPlugin from 'next-intl/plugin';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withNextIntl = createNextIntlPlugin(resolve(__dirname, 'src/lib/i18n/request.ts'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // maplibre-gl + @protomaps/basemaps are ESM-only; Next must transpile them or it emits an ESM chunk that
  // 404s in the browser ("Failed to load module script: non-JavaScript MIME type text/html") and the map
  // never mounts.
  transpilePackages: ['maplibre-gl', '@protomaps/basemaps'],
  // Trace from the monorepo root so the standalone output bundles workspace
  // dependencies (@citrineos/types) correctly.
  outputFileTracingRoot: resolve(__dirname, '../..'),
  devIndicators: {
    position: 'bottom-right',
  },
  eslint: {
    // Next 15's built-in lint runner does not currently load the flat
    // eslint.config.mjs + typescript-eslint parser correctly here, causing
    // spurious "import is reserved" errors. Run lint via `pnpm lint` instead.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'class-transformer/types/storage': resolve(
        __dirname,
        'node_modules/class-transformer/cjs/storage.js',
      ),
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
