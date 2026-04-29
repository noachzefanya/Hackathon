/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',  // Static export — required for Vercel subdirectory deployment
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig
