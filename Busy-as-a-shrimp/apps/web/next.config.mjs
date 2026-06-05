/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@airp/http-client",
    "@airp/api-types",
    "@tanstack/react-query",
    "@tanstack/query-core"
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
