/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages ship raw TS/TSX; Next transpiles them.
  transpilePackages: ['@cima/db', '@cima/email', '@cima/activaciones'],
  experimental: {
    // Resume uploads go through a server action; the default cap is 1 MB, so
    // raise it above the 10 MB file limit enforced in the upload action.
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
