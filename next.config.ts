import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor 정적 배포를 위한 설정
  output: "export",
  trailingSlash: true,
  basePath: "",
  assetPrefix: "",

  // 기존 설정들...
  experimental: {
    // 필요한 실험적 기능들
  },

  // 이미지 최적화 비활성화 (정적 export에서 필요)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
