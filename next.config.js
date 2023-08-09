const basePath = "/apvd"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  basePath,
  assetPrefix: basePath,
  publicRuntimeConfig: { basePath, },
  images: { unoptimized: true, },
}

module.exports = nextConfig;
