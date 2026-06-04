/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.INTERNAL_API_URL) {
  throw new Error(
    "CRITICAL: INTERNAL_API_URL environment variable is required in production",
  );
}

const internalApiUrl = process.env.INTERNAL_API_URL || "http://localhost:5001";

const nextConfig = {
  output: "standalone",

  ...(!isProd && {
    allowedDevOrigins: ["localhost", "192.168.0.182", "10.10.10.10"],
  }),

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
