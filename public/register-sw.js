// 서비스 워커 등록 (중복 등록 방지)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // 이미 등록된 서비스 워커가 있는지 확인
            const existingRegistration = await navigator.serviceWorker.getRegistration();

            if (existingRegistration) {
                console.log('기존 Service Worker 사용:', existingRegistration.scope);
                return;
            }

            // 새로 등록
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker 등록 성공:', registration.scope);

        } catch (error) {
            console.log('Service Worker 등록 실패:', error);
        }
    });
} 