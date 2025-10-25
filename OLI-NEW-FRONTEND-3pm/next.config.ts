/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ ignore ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ ignore TypeScript errors
  },
};

module.exports = nextConfig;
