@echo off
setlocal enabledelayedexpansion

echo 🍎 iOS 배포 설정 헬퍼 스크립트 (Windows)
echo =====================================

:menu
echo.
echo 원하는 작업을 선택하세요:
echo 1) GoogleService-Info.plist를 Base64로 인코딩
echo 2) App Store Connect API 키(.p8)를 Base64로 인코딩  
echo 3) 인증서(.p12)를 Base64로 인코딩
echo 4) Bundle ID 및 앱 설정 확인
echo 5) 로컬 iOS 빌드 테스트 (macOS 전용)
echo 0) 종료
echo.
set /p choice="선택: "

if "%choice%"=="1" goto encode_plist
if "%choice%"=="2" goto encode_api_key
if "%choice%"=="3" goto encode_certificate
if "%choice%"=="4" goto check_config
if "%choice%"=="5" goto test_build
if "%choice%"=="0" goto exit
echo 잘못된 선택입니다. 다시 선택해주세요.
goto menu

:encode_plist
echo.
echo GoogleService-Info.plist 파일 경로를 입력하세요:
set /p file_path=""
if not exist "%file_path%" (
    echo 파일을 찾을 수 없습니다: %file_path%
    goto menu
)
echo.
echo PowerShell을 사용하여 Base64 인코딩 중...
powershell -command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('%file_path%'))"
echo.
echo GitHub Secret에 위 값을 GOOGLE_SERVICE_INFO_PLIST로 추가하세요.
goto menu

:encode_api_key
echo.
echo App Store Connect API 키(.p8) 파일 경로를 입력하세요:
set /p file_path=""
if not exist "%file_path%" (
    echo 파일을 찾을 수 없습니다: %file_path%
    goto menu
)
echo.
echo PowerShell을 사용하여 Base64 인코딩 중...
powershell -command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('%file_path%'))"
echo.
echo GitHub Secret에 위 값을 APPSTORE_PRIVATE_KEY로 추가하세요.
goto menu

:encode_certificate
echo.
echo 인증서(.p12) 파일 경로를 입력하세요:
set /p file_path=""
if not exist "%file_path%" (
    echo 파일을 찾을 수 없습니다: %file_path%
    goto menu
)
echo.
echo PowerShell을 사용하여 Base64 인코딩 중...
powershell -command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('%file_path%'))"
echo.
echo GitHub Secret에 위 값을 APPLE_CERTIFICATES_P12로 추가하세요.
goto menu

:check_config
echo.
echo 현재 앱 설정 확인 중...
echo.
if exist "capacitor.config.ts" (
    echo ✓ capacitor.config.ts 파일 존재
) else (
    echo ✗ capacitor.config.ts 파일이 없습니다
)

if exist "public/manifest.json" (
    echo ✓ manifest.json 파일 존재
) else (
    echo ✗ manifest.json 파일이 없습니다
)

if exist "ios" (
    echo ✓ iOS 프로젝트 디렉토리 존재
) else (
    echo ! iOS 프로젝트가 아직 생성되지 않았습니다
    echo   'npx cap add ios' 명령어를 실행하세요
)
goto menu

:test_build
echo.
echo 주의: iOS 빌드는 macOS에서만 가능합니다.
echo Windows에서는 Next.js 빌드와 Capacitor 동기화만 테스트합니다.
echo.
echo 1. Next.js 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo Next.js 빌드 실패
    goto menu
)

echo 2. Capacitor 동기화 중...
call npx cap sync ios
if %errorlevel% neq 0 (
    echo Capacitor 동기화 실패
    goto menu
)

echo.
echo Windows 환경에서 테스트 완료!
echo iOS 실제 빌드는 macOS 환경이나 GitHub Actions에서 수행하세요.
goto menu

:exit
echo 스크립트를 종료합니다.
pause
exit /b 0 