import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // Dev-server assets are requested by the hosted preview proxy, not just localhost.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost", "127.0.0.1"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // No `images.remotePatterns`: the hospital runs offline and ships no remote
  // imagery, so the default (local-only) loader is the only one allowed. An
  // open https wildcard here would turn a missing picture into a 30-second
  // stall on a ward machine with no internet.
};

export default nextConfig;
