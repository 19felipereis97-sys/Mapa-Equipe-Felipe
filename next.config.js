/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker standalone build
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  // pdfkit uses Node.js built-ins (fs, zlib, stream) — must not be bundled by webpack
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
    // Habilita src/instrumentation.ts (register()) — inicia o worker in-process
    // no boot do servidor Node (Next 14 exige o flag; no 15 é padrão).
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
