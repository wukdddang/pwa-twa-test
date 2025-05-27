# TWA 테스트 애플리케이션

PWA(Progressive Web App) 및 TWA(Trusted Web Activity) 기능을 테스트하기 위한 Next.js 애플리케이션입니다. FCM(Firebase Cloud Messaging)을 통한 푸시 알림 기능이 포함되어 있습니다.

## 주요 기능

- ✅ PWA 설치 기능 (Android, iOS)
- ✅ FCM 푸시 알림
- ✅ 서비스 워커 지원
- ✅ 오프라인 캐싱
- ✅ 반응형 디자인

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. 프로젝트 설정에서 웹 앱 추가
3. Cloud Messaging 설정에서 VAPID 키 생성
4. 서비스 계정 키 생성 (Admin SDK용)

### 3. 환경 변수 설정

`env.example` 파일을 참고하여 `.env.local` 파일을 생성하고 Firebase 설정값을 입력하세요:

```bash
cp env.example .env.local
```

### 4. Firebase 서비스 워커 설정

`public/firebase-messaging-sw.js` 파일에서 Firebase 설정값을 실제 값으로 변경하세요.

### 5. 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

## 사용 방법

### PWA 설치 테스트

1. 모바일 기기에서 앱에 접속
2. "앱 설치하기" 버튼 클릭
3. Android: Chrome에서 "홈 화면에 추가"
4. iOS: Safari에서 공유 버튼 → "홈 화면에 추가"

### FCM 푸시 알림 테스트

1. "🔔 알림 권한 요청" 버튼 클릭하여 권한 허용
2. "📱 테스트 알림 발송" 버튼으로 개별 알림 테스트
3. "📢 전체 알림 발송" 버튼으로 브로드캐스트 알림 테스트

## API 엔드포인트

### POST /api/send-notification

FCM을 통해 푸시 알림을 발송합니다.

```json
{
  "token": "FCM_TOKEN", // 단일 토큰
  "tokens": ["TOKEN1", "TOKEN2"], // 다중 토큰 (선택사항)
  "title": "알림 제목",
  "message": "알림 내용",
  "data": {
    // 선택사항
    "key": "value"
  }
}
```

## 파일 구조

```
src/
├── app/
│   ├── api/send-notification/route.ts  # FCM 알림 발송 API
│   ├── page.tsx                        # 메인 페이지
│   └── layout.tsx                      # 레이아웃
├── lib/
│   ├── firebase.ts                     # Firebase 클라이언트 설정
│   └── firebase-admin.ts               # Firebase Admin SDK 설정
public/
├── firebase-messaging-sw.js            # FCM 서비스 워커
├── sw.js                              # PWA 서비스 워커
└── manifest.json                      # PWA 매니페스트
```

## 주의사항

1. **HTTPS 필수**: PWA와 FCM은 HTTPS 환경에서만 작동합니다 (localhost 제외)
2. **Firebase 설정**: 실제 Firebase 프로젝트 설정값으로 교체 필요
3. **서비스 워커**: `firebase-messaging-sw.js`의 Firebase 설정값 업데이트 필요
4. **브라우저 지원**: Chrome, Firefox, Safari에서 테스트 권장

## 배포

Vercel, Netlify 등의 플랫폼에 배포할 때 환경 변수를 설정해야 합니다.

### Vercel 배포

```bash
npm run build
vercel --prod
```

환경 변수는 Vercel 대시보드에서 설정하세요.
