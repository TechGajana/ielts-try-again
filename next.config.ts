import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'firebase-admin',
    'jwks-rsa',
    'jose',
    '@firebase/database-compat',
    '@firebase/database',
  ],
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.app.github.dev",
        "ieltstryagain.com"
      ],
    },
  },
};

export default nextConfig;