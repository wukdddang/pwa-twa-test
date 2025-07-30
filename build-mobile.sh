#!/bin/bash

echo "🚀 TWA Test 모바일 앱 빌드 시작..."

# Next.js 빌드
echo "📦 Next.js 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Next.js 빌드 실패"
    exit 1
fi

# Capacitor 동기화
echo "🔄 Capacitor 동기화 중..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Capacitor 동기화 실패"
    exit 1
fi

echo "✅ 빌드 완료!"
echo ""
echo "다음 단계:"
echo "안드로이드: npm run cap:open:android"
echo "iOS: npm run cap:open:ios" 