# 📱 GitHub Actions를 사용한 iOS 자동 배포 가이드

## 📋 사전 요구사항

### 1. Apple Developer 계정

- Apple Developer Program 가입 (연간 $99)
- App Store Connect 접근 권한

### 2. 필요한 설정

- Bundle ID: `com.example.twatest`
- App Store Connect에서 앱 등록
- 프로비저닝 프로필 및 인증서 설정

## 🔧 GitHub Secrets 설정

GitHub 레포지토리의 Settings > Secrets and variables > Actions에서 다음 secrets를 추가하세요:

### Firebase 관련

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
GOOGLE_SERVICE_INFO_PLIST (Base64 인코딩된 GoogleService-Info.plist 파일)
```

### Apple Developer 관련

```
APPLE_ID_EMAIL                    # Apple ID 이메일
APPLE_ID_PASSWORD                 # App-specific password (2FA용)
APPLE_TEAM_ID                     # Apple Developer Team ID
APPSTORE_KEY_ID                   # App Store Connect API Key ID
APPSTORE_ISSUER_ID                # App Store Connect Issuer ID
APPSTORE_PRIVATE_KEY              # App Store Connect Private Key (Base64)
```

### Fastlane Match 관련 (권장)

```
MATCH_GIT_URL                     # 인증서 저장용 private repository
MATCH_PASSWORD                    # Match encryption password
```

### 대안: 수동 인증서 관리

```
APPLE_CERTIFICATES_P12            # Base64 인코딩된 .p12 인증서
APPLE_CERTIFICATES_PASSWORD       # .p12 파일 비밀번호
```

## 🚀 배포 방법

### 방법 1: 자동 배포 (Push 시)

`main` 브랜치에 코드를 push하면 자동으로 빌드가 시작됩니다.

### 방법 2: 수동 배포

1. GitHub 레포지토리의 Actions 탭으로 이동
2. "iOS 배포 (Fastlane)" 워크플로우 선택
3. "Run workflow" 클릭
4. 빌드 타입 선택:
   - `beta`: TestFlight 배포
   - `release`: App Store 배포

## 📚 Apple Developer 설정 가이드

### 1. App Store Connect API 키 생성

1. [App Store Connect](https://appstoreconnect.apple.com) 로그인
2. Users and Access > Keys 탭
3. "Generate API Key" 클릭
4. Key Name 입력, Developer 권한 선택
5. 다운로드된 `.p8` 파일을 Base64로 인코딩하여 `APPSTORE_PRIVATE_KEY`에 설정

### 2. Bundle ID 설정

1. [Apple Developer Portal](https://developer.apple.com) 로그인
2. Certificates, Identifiers & Profiles > Identifiers
3. "Register a New Identifier" 클릭
4. App IDs 선택
5. Bundle ID: `com.example.twatest` 입력
6. 필요한 Capabilities 선택 (Push Notifications 등)

### 3. App Store Connect에서 앱 등록

1. App Store Connect > My Apps
2. "+" 버튼 클릭하여 새 앱 추가
3. Platform: iOS 선택
4. Bundle ID: `com.example.twatest` 선택
5. App 정보 입력

## 🔒 Match를 사용한 인증서 관리 (권장)

### 1. 인증서 저장용 Private Repository 생성

```bash
# GitHub에서 새 private repository 생성
# 예: your-username/ios-certificates
```

### 2. 로컬에서 Match 초기 설정

```bash
cd ios
bundle install
bundle exec fastlane match init
```

### 3. 인증서 생성 및 업로드

```bash
# Development 인증서
bundle exec fastlane match development

# App Store 인증서
bundle exec fastlane match appstore
```

## 🏗️ 로컬 빌드 테스트

GitHub Actions 실행 전에 로컬에서 테스트:

```bash
# 1. 프로젝트 빌드
npm run build
npx cap sync ios

# 2. iOS 디렉토리로 이동
cd ios

# 3. 의존성 설치
bundle install

# 4. CocoaPods 설치
cd App && pod install && cd ..

# 5. Fastlane 실행
bundle exec fastlane beta
```

## 📋 체크리스트

배포 전 확인사항:

- [ ] Apple Developer Program 가입
- [ ] Bundle ID 등록 (`com.example.twatest`)
- [ ] App Store Connect에서 앱 생성
- [ ] Firebase iOS 앱 설정 완료
- [ ] `GoogleService-Info.plist` 파일 획득
- [ ] GitHub Secrets 모두 설정
- [ ] Match 저장소 설정 (권장)
- [ ] 로컬 빌드 테스트 완료

## 🛠️ 문제 해결

### 일반적인 오류

1. **인증서 오류**

   - Match를 사용하여 인증서 동기화
   - Apple Developer Portal에서 인증서 상태 확인

2. **빌드 오류**

   - Xcode 버전 확인 (최신 버전 권장)
   - CocoaPods 의존성 업데이트

3. **Firebase 오류**
   - `GoogleService-Info.plist` 파일 경로 확인
   - Firebase 프로젝트 설정 검증

### 유용한 명령어

```bash
# Capacitor 상태 확인
npx cap doctor

# iOS 시뮬레이터에서 실행
npx cap run ios

# Fastlane 명령어 목록
bundle exec fastlane lanes
```

## 📞 지원

- [Capacitor 문서](https://capacitorjs.com/docs)
- [Fastlane 문서](https://docs.fastlane.tools)
- [Apple Developer 문서](https://developer.apple.com/documentation/)

---

**주의**: Apple의 정책과 도구가 자주 변경되므로, 최신 공식 문서를 참조하시기 바랍니다.
