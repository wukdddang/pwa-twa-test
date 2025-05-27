"use client";

import { useState, useEffect } from "react";
import { requestNotificationPermission, onMessageListener } from "@/lib/firebase";
import { createForegroundNotification } from "@/lib/utils/notification";

// PWA 설치 이벤트에 대한 타입 정의
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Navigator 인터페이스 확장
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function Home() {
  const [deviceInfo, setDeviceInfo] = useState("디바이스 정보를 불러오는 중...");
  const [installStatus, setInstallStatus] = useState("설치 상태를 확인하는 중...");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showCustomBanner, setShowCustomBanner] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("알림 권한 확인 중...");
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>("확인 중...");

  // 빌드 시간과 버전 정보 (환경 변수에서 가져오기)
  const buildTime = process.env.BUILD_TIME || "2024-01-01T00:00:00.000Z";
  const buildVersion = process.env.BUILD_VERSION || "v1.0.0";

  useEffect(() => {
    // 클라이언트 사이드 렌더링 확인
    setIsClient(true);

    // 현재 시간 업데이트
    const updateCurrentTime = () => {
      setCurrentTime(
        new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Seoul",
        })
      );
    };

    updateCurrentTime();
    const timeInterval = setInterval(updateCurrentTime, 1000);

    // 브라우저 알림 권한 상태 업데이트
    let permissionCheckInterval: NodeJS.Timeout | null = null;

    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);

      // 권한 상태 변경 감지를 위한 주기적 확인
      permissionCheckInterval = setInterval(() => {
        const currentPermission = Notification.permission;
        setBrowserPermission(currentPermission);

        // 권한이 변경되었을 때 상태 업데이트
        if (currentPermission === "denied" && notificationStatus !== "알림 권한 거부됨") {
          setNotificationStatus("알림 권한 거부됨");
          setFcmToken(null);
          localStorage.removeItem("fcm-token");
        } else if (currentPermission === "granted" && !fcmToken && notificationStatus !== "FCM 토큰 생성 실패") {
          // 권한이 허용되었지만 토큰이 없고 이전에 실패하지 않은 경우에만
          console.log("권한이 허용되었습니다. FCM 토큰을 다시 요청합니다.");
        }
      }, 2000); // 2초마다 확인
    }

    // ESC 키로 다이얼로그 닫기
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showCustomBanner) {
          setShowCustomBanner(false);
        }
        if (showIOSInstallGuide) {
          setShowIOSInstallGuide(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);

    // 디바이스 정보 표시
    setDeviceInfo(navigator.userAgent);

    // PWA 설치 상태 확인
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      setInstallStatus("설치된 앱으로 실행 중");
    } else {
      setInstallStatus("브라우저에서 실행 중");
    }

    // PWA 설치 조건 디버깅
    const checkPWAConditions = () => {
      const conditions = {
        isHttps: window.location.protocol === "https:" || window.location.hostname === "localhost",
        hasServiceWorker: "serviceWorker" in navigator,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        isChrome: /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent),
        isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        beforeInstallPromptFired: !!deferredPrompt,
        isStandalone: window.matchMedia("(display-mode: standalone)").matches,
        hasMinimalUI: window.matchMedia("(display-mode: minimal-ui)").matches,
        isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      };

      const debugText = `PWA 설치 조건 확인:
• HTTPS/localhost: ${conditions.isHttps ? "✓" : "✗"}
• 서비스 워커: ${conditions.hasServiceWorker ? "✓" : "✗"}
• 웹 매니페스트: ${conditions.hasManifest ? "✓" : "✗"}
• Chrome 브라우저: ${conditions.isChrome ? "✓" : "✗"}
• iOS Safari: ${conditions.isIOS && conditions.isSafari ? "✓" : "✗"}
• 모바일 기기: ${conditions.isMobile ? "✓" : "✗"}
• beforeinstallprompt 이벤트: ${conditions.beforeInstallPromptFired ? "✓" : "✗"}
• 이미 설치됨: ${conditions.isStandalone ? "✓" : "✗"}
• URL: ${window.location.href}

추가 정보:
• User Agent: ${navigator.userAgent}
• 화면 모드: ${window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser"}`;

      setDebugInfo(debugText);
      console.log("PWA 설치 조건:", conditions);

      // 설치 배너 비활성화
      // beforeinstallprompt가 5초 후에도 발생하지 않으면 커스텀 배너 표시
      // if (!conditions.beforeInstallPromptFired && !conditions.isStandalone) {
      //   setTimeout(() => {
      //     if (!deferredPrompt) {
      //       console.log("beforeinstallprompt 이벤트가 발생하지 않아 커스텀 배너를 표시합니다.");
      //       // iOS Safari인 경우 iOS 전용 가이드 표시
      //       if (conditions.isIOS && conditions.isSafari) {
      //         setShowIOSInstallGuide(true);
      //       } else {
      //         setShowCustomBanner(true);
      //       }
      //     }
      //   }, 5000);
      // }
    };

    checkPWAConditions();

    // FCM 초기화 및 포그라운드 메시지 리스너 설정
    const initializeFCM = async () => {
      try {
        // 알림 권한 확인
        if ("Notification" in window) {
          const permission = Notification.permission;
          console.log("초기 알림 권한 상태:", permission);
          setBrowserPermission(permission);

          if (permission === "granted") {
            // 권한이 허용되어 있어도 실제로 FCM 토큰을 생성할 수 있는지 확인
            setNotificationStatus("FCM 토큰 확인 중...");
            const result = await requestNotificationPermission();
            if (result.success && result.token) {
              setFcmToken(result.token);
              setNotificationStatus("알림 권한 허용됨");
              console.log("FCM Token 저장됨:", result.token);
              // 토큰을 로컬 스토리지에 저장
              localStorage.setItem("fcm-token", result.token);
            } else {
              console.warn("FCM 토큰 생성 실패:", result.error);
              setNotificationStatus("FCM 토큰 생성 실패");
              // 실제 권한 상태 재확인
              setBrowserPermission(Notification.permission);
            }
          } else if (permission === "denied") {
            setNotificationStatus("알림 권한 거부됨");
          } else {
            setNotificationStatus("알림 권한 요청 필요");
          }
        } else {
          setNotificationStatus("알림 지원되지 않음");
        }

        // 포그라운드 메시지 리스너
        onMessageListener()
          .then((payload: unknown) => {
            console.log("포그라운드 메시지 수신:", payload);
            // 포그라운드에서 알림 표시 (메인 스레드에서만)
            if (payload && typeof payload === "object") {
              const messagePayload = payload as { notification?: { title?: string; body?: string } };
              createForegroundNotification({
                title: messagePayload.notification?.title || "새 알림",
                body: messagePayload.notification?.body,
                icon: "/icons/icon-192x192.svg",
              });
            }
          })
          .catch((err) => console.log("포그라운드 메시지 리스너 오류:", err));
      } catch (error) {
        console.error("FCM 초기화 오류:", error);
        setNotificationStatus("FCM 초기화 실패");
      }
    };

    initializeFCM();

    // 설치 버튼 이벤트 처리
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt 이벤트 발생!", e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallStatus("설치 가능 (프롬프트 준비됨)");
      setShowCustomBanner(false); // 실제 프롬프트가 있으면 커스텀 배너 숨김
      checkPWAConditions(); // 상태 업데이트
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      clearInterval(timeInterval);
      if (permissionCheckInterval) {
        clearInterval(permissionCheckInterval);
      }
      document.removeEventListener("keydown", handleEscKey);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt, showCustomBanner, showIOSInstallGuide, fcmToken, notificationStatus]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // 브라우저별 설치 안내
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

      if (isIOS && isSafari) {
        // iOS Safari에서는 시각적 가이드 표시
        setShowIOSInstallGuide(true);
      } else if (isChrome && !isMobile) {
        alert(`데스크톱 Chrome에서 PWA 설치하기:
1. 주소창 오른쪽의 설치 아이콘(⊕)을 클릭하거나
2. 메뉴(⋮) > 앱 설치 > "TWA Test App 설치"를 선택하세요.

현재 beforeinstallprompt 이벤트가 발생하지 않았습니다.
페이지를 새로고침하거나 잠시 후 다시 시도해보세요.`);
      } else if (isMobile && isChrome) {
        alert(`모바일 Chrome에서 PWA 설치하기:
1. 메뉴(⋮) > "홈 화면에 추가"를 선택하거나
2. 하단에 나타나는 설치 배너를 사용하세요.

현재 beforeinstallprompt 이벤트가 발생하지 않았습니다.`);
      } else if (isIOS) {
        setShowIOSInstallGuide(true);
      } else {
        alert("PWA 설치를 위해 Chrome 브라우저 또는 iOS Safari를 사용해주세요.");
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`사용자 선택: ${outcome}`);
      setDeferredPrompt(null);
      setShowCustomBanner(false);
    } catch (error) {
      console.error("설치 프롬프트 오류:", error);
      alert("설치 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCheckFeaturesClick = () => {
    const features = [
      `Geolocation: ${typeof navigator.geolocation !== "undefined" ? "지원됨" : "지원되지 않음"}`,
      `Notification: ${"Notification" in window ? "지원됨" : "지원되지 않음"}`,
      `Service Worker: ${"serviceWorker" in navigator ? "지원됨" : "지원되지 않음"}`,
      `Camera: ${navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia !== "undefined" ? "지원됨" : "지원되지 않음"}`,
    ].join("\n");

    alert("지원되는 기능:\n" + features);
  };

  // 강제로 설치 프롬프트 테스트 함수 제거됨 (사용되지 않음)

  // 페이지 새로고침
  const refreshPage = () => {
    window.location.reload();
  };

  // 알림 권한 요청
  const requestNotificationPermissionHandler = async () => {
    setIsNotificationLoading(true);

    // 요청 전 현재 상태 로깅
    console.log("권한 요청 전 상태:", {
      notificationPermission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unknown",
      currentStatus: notificationStatus,
      browserPermission: browserPermission,
    });

    try {
      const result = await requestNotificationPermission();
      console.log("권한 요청 결과:", result);

      if (result.success && result.token) {
        setFcmToken(result.token);
        setNotificationStatus("알림 권한 허용됨");
        setBrowserPermission(result.permission || "granted");
        localStorage.setItem("fcm-token", result.token);
        alert("알림 권한이 허용되었습니다!\nFCM 토큰: " + result.token.substring(0, 50) + "...");
      } else {
        // 권한 상태에 따른 정확한 메시지 표시
        if (result.permission === "denied") {
          setNotificationStatus("알림 권한 거부됨");
          setBrowserPermission("denied");
          alert("알림 권한이 거부되었습니다.");
        } else if (result.permission === "default") {
          setNotificationStatus("알림 권한 요청 필요");
          setBrowserPermission("default");
          alert("알림 권한 요청이 취소되었습니다.");
        } else if (result.permission === "granted") {
          setNotificationStatus("FCM 토큰 생성 실패");
          setBrowserPermission("granted");
          alert("알림 권한은 허용되었지만 FCM 토큰 생성에 실패했습니다.\n오류: " + result.error);
        } else {
          setNotificationStatus("알림 권한 요청 실패");
          setBrowserPermission("unknown");
          alert("알림 권한 요청 중 오류가 발생했습니다.\n오류: " + result.error);
        }
      }
    } catch (error) {
      console.error("알림 권한 요청 오류:", error);
      setNotificationStatus("알림 권한 요청 실패");
      alert("알림 권한 요청 중 오류가 발생했습니다.");
    } finally {
      setIsNotificationLoading(false);
    }
  };

  // 테스트 알림 발송
  const sendTestNotification = async () => {
    if (!fcmToken) {
      alert("FCM 토큰이 없습니다. 먼저 알림 권한을 허용해주세요.");
      return;
    }

    setIsNotificationLoading(true);
    console.log("테스트 알림 발송 시작...");

    try {
      const notificationData = {
        token: fcmToken,
        title: "🔔 TWA 테스트 알림",
        message: `테스트 알림입니다! 시간: ${new Date().toLocaleTimeString("ko-KR")}`,
        data: {
          testData: "test-value",
          timestamp: Date.now().toString(),
          url: window.location.href,
        },
      };

      console.log("발송할 알림 데이터:", notificationData);

      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      const result = await response.json();
      console.log("알림 발송 응답:", result);

      if (result.success) {
        alert(
          `✅ 테스트 알림이 성공적으로 발송되었습니다!\n\n📱 알림이 표시되지 않는다면:\n1. 브라우저 알림 설정을 확인하세요\n2. 다른 탭에서 앱을 열어보세요\n3. 모바일에서는 백그라운드 상태로 전환해보세요`
        );

        // 포그라운드에서도 알림 표시 (테스트용, 메인 스레드에서만)
        createForegroundNotification({
          title: "🔔 TWA 테스트 알림",
          body: `포그라운드 테스트 알림입니다! 시간: ${new Date().toLocaleTimeString("ko-KR")}`,
          icon: "/icons/icon-192x192.svg",
          tag: "test-notification",
        });
      } else {
        console.error("알림 발송 실패:", result);
        alert(`❌ 알림 발송 실패\n\n오류: ${result.error}\n상세: ${result.details || "없음"}`);
      }
    } catch (error) {
      console.error("알림 발송 오류:", error);
      alert(`❌ 알림 발송 중 오류가 발생했습니다.\n\n오류: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsNotificationLoading(false);
    }
  };

  // 모든 저장된 토큰에 알림 발송 (시뮬레이션)
  const sendBroadcastNotification = async () => {
    const savedTokens = localStorage.getItem("fcm-token");
    if (!savedTokens) {
      alert("저장된 FCM 토큰이 없습니다.");
      return;
    }

    setIsNotificationLoading(true);
    console.log("전체 알림 발송 시작...");

    try {
      const broadcastData = {
        tokens: [savedTokens], // 실제로는 여러 토큰 배열
        title: "📢 전체 알림",
        message: `모든 사용자에게 보내는 알림입니다! ${new Date().toLocaleTimeString("ko-KR")}`,
        data: {
          type: "broadcast",
          timestamp: Date.now().toString(),
          url: window.location.href,
        },
      };

      console.log("발송할 전체 알림 데이터:", broadcastData);

      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(broadcastData),
      });

      const result = await response.json();
      console.log("전체 알림 발송 응답:", result);

      if (result.success) {
        alert(
          `✅ 전체 알림이 성공적으로 발송되었습니다!\n\n발송 결과:\n- 성공: ${result.result?.successCount || 1}개\n- 실패: ${
            result.result?.failureCount || 0
          }개`
        );

        // 포그라운드에서도 알림 표시 (테스트용, 메인 스레드에서만)
        createForegroundNotification({
          title: "📢 전체 알림",
          body: `전체 사용자 알림입니다! 시간: ${new Date().toLocaleTimeString("ko-KR")}`,
          icon: "/icons/icon-192x192.svg",
          tag: "broadcast-notification",
        });
      } else {
        console.error("전체 알림 발송 실패:", result);
        alert(`❌ 전체 알림 발송 실패\n\n오류: ${result.error}\n상세: ${result.details || "없음"}`);
      }
    } catch (error) {
      console.error("전체 알림 발송 오류:", error);
      alert(`❌ 전체 알림 발송 중 오류가 발생했습니다.\n\n오류: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsNotificationLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 설치 다이얼로그 모달 */}
      {showCustomBanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
          onClick={(e) => {
            // 배경 클릭 시 다이얼로그 닫기
            if (e.target === e.currentTarget) {
              setShowCustomBanner(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-slideUp">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-center mb-2 text-gray-800 dark:text-white">앱 설치하기</h3>

            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">이 앱을 홈 화면에 설치하여 더 빠르고 편리하게 사용하세요!</p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomBanner(false)}
                className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
              >
                나중에
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                설치하기
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">ESC 키를 눌러 닫을 수 있습니다</p>
          </div>
        </div>
      )}

      {/* iOS Safari 설치 가이드 모달 */}
      {showIOSInstallGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIOSInstallGuide(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-slideUp">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🍎</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-center mb-2 text-gray-800 dark:text-white">iOS에서 앱 설치하기</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">1. 공유 버튼 탭</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">하단의 공유 버튼(📤)을 탭하세요</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">➕</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">2. &quot;홈 화면에 추가&quot; 선택</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">메뉴에서 &quot;홈 화면에 추가&quot;를 찾아 탭하세요</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">3. &quot;추가&quot; 버튼 탭</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">앱 이름을 확인하고 &quot;추가&quot;를 탭하세요</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              확인했습니다
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">설치 후 홈 화면에서 앱을 실행할 수 있습니다</p>
          </div>
        </div>
      )}

      <main className="flex flex-col items-center max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">TWA 테스트 애플리케이션</h1>

        {/* 업데이트 시간 정보 */}
        <div className="w-full p-3 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <h3 className="text-sm font-medium mb-2 text-indigo-700 dark:text-indigo-300">버전 정보</h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>
              빌드 시간:{" "}
              {new Date(buildTime).toLocaleString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Seoul",
              })}
            </div>
            <div>현재 시간: {isClient ? currentTime : "로딩 중..."}</div>
            <div className="text-indigo-600 dark:text-indigo-400">버전: {buildVersion}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              마지막 새로고침:{" "}
              {isClient
                ? new Date().toLocaleString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "로딩 중..."}
            </div>
          </div>
        </div>

        <div className="w-full p-4 mb-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">Trusted Web Activity 정보</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            이 앱은 PWA 및 TWA 테스트를 위해 설계되었습니다. Android에서 TWA로 설치하여 네이티브 앱처럼 실행할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <h3 className="text-md font-medium mb-2 text-green-700 dark:text-green-300">디바이스 정보</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400" id="device-info">
              {deviceInfo}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <h3 className="text-md font-medium mb-2 text-purple-700 dark:text-purple-300">설치 상태</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400" id="install-status">
              {installStatus}
            </p>
          </div>
        </div>

        {/* FCM 알림 상태 */}
        <div className="w-full p-4 mb-6 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-orange-700 dark:text-orange-300">🔔 푸시 알림 상태</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              상태: <span className="font-medium">{notificationStatus}</span>
            </p>

            {/* 권한 거부됨 상태일 때 도움말 표시 */}
            {notificationStatus === "알림 권한 거부됨" && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">⚠️ 알림 권한이 거부되었습니다</p>
                <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  <p>
                    <strong>Chrome에서 권한 재설정 방법:</strong>
                  </p>
                  <p>1. 주소창 왼쪽 🔒 아이콘 클릭</p>
                  <p>2. &quot;알림&quot; 설정을 &quot;허용&quot;으로 변경</p>
                  <p>3. 페이지 새로고침 후 다시 시도</p>
                </div>
              </div>
            )}

            {fcmToken && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <p className="mb-1">FCM 토큰:</p>
                <p className="break-all bg-gray-100 dark:bg-gray-700 p-2 rounded font-mono">{fcmToken.substring(0, 50)}...</p>
              </div>
            )}

            {/* 현재 브라우저 알림 권한 상태 표시 */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>
                브라우저 알림 권한: <span className="font-mono">{browserPermission}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          {/* 앱 설치하기 버튼 숨김 */}
          {/* <button
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            id="install-button"
            onClick={handleInstallClick}
          >
            앱 설치하기
          </button> */}
          <button
            className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
            id="check-features"
            onClick={handleCheckFeaturesClick}
          >
            기능 확인하기
          </button>
          {/* 설치 프롬프트 강제 실행 버튼 숨김 */}
          {/* <button className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors" onClick={forceInstallPrompt}>
            설치 프롬프트 강제 실행
          </button> */}

          {/* FCM 알림 버튼들 */}
          <div className="w-full border-t pt-3 mt-3">
            <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">🔔 푸시 알림 테스트</h3>
            <div className="space-y-2">
              {!fcmToken ? (
                <button
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                  onClick={requestNotificationPermissionHandler}
                  disabled={isNotificationLoading}
                >
                  {isNotificationLoading ? "처리 중..." : "🔔 알림 권한 요청"}
                </button>
              ) : (
                <>
                  <button
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    onClick={sendTestNotification}
                    disabled={isNotificationLoading}
                  >
                    {isNotificationLoading ? "발송 중..." : "📱 테스트 알림 발송"}
                  </button>
                  <button
                    className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    onClick={sendBroadcastNotification}
                    disabled={isNotificationLoading}
                  >
                    {isNotificationLoading ? "발송 중..." : "📢 전체 알림 발송"}
                  </button>
                </>
              )}
            </div>
          </div>

          <button className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors" onClick={refreshPage}>
            🔄 페이지 새로고침
          </button>

          <button
            className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
            onClick={() => {
              const currentPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unknown";
              const debugInfo = {
                browserPermission: currentPermission,
                statePermission: browserPermission,
                notificationStatus: notificationStatus,
                fcmToken: fcmToken ? "있음" : "없음",
                localStorage: localStorage.getItem("fcm-token") ? "있음" : "없음",
              };
              console.log("권한 상태 디버깅:", debugInfo);
              alert(`권한 상태 디버깅:\n${JSON.stringify(debugInfo, null, 2)}`);
            }}
          >
            🔍 권한 상태 확인
          </button>

          <button
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            onClick={async () => {
              try {
                const response = await fetch("/api/send-notification", {
                  method: "GET",
                });
                const result = await response.json();
                console.log("API 상태:", result);
                alert(
                  `🔧 API 상태 확인:\n\n${result.message}\n\n사용 가능한 엔드포인트:\n- POST: ${result.endpoints?.POST}\n\n필수 파라미터:\n- title: ${result.endpoints?.body?.title}\n- message: ${result.endpoints?.body?.message}\n- token 또는 tokens 필요`
                );
              } catch (error) {
                console.error("API 상태 확인 오류:", error);
                alert(`❌ API 상태 확인 실패:\n${error instanceof Error ? error.message : String(error)}`);
              }
            }}
          >
            🔧 API 상태 확인
          </button>

          <button
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            onClick={async () => {
              try {
                // Android 푸시 알림 디버깅 정보 수집
                const debugInfo: Record<string, unknown> = {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  isAndroid: /Android/i.test(navigator.userAgent),
                  isChrome: /Chrome/i.test(navigator.userAgent),
                  notificationPermission: "Notification" in window ? Notification.permission : "not supported",
                  serviceWorkerSupport: "serviceWorker" in navigator,
                  pushManagerSupport: "PushManager" in window,
                  fcmToken: fcmToken ? "present" : "missing",
                  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? "configured" : "missing",
                  manifestUrl: "/manifest.json",
                  swUrl: "/sw.js",
                };

                // 서비스 워커 상태 확인
                if ("serviceWorker" in navigator) {
                  try {
                    const registration = await navigator.serviceWorker.getRegistration();
                    debugInfo.swRegistration = registration
                      ? {
                          scope: registration.scope,
                          state: registration.active?.state,
                          onupdatefound: registration.onupdatefound ? "present" : "none",
                        }
                      : "not registered";
                  } catch (swError) {
                    debugInfo.swRegistration = `error: ${swError instanceof Error ? swError.message : String(swError)}`;
                  }
                }

                // Push Manager 상태 확인
                if ("serviceWorker" in navigator && "PushManager" in window) {
                  try {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration) {
                      const subscription = await registration.pushManager.getSubscription();
                      debugInfo.pushSubscription = subscription ? "active" : "none";
                    }
                  } catch (pushError) {
                    debugInfo.pushSubscription = `error: ${pushError instanceof Error ? pushError.message : String(pushError)}`;
                  }
                }

                console.log("Android 푸시 알림 디버깅:", debugInfo);

                const debugText = Object.entries(debugInfo)
                  .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
                  .join("\n");

                alert(`🤖 Android 푸시 알림 디버깅 정보:\n\n${debugText}`);
              } catch (error) {
                console.error("디버깅 정보 수집 오류:", error);
                alert(`❌ 디버깅 정보 수집 실패:\n${error instanceof Error ? error.message : String(error)}`);
              }
            }}
          >
            🤖 Android 디버깅 정보
          </button>
        </div>

        {/* 디버깅 정보 표시 */}
        <div className="w-full mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">PWA 설치 디버깅 정보</h3>
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      </main>

      <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>© 2024 TWA 테스트 애플리케이션</p>
      </footer>
    </div>
  );
}
