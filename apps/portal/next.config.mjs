/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages ship raw TS/TSX; Next transpiles them.
  transpilePackages: ['@cima/db'],
};

export default nextConfig;
