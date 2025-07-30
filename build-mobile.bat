@echo off
echo 🚀 TWA Test 모바일 앱 빌드 시작...

REM Next.js 빌드
echo 📦 Next.js 빌드 중...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Next.js 빌드 실패
    exit /b 1
)

REM Capacitor 동기화
echo 🔄 Capacitor 동기화 중...
call npx cap sync

if %errorlevel% neq 0 (
    echo ❌ Capacitor 동기화 실패
    exit /b 1
)

echo ✅ 빌드 완료!
echo.
echo 다음 단계:
echo 안드로이드: npm run cap:open:android
echo iOS: npm run cap:open:ios

pause 