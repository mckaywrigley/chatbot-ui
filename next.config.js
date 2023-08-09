const { i18n } = require('./next-i18next.config');
// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//   openAnalyzer: process.env.ANALYZE === 'true',
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  // TODO：edge环境需要移除这个包
  // experimental: {
  //   serverComponentsExternalPackages: ['bcrypt'],
  // },
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

// module.exports = withBundleAnalyzer(nextConfig);
module.exports = nextConfig;
