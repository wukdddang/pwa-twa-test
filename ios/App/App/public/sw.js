// 서비스 워커 버전
const CACHE_NAME = 'twa-test-v1';

// 캐시할 파일 목록
const urlsToCache = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // 각 URL을 개별적으로 캐시하여 에러 방지
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                            return null;
                        });
                    })
                );
            })
            .then(() => {
                console.log('Cache installation completed');
                // 즉시 활성화
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Cache installation failed:', err);
            })
    );
});

// 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
    // POST 요청이나 Firebase API 요청은 캐시하지 않음
    if (event.request.method !== 'GET' ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에서 찾으면 캐시된 응답 반환
                if (response) {
                    return response;
                }

                // 캐시에 없으면 네트워크에서 가져옴
                return fetch(event.request)
                    .then((response) => {
                        // 응답이 유효하지 않으면 그냥 반환
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 응답을 복제해서 캐시에 저장
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});

// 이전 캐시 정리
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        Promise.all([
            // 이전 캐시 정리
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 클라이언트 제어 시작
            self.clients.claim()
        ])
    );
});

// Firebase Cloud Messaging 설정
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase 설정 (실제 값으로 교체 필요)
const firebaseConfig = {
    apiKey: "your_api_key_here",
    authDomain: "your_project_id.firebaseapp.com",
    projectId: "your_project_id",
    storageBucket: "your_project_id.appspot.com",
    messagingSenderId: "your_sender_id",
    appId: "your_app_id"
};

// Firebase 초기화 (환경 변수가 설정된 경우에만)
if (firebaseConfig.apiKey !== "your_api_key_here") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // 백그라운드 메시지 처리
    messaging.onBackgroundMessage((payload) => {
        console.log('백그라운드 메시지 수신:', payload);

        const notificationTitle = payload.notification?.title || '새 알림';
        const notificationOptions = {
            body: payload.notification?.body || '새로운 메시지가 도착했습니다.',
            icon: '/icons/icon-192x192.svg',
            badge: '/icons/icon-192x192.svg',
            tag: 'fcm-notification',
            data: payload.data || {},
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: '열기',
                    icon: '/icons/icon-192x192.svg'
                },
                {
                    action: 'close',
                    title: '닫기'
                }
            ]
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// 알림 클릭 처리 (개선된 버전)
self.addEventListener('notificationclick', (event) => {
    console.log('알림 클릭됨:', event);

    const notification = event.notification;
    const action = event.action;

    notification.close();

    if (action === 'close') {
        // 닫기 액션 - 아무것도 하지 않음
        return;
    }

    // 앱 열기 (기본 액션 또는 '열기' 액션)
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // 이미 열린 창이 있는지 확인
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    console.log('기존 창에 포커스');
                    return client.focus();
                }
            }

            // 새 창 열기
            if (clients.openWindow) {
                console.log('새 창 열기');
                const urlToOpen = notification.data?.url || '/';
                return clients.openWindow(urlToOpen);
            }
        }).catch(err => {
            console.error('알림 클릭 처리 오류:', err);
        })
    );
});

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
    console.log('알림 닫힘:', event);
    // 필요시 분석 데이터 전송
});

// 푸시 이벤트 처리 (FCM 외의 푸시도 처리)
self.addEventListener('push', (event) => {
    console.log('푸시 이벤트 수신:', event);

    if (event.data) {
        try {
            const payload = event.data.json();
            console.log('푸시 데이터:', payload);

            const notificationTitle = payload.notification?.title || payload.title || '새 알림';
            const notificationOptions = {
                body: payload.notification?.body || payload.body || '새로운 메시지가 도착했습니다.',
                icon: payload.notification?.icon || '/icons/icon-192x192.svg',
                badge: '/icons/icon-192x192.svg',
                tag: payload.tag || 'push-notification',
                data: payload.data || payload,
                requireInteraction: true,
                silent: false,
                vibrate: [200, 100, 200]
            };

            event.waitUntil(
                self.registration.showNotification(notificationTitle, notificationOptions)
            );
        } catch (error) {
            console.error('푸시 데이터 파싱 오류:', error);
            // 기본 알림 표시
            event.waitUntil(
                self.registration.showNotification('새 알림', {
                    body: '새로운 메시지가 도착했습니다.',
                    icon: '/icons/icon-192x192.svg',
                    tag: 'default-notification'
                })
            );
        }
    }
});

console.log('통합 서비스 워커 설정 완료'); 