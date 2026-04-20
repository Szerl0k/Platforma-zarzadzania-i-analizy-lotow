/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: [
        'localhost',
        '192.168.0.182',
        '10.10.10.10'
    ],
  }),

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // When running in Docker, this uses the internal docker name "backend"
        // When running locally without docker, it falls back to localhost
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:5001"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
