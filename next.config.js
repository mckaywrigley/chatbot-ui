const withPWA = require("next-pwa")({
  dest: "public"
})

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost"
      },
      {
        protocol: "http",
        hostname: "127.0.0.1"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
  }
})

if (process.env.NODE_ENV !== "production") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true"
  })
  module.exports = withBundleAnalyzer(module.exports)
}
