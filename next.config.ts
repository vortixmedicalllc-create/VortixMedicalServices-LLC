import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // PGlite ships WebAssembly and data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Ship the SQL migrations with every server function so DATABASE_AUTO_MIGRATE works on serverless hosts.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    // AI Services was discontinued; keep old links working.
    return [{ source: "/services/ai", destination: "/services", permanent: true }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
