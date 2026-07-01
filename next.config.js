/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker standalone build
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  // pdfkit uses Node.js built-ins (fs, zlib, stream) — must not be bundled by webpack
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
};

module.exports = nextConfig;
