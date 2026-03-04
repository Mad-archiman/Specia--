/**
 * SPECIA WebAR 명함 - 인터랙션 스크립트
 * - 퀵 액션 버튼 링크 설정
 * - AR 상태에 따른 UI 업데이트
 * - 모델 로드 실패 시 데모용 샘플로 폴백
 */

// 데모용 샘플 모델 (메인 모델 로드 실패 시)
const FALLBACK_MODEL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb';

// 링크 설정 (실제 URL로 교체하세요)
const CONFIG = {
  homepage: 'https://www.specia.co.kr/',
  promoVideo: 'https://youtu.be/D5z1ZH--gNE?si=dxqNfS2KrZSbktmR',
  arServiceUrl: 'https://specia-ar-service.vercel.app/',
  webxrArPage: 'webxr-ar.html',
  longPressMs: 3000,
};

const modelViewer = document.getElementById('model-viewer');
const btnHomepage = document.getElementById('btn-homepage');
const btnVideo = document.getElementById('btn-video');

// 퀵 액션 버튼 링크 설정
btnHomepage.href = CONFIG.homepage;
btnVideo.href = CONFIG.promoVideo;
document.getElementById('btn-webxr-ar').href = CONFIG.arServiceUrl;

// 모델 3초 길게 누르면 webxr-ar 페이지로 이동
let longPressTimer = null;
let longPressCountdownInterval = null;
const longPressSpinner = document.getElementById('long-press-spinner');
const longPressCountdownEl = document.getElementById('long-press-countdown');

function clearLongPress() {
  if (longPressCountdownInterval) {
    clearInterval(longPressCountdownInterval);
    longPressCountdownInterval = null;
  }
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (longPressSpinner) longPressSpinner.classList.remove('is-active');
  if (longPressCountdownEl) longPressCountdownEl.textContent = '3';
}
function startLongPress() {
  clearLongPress();
  if (longPressSpinner) longPressSpinner.classList.add('is-active');
  if (longPressCountdownEl) longPressCountdownEl.textContent = '3';
  const durationMs = CONFIG.longPressMs;
  const stepMs = 1000;
  let remaining = Math.ceil(durationMs / stepMs);
  longPressCountdownInterval = setInterval(() => {
    remaining -= 1;
    if (longPressCountdownEl) longPressCountdownEl.textContent = String(Math.max(0, remaining));
    if (remaining <= 0 && longPressCountdownInterval) {
      clearInterval(longPressCountdownInterval);
      longPressCountdownInterval = null;
    }
  }, stepMs);
  longPressTimer = setTimeout(() => {
    if (longPressCountdownInterval) {
      clearInterval(longPressCountdownInterval);
      longPressCountdownInterval = null;
    }
    longPressTimer = null;
    if (longPressSpinner) longPressSpinner.classList.remove('is-active');
    if (longPressCountdownEl) longPressCountdownEl.textContent = '3';
    window.location.href = CONFIG.webxrArPage;
  }, durationMs);
}
modelViewer.addEventListener('touchstart', () => startLongPress(), { passive: true });
modelViewer.addEventListener('touchend', clearLongPress, { passive: true });
modelViewer.addEventListener('touchcancel', clearLongPress, { passive: true });
modelViewer.addEventListener('touchmove', clearLongPress, { passive: true });
modelViewer.addEventListener('mousedown', () => startLongPress());
modelViewer.addEventListener('mouseup', clearLongPress);
modelViewer.addEventListener('mouseleave', clearLongPress);

// 모델 로드 실패 시 폴백 (메인 .glb 없을 때)
modelViewer.addEventListener('error', () => {
  const currentSrc = (modelViewer.src || '').split('?')[0];
  if (currentSrc && !currentSrc.includes(FALLBACK_MODEL)) {
    modelViewer.src = FALLBACK_MODEL;
  }
});

// AR 세션 시작/종료 시 UI 업데이트 (선택)
modelViewer.addEventListener('ar-status', (e) => {
  const status = e.detail.status;
  if (status === 'session-started') {
    document.body.classList.add('ar-active');
  } else {
    document.body.classList.remove('ar-active');
  }
});
