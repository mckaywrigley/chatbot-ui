const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,

  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

const withPWA = require('next-pwa')({
  dest: 'public',
  // register: true,
  // skipWaiting: true,
  // disable:process.env.NODE_ENV === 'development'
});

module.exports = withPWA(nextConfig);
