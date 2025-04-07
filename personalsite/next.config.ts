import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kt-personalsite.s3.us-east-2.amazonaws.com',
        port: '', // Leave empty for default ports
        pathname: '/galleryimgs/**', // Match all images under the galleryimgs folder
      },
    ],
  },
};

export default nextConfig;