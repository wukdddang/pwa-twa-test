/**
 * 안전한 알림 생성 유틸리티
 * 메인 스레드와 서비스 워커 환경을 구분하여 적절한 방법으로 알림을 생성합니다.
 */

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// 서비스 워커 환경 타입 정의
interface ServiceWorkerGlobalScope {
  importScripts: (...urls: string[]) => void;
  registration: ServiceWorkerRegistration;
}

// ServiceWorkerRegistration 확장 타입
interface ServiceWorkerNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  badge?: string;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  showNotification: (title: string, options?: ServiceWorkerNotificationOptions) => Promise<void>;
}

/**
 * 현재 환경이 서비스 워커인지 확인
 */
export function isServiceWorkerContext(): boolean {
  return typeof self !== "undefined" && typeof window === "undefined" && typeof (self as unknown as ServiceWorkerGlobalScope).importScripts === "function";
}

/**
 * 현재 환경이 메인 스레드인지 확인
 */
export function isMainThreadContext(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * 환경에 맞는 방법으로 알림을 생성
 */
export async function createNotification(options: NotificationOptions): Promise<boolean> {
  const { title, body, icon, tag, data } = options;

  try {
    // 서비스 워커 환경
    if (isServiceWorkerContext()) {
      if ("registration" in self && self.registration) {
        await (self.registration as unknown as ExtendedServiceWorkerRegistration).showNotification(title, {
          body,
          icon,
          tag,
          data,
          badge: icon,
        });
        return true;
      }
      console.warn("서비스 워커에서 registration을 찾을 수 없습니다.");
      return false;
    }

    // 메인 스레드 환경
    if (isMainThreadContext()) {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon,
            tag,
            data,
          });
          return true;
        } else {
          console.warn("알림 권한이 허용되지 않았습니다:", Notification.permission);
          return false;
        }
      } else {
        console.warn("이 브라우저는 Notification API를 지원하지 않습니다.");
        return false;
      }
    }

    console.warn("알 수 없는 환경에서 알림 생성을 시도했습니다.");
    return false;
  } catch (error) {
    console.error("알림 생성 중 오류:", error);
    return false;
  }
}

/**
 * 포그라운드 알림 생성 (메인 스레드 전용)
 */
export function createForegroundNotification(options: NotificationOptions): boolean {
  if (!isMainThreadContext()) {
    console.warn("포그라운드 알림은 메인 스레드에서만 생성할 수 있습니다.");
    return false;
  }

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        data: options.data,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.warn("포그라운드 알림 생성 실패:", error);
    return false;
  }
}
