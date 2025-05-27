import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// 환경 변수 검증
const requiredEnvVars = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
};

// 환경 변수가 모두 설정되어 있는지 확인
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(`Firebase Admin SDK 환경 변수가 설정되지 않음: ${missingVars.join(", ")}`);
}

let app: ReturnType<typeof initializeApp> | null = null;
let adminMessaging: ReturnType<typeof getMessaging> | null = null;

// 모든 환경 변수가 설정된 경우에만 초기화
if (requiredEnvVars.projectId && requiredEnvVars.clientEmail && requiredEnvVars.privateKey) {
  try {
    const firebaseAdminConfig = {
      credential: cert({
        projectId: requiredEnvVars.projectId,
        clientEmail: requiredEnvVars.clientEmail,
        privateKey: requiredEnvVars.privateKey.replace(/\\n/g, "\n"),
      }),
    };

    // Firebase Admin 앱이 이미 초기화되었는지 확인
    app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
    adminMessaging = getMessaging(app);
    console.log("Firebase Admin SDK 초기화 성공");
  } catch (error) {
    console.error("Firebase Admin SDK 초기화 실패:", error);
  }
}

export { adminMessaging };

export const sendNotificationToToken = async (token: string, title: string, body: string, data?: Record<string, string>) => {
  if (!adminMessaging) {
    console.error("Firebase Admin SDK가 초기화되지 않았습니다.");
    return { success: false, error: "Firebase Admin SDK not initialized" };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
      webpush: {
        fcmOptions: {
          link: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      },
    };

    const response = await adminMessaging.send(message);
    console.log("알림 발송 성공:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("알림 발송 실패:", error);
    return { success: false, error: error };
  }
};

export const sendNotificationToMultipleTokens = async (tokens: string[], title: string, body: string, data?: Record<string, string>) => {
  if (!adminMessaging) {
    console.error("Firebase Admin SDK가 초기화되지 않았습니다.");
    return { success: false, error: "Firebase Admin SDK not initialized" };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
      webpush: {
        fcmOptions: {
          link: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      },
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    console.log("다중 알림 발송 결과:", response);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error("다중 알림 발송 실패:", error);
    return { success: false, error: error };
  }
};
