import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 설정 디버깅
console.log("Firebase 설정 상태:", {
  apiKey: firebaseConfig.apiKey ? "설정됨" : "누락",
  authDomain: firebaseConfig.authDomain ? "설정됨" : "누락",
  projectId: firebaseConfig.projectId ? "설정됨" : "누락",
  storageBucket: firebaseConfig.storageBucket ? "설정됨" : "누락",
  messagingSenderId: firebaseConfig.messagingSenderId ? "설정됨" : "누락",
  appId: firebaseConfig.appId ? "설정됨" : "누락",
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? "설정됨" : "누락",
});

// 필수 환경 변수 확인
const missingEnvVars = [];
if (!firebaseConfig.apiKey) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
if (!firebaseConfig.authDomain) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (!firebaseConfig.projectId) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (!firebaseConfig.messagingSenderId) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
if (!firebaseConfig.appId) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_APP_ID");
if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) missingEnvVars.push("NEXT_PUBLIC_FIREBASE_VAPID_KEY");

if (missingEnvVars.length > 0) {
  console.error("누락된 Firebase 환경 변수:", missingEnvVars);
}

const app = initializeApp(firebaseConfig);

let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== "undefined") {
  messaging = getMessaging(app);
}

export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.error("Firebase messaging이 초기화되지 않았습니다.");
    return { success: false, error: "Firebase messaging not initialized", permission: null, token: null };
  }

  // VAPID 키 확인
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    console.error("VAPID 키가 설정되지 않았습니다.");
    return { success: false, error: "VAPID key not configured", permission: null, token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("알림 권한 요청 결과:", permission);

    if (permission === "granted") {
      // 기존 서비스 워커 사용 (layout.tsx에서 이미 등록됨)
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log("기존 서비스 워커 사용:", registration.scope);
        } else {
          console.warn("서비스 워커가 등록되지 않았습니다.");
        }
      } catch (swError) {
        console.warn("서비스 워커 확인 실패:", swError);
      }

      try {
        // 기존 서비스 워커 사용
        const registration = await navigator.serviceWorker.getRegistration();

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration || undefined,
        });

        if (token) {
          console.log("FCM Token 생성 성공:", token);
          return { success: true, permission, token, error: null };
        } else {
          console.error("FCM 토큰 생성 실패: 토큰이 null입니다.");
          return { success: false, permission, token: null, error: "FCM token generation failed" };
        }
      } catch (tokenError) {
        console.error("FCM 토큰 생성 중 오류:", tokenError);
        return { success: false, permission, token: null, error: `FCM token error: ${tokenError}` };
      }
    } else if (permission === "denied") {
      console.log("사용자가 알림 권한을 거부했습니다.");
      return { success: false, permission, token: null, error: "Permission denied by user" };
    } else {
      console.log("알림 권한이 기본값(default)입니다.");
      return { success: false, permission, token: null, error: "Permission is default" };
    }
  } catch (error) {
    console.error("알림 권한 요청 중 오류:", error);
    return { success: false, permission: null, token: null, error: `Permission request failed: ${error}` };
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("포그라운드 메시지 수신:", payload);
      resolve(payload);
    });
  });

export { messaging };
