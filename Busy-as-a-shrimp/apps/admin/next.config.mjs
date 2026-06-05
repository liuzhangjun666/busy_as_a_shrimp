/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@airp/http-client", "@airp/api-types"]
};

export default nextConfig;
