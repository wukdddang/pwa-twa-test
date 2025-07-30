"use client";

import { useEffect } from "react";
import {
  setupStatusBar,
  hideSplashScreen,
  setupAppListeners,
  setupPushNotifications,
} from "@/lib/capacitor-plugins";
import { isNativeApp } from "@/lib/firebase";

export default function CapacitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const initializeCapacitor = async () => {
      if (isNativeApp()) {
        console.log("Initializing Capacitor plugins...");

        try {
          // 상태바 설정
          await setupStatusBar();

          // 앱 리스너 설정
          setupAppListeners();

          // 푸시 알림 설정
          await setupPushNotifications();

          // 스플래시 스크린 숨기기 (약간의 지연 후)
          setTimeout(async () => {
            await hideSplashScreen();
          }, 1000);

          console.log("Capacitor plugins initialized successfully");
        } catch (error) {
          console.error("Error initializing Capacitor plugins:", error);
        }
      }
    };

    initializeCapacitor();
  }, []);

  return <>{children}</>;
}
