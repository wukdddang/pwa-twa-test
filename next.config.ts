import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // 빌드 시간을 환경 변수로 추가
  env: {
    BUILD_TIME: new Date().toISOString(),
    BUILD_VERSION: `v1.0.${Math.floor(Date.now() / 1000)}`,
  },

  // TWA와 PWA를 위한 추가 설정
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
