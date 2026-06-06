import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  turbopack: {},
  // pdf-parse uses pdfjs-dist which has complex CJS internals with native-module
  // fallbacks. Telling Turbopack to skip bundling it and load it via Node's
  // native require at runtime avoids silent extraction failures.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
