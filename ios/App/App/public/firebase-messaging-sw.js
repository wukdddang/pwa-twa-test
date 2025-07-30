// Firebase 기본 서비스 워커 파일
// 실제 FCM 기능은 /sw.js에서 처리됩니다.

console.log('Firebase 기본 서비스 워커 로드됨 - 통합 서비스 워커로 리다이렉트');

// 통합 서비스 워커 import
importScripts('/sw.js'); 