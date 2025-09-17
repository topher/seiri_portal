/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['@apollo/client', 'neo4j-driver']
  },

  // Build optimization
  swcMinify: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Webpack customization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize external packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
      };
    }

    // Handle GraphQL files (if needed)
    // config.module.rules.push({
    //   test: /\.graphql$/,
    //   use: 'raw-loader',
    // });

    return config;
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimization
  poweredByHeader: false,
  generateEtags: false,
  compress: true,

  // Output configuration (comment out for now due to SWC issues)
  // output: 'standalone',
  
  // Error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

export default nextConfig