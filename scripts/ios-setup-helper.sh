#!/bin/bash

echo "🍎 iOS 배포 설정 헬퍼 스크립트"
echo "==============================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_menu() {
    echo ""
    echo "원하는 작업을 선택하세요:"
    echo "1) GoogleService-Info.plist를 Base64로 인코딩"
    echo "2) App Store Connect API 키(.p8)를 Base64로 인코딩"
    echo "3) 인증서(.p12)를 Base64로 인코딩"
    echo "4) Bundle ID 및 앱 설정 확인"
    echo "5) Fastlane Match 초기 설정"
    echo "6) 로컬 iOS 빌드 테스트"
    echo "0) 종료"
    echo ""
}

encode_google_service_plist() {
    echo -e "${BLUE}GoogleService-Info.plist 파일 경로를 입력하세요:${NC}"
    read -r file_path
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}파일을 찾을 수 없습니다: $file_path${NC}"
        return
    fi
    
    encoded=$(base64 -i "$file_path")
    echo -e "${GREEN}Base64 인코딩 완료!${NC}"
    echo ""
    echo "GitHub Secret에 다음 값을 GOOGLE_SERVICE_INFO_PLIST로 추가하세요:"
    echo "----------------------------------------"
    echo "$encoded"
    echo "----------------------------------------"
}

encode_api_key() {
    echo -e "${BLUE}App Store Connect API 키(.p8) 파일 경로를 입력하세요:${NC}"
    read -r file_path
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}파일을 찾을 수 없습니다: $file_path${NC}"
        return
    fi
    
    encoded=$(base64 -i "$file_path")
    echo -e "${GREEN}Base64 인코딩 완료!${NC}"
    echo ""
    echo "GitHub Secret에 다음 값을 APPSTORE_PRIVATE_KEY로 추가하세요:"
    echo "----------------------------------------"
    echo "$encoded"
    echo "----------------------------------------"
}

encode_certificate() {
    echo -e "${BLUE}인증서(.p12) 파일 경로를 입력하세요:${NC}"
    read -r file_path
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}파일을 찾을 수 없습니다: $file_path${NC}"
        return
    fi
    
    encoded=$(base64 -i "$file_path")
    echo -e "${GREEN}Base64 인코딩 완료!${NC}"
    echo ""
    echo "GitHub Secret에 다음 값을 APPLE_CERTIFICATES_P12로 추가하세요:"
    echo "----------------------------------------"
    echo "$encoded"
    echo "----------------------------------------"
}

check_app_config() {
    echo -e "${BLUE}현재 앱 설정 확인 중...${NC}"
    echo ""
    
    if [ -f "capacitor.config.ts" ]; then
        echo -e "${GREEN}✓${NC} capacitor.config.ts 파일 존재"
        app_id=$(grep -o '"com\..*"' capacitor.config.ts | tr -d '"')
        echo "  App ID: $app_id"
    else
        echo -e "${RED}✗${NC} capacitor.config.ts 파일이 없습니다"
    fi
    
    if [ -f "public/manifest.json" ]; then
        echo -e "${GREEN}✓${NC} manifest.json 파일 존재"
        app_name=$(grep -o '"name": "[^"]*"' public/manifest.json | cut -d'"' -f4)
        echo "  App Name: $app_name"
    else
        echo -e "${RED}✗${NC} manifest.json 파일이 없습니다"
    fi
    
    if [ -d "ios" ]; then
        echo -e "${GREEN}✓${NC} iOS 프로젝트 디렉토리 존재"
    else
        echo -e "${YELLOW}!${NC} iOS 프로젝트가 아직 생성되지 않았습니다"
        echo "  'npx cap add ios' 명령어를 실행하세요"
    fi
}

setup_fastlane_match() {
    echo -e "${BLUE}Fastlane Match 초기 설정${NC}"
    echo ""
    
    if [ ! -d "ios" ]; then
        echo -e "${RED}iOS 프로젝트가 없습니다. 먼저 'npx cap add ios'를 실행하세요.${NC}"
        return
    fi
    
    cd ios || return
    
    echo "1. Bundle 의존성 설치 중..."
    bundle install
    
    echo "2. Match 초기화 중..."
    bundle exec fastlane match init
    
    echo "3. 인증서 생성 중..."
    echo "Development 인증서를 생성하시겠습니까? (y/n)"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        bundle exec fastlane match development
    fi
    
    echo "App Store 인증서를 생성하시겠습니까? (y/n)"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        bundle exec fastlane match appstore
    fi
    
    cd ..
    echo -e "${GREEN}Match 설정 완료!${NC}"
}

test_local_build() {
    echo -e "${BLUE}로컬 iOS 빌드 테스트${NC}"
    echo ""
    
    echo "1. Next.js 빌드 중..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Next.js 빌드 실패${NC}"
        return
    fi
    
    echo "2. Capacitor 동기화 중..."
    npx cap sync ios
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Capacitor 동기화 실패${NC}"
        return
    fi
    
    if [ ! -d "ios" ]; then
        echo -e "${RED}iOS 프로젝트가 없습니다.${NC}"
        return
    fi
    
    echo "3. iOS 설정 중..."
    npm run ios:setup
    
    echo "4. Xcode에서 프로젝트를 여시겠습니까? (y/n)"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        npx cap open ios
    fi
    
    echo -e "${GREEN}로컬 빌드 테스트 완료!${NC}"
}

# 메인 루프
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1) encode_google_service_plist ;;
        2) encode_api_key ;;
        3) encode_certificate ;;
        4) check_app_config ;;
        5) setup_fastlane_match ;;
        6) test_local_build ;;
        0) echo -e "${GREEN}스크립트를 종료합니다.${NC}"; exit 0 ;;
        *) echo -e "${RED}잘못된 선택입니다. 다시 선택해주세요.${NC}" ;;
    esac
done 