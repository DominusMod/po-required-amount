/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, path: false, crypto: false,
    };
    return config;
  },
};
module.exports = nextConfig;
