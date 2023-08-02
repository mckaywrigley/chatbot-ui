const { i18n } = require('./next-i18next.config');
// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   openAnalyzer: process.env.ANALYZE === 'true',
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  // experimental: {
  //   appDir: true,
  //   serverComponentsExternalPackages: ['bcrypt'],
  // },
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    config.externals = [...config.externals, 'bcrypt'];

    return config;
  },
};

// module.exports = withBundleAnalyzer(nextConfig);
module.exports = nextConfig;
