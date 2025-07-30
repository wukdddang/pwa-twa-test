import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";

// 상태바 설정
export const setupStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Default });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    } catch (error) {
      console.log("StatusBar setup error:", error);
    }
  }
};

// 스플래시 스크린 숨기기
export const hideSplashScreen = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.log("SplashScreen hide error:", error);
    }
  }
};

// 앱 상태 리스너
export const setupAppListeners = () => {
  if (Capacitor.isNativePlatform()) {
    App.addListener("appStateChange", ({ isActive }) => {
      console.log("App state changed. Is active:", isActive);
    });

    App.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }
};

// 푸시 알림 설정
export const setupPushNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    try {
      // 권한 요청
      const result = await PushNotifications.requestPermissions();

      if (result.receive === "granted") {
        // FCM 토큰 등록
        await PushNotifications.register();

        // 토큰 받기
        PushNotifications.addListener("registration", (token) => {
          console.log("Push registration success, token: " + token.value);
        });

        // 알림 수신
        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push received: ", notification);
          }
        );

        // 알림 탭 액션
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (notification) => {
            console.log("Push action performed: ", notification);
          }
        );
      }
    } catch (error) {
      console.log("Push notification setup error:", error);
    }
  }
};
