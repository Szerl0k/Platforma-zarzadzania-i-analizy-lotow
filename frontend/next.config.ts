/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

/*
Fast-Fail pattern is intentionally not implemented here in case INTERNAL_API_URL is missing during the production build.
This variable is dynamically injected later during the Azure App Service deployment process via App Settings.
*/

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
