import type { NextConfig } from "next";

/**
 * 全ページに付ける安全のための指定。
 * - よそのサイトの枠（iframe）の中で開かれないようにする（だまして押させる手口を防ぐ）
 * - ファイルの種類をブラウザに推測させない、よそのサイトへ URL の ? 以降を渡さない
 * - カメラは自分のサイトだけ、マイクと位置情報は使わない
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
