/** @type {import('next').NextConfig} */
// Bundle analyzer for performance optimization
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // ESLint configuration - ignore deprecated options warning in ESLint 9.x
  eslint: {
    // Only run ESLint manually via npm run lint (fixes ESLint 9.x compatibility)
    ignoreDuringBuilds: true,
  },

  // Output standalone for smaller builds
  output: 'standalone',

  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Experimental optimizations
  // NOTE: Barrel optimization disabled for all packages due to recharts/d3 module resolution issues
  // experimental: {
  //   optimizePackageImports: [
  //     '@privy-io/react-auth',
  //     'thirdweb',
  //     'wagmi',
  //     'viem',
  //     'lucide-react'
  //   ],
  // },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations for bundle size
  webpack: (config, { isServer }) => {
    // Reduce bundle size by splitting chunks
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separate chunk for large libraries
            privy: {
              name: 'privy',
              test: /@privy-io/,
              chunks: 'all',
              priority: 30,
            },
            thirdweb: {
              name: 'thirdweb',
              test: /thirdweb/,
              chunks: 'all',
              priority: 30,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },
};

// Temporarily disabled Sentry for testnet launch
// To re-enable: uncomment the lines below and the import at top
// import { withSentryConfig } from "@sentry/nextjs";
// export default withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions);

export default withBundleAnalyzer(nextConfig);