import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` is what makes the disc usable without npm: the build copies the
  // server and only the modules it actually imports into .next/standalone, so a
  // hospital PC can run `node server.js` with no install step and no internet.
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
  // Dev-server assets are requested by the hosted preview proxy, not just localhost.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost", "127.0.0.1"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
