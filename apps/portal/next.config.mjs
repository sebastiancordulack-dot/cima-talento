/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages ship raw TS/TSX; Next transpiles them.
  transpilePackages: ['@cima/db', '@cima/email', '@cima/activaciones'],
};

export default nextConfig;
