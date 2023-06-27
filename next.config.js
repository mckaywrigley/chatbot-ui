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

    // 移除热模块替换插件
    if (!isServer && dev) {
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'HotModuleReplacementPlugin'
      );
    }

    return config;
  },
};

module.exports = nextConfig;
