import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MCP route'u kaynak dosyalarını çalışma anında okur; Vercel paketine dahil edilsinler.
  outputFileTracingIncludes: {
    "/mcp": ["./data/sources/**/*.json"],
  },
};

export default nextConfig;
