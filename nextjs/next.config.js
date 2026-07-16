/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*', // Proxy backend calls in Docker
      },
      {
        source: '/media/:path*',
        destination: 'http://backend:8000/media/:path*', // Proxy media calls in Docker
      },
    ]
  },
}

module.exports = nextConfig
