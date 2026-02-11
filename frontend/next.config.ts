/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // When running in Docker, this uses the internal docker name "backend"
        // When running locally without docker, it falls back to localhost
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:5001'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
