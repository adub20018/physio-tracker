import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 only allows the qualities listed here (default: [75] alone). The
    // landing page's device screenshots are dense UI — fine text and 1px chart
    // lines — which q75 WebP visibly mushes, so they opt into 90.
    qualities: [75, 90],
  },
};

export default nextConfig;
