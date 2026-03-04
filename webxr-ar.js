/**
 * WebXR AR App - Three.js
 * - immersive-ar session
 * - Hit-test for tap-to-place
 * - 3D business card model
 * - DOM overlay with link buttons
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 설정
const CONFIG = {
  // 루트 기준 절대 경로 (파일명에 한글이 있으면 로드 시 encodeURI 사용)
  modelUrl: '/models/specia 명함.glb',
  fallbackModelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb',
  homepageUrl: 'https://www.specia.co.kr/',
  promoVideoUrl: 'https://youtu.be/D5z1ZH--gNE?si=dxqNfS2KrZSbktmR',
  modelScale: 1.5,
  // AR 시작 시 모델을 'local' 공간에 고정 (핸드폰 이동해도 모델은 그 자리 유지)
  fixedPosition: { x: 0, y: -0.4, z: -1.2 },
  // 제자리 회전 속도 (라디안/초, 양수=시계 반대방향)
  modelRotateSpeed: 0.4,
};

let camera, scene, renderer;
let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let placedObject = null;
let modelTemplate = null;
let xrSession = null;
let isStartingAR = false;
let lastAnimateTime = 0;
/** 터치/마우스가 눌려 있는 동안 회전 일시정지 */
let isTouchActive = false;
/** 재생/일시정지 버튼으로 회전 일시정지 (true = 일시정지) */
let isRotationPaused = false;
/** true면 모델을 AR 시작 위치에만 고정하고 탭으로 이동 불가 */
const FIX_MODEL_AT_START = true;

const container = document.getElementById('canvas-container');
const splash = document.getElementById('splash');
const btnStartAr = document.getElementById('btn-start-ar');
const arOverlay = document.getElementById('ar-overlay');
const btnCloseAr = document.getElementById('btn-close-ar');
const btnPlayPause = document.getElementById('btn-play-pause');

// 링크 버튼 설정 (AR 오버레이에서 홈/영상 버튼 제거됨)

// 모바일 감지
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

// 초기화
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement);

  // 터치/마우스 중에는 모델 회전 일시정지
  const canvas = renderer.domElement;
  canvas.addEventListener('touchstart', () => { isTouchActive = true; }, { passive: true });
  canvas.addEventListener('touchend', (e) => { if (e.touches.length === 0) isTouchActive = false; }, { passive: true });
  canvas.addEventListener('touchcancel', (e) => { if (e.touches.length === 0) isTouchActive = false; }, { passive: true });
  canvas.addEventListener('mousedown', () => { isTouchActive = true; });
  canvas.addEventListener('mouseup', () => { isTouchActive = false; });
  canvas.addEventListener('mouseleave', () => { isTouchActive = false; });

  // 리틱 (배치 위치 표시) - 고정 모드에서는 사용 안 함
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x6366f1 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // 컨트롤러 (탭 감지 - 고정 모드가 아닐 때만 탭으로 위치 변경)
  const controller1 = renderer.xr.getController(0);
  controller1.addEventListener('select', onSelect);
  scene.add(controller1);

  const controller2 = renderer.xr.getController(1);
  controller2.addEventListener('select', onSelect);
  scene.add(controller2);

  // 3D 모델 로드
  // 기본 배치용 임시 모델(명함 교체 전까지 사용)
  modelTemplate = createPlaceholderCard();
  loadModel();

  window.addEventListener('resize', onWindowResize);
}

// 배치용 임시 카드 모델 (나중에 명함 GLB로 교체)
function createPlaceholderCard() {
  // 명함 비율(가로:세로 ≈ 1:1.6)의 얇은 박스, modelScale 적용 후 보기 좋은 크기
  const w = 0.18, h = 0.28, d = 0.01;
  const card = new THREE.Group();
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.1,
    roughness: 0.6,
  });
  const mesh = new THREE.Mesh(geometry, material);
  card.add(mesh);
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x6366f1 });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  card.add(edges);
  return card;
}

// 3D 명함 모델 로드 (성공 시 임시 모델 대체)
function loadModel() {
  const loader = new GLTFLoader();
  // 한글/공백 포함 파일명은 URL 인코딩 후 요청
  const url = encodeURI(CONFIG.modelUrl);
  loader.load(
    url,
    (gltf) => {
      modelTemplate = gltf.scene;
      modelTemplate.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    },
    undefined,
    () => {
      loader.load(CONFIG.fallbackModelUrl, (gltf) => {
        modelTemplate = gltf.scene;
      });
    }
  );
}

// AR 세션 시작
async function startARSession() {
  if (isStartingAR || xrSession) return;
  isStartingAR = true;

  // 즉시 반응 보이기
  const btn = btnStartAr;
  const origText = btn.textContent;
  btn.textContent = 'AR 시작 중...';
  btn.disabled = true;

  const resetButton = () => {
    btn.textContent = origText;
    btn.disabled = false;
  };

  if (!navigator.xr) {
    isStartingAR = false;
    resetButton();
    alert('이 브라우저는 WebXR을 지원하지 않습니다. Android Chrome 또는 iOS Safari를 사용해주세요.');
    return;
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    isStartingAR = false;
    resetButton();
    alert('AR을 지원하지 않는 기기입니다.');
    return;
  }

  const sessionInit = {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: arOverlay },
  };

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
  } catch (err) {
    isStartingAR = false;
    resetButton();
    if (err.name === 'SecurityError') {
      alert('AR 시작에 사용자 제스처가 필요합니다. 화면을 탭해주세요.');
    } else {
      alert('AR을 시작할 수 없습니다: ' + (err.message || err));
    }
    return;
  }

  resetButton();
  isStartingAR = false;

  xrSession.addEventListener('end', onSessionEnded);

  splash.classList.add('hidden');
  arOverlay.style.display = 'flex';

  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(xrSession);

  // 모델을 AR 시작 시점의 'local' 공간 한 위치에 고정 (핸드폰을 움직여도 모델은 그 자리에 유지)
  placeModelAtDefaultPosition();
}

// AR 세션 종료
function onSessionEnded() {
  splash.classList.remove('hidden');
  arOverlay.style.display = 'none';
  hitTestSourceRequested = false;
  hitTestSource = null;
  xrSession = null;
}

// 기본 위치에 모델 배치 (AR 시작 시 한 번만 배치, world 고정, 그룹 중심 기준 회전)
function placeModelAtDefaultPosition() {
  if (!modelTemplate) return;
  if (placedObject) {
    scene.remove(placedObject);
  }
  const model = modelTemplate.clone();
  model.scale.setScalar(CONFIG.modelScale);
  model.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.sub(center);

  const group = new THREE.Group();
  group.position.set(CONFIG.fixedPosition.x, CONFIG.fixedPosition.y, CONFIG.fixedPosition.z);
  group.add(model);
  scene.add(group);
  placedObject = group;
}

function onSelect() {
  if (FIX_MODEL_AT_START) return;
  if (!reticle.visible || !modelTemplate) return;

  if (placedObject) {
    scene.remove(placedObject);
  }

  const model = modelTemplate.clone();
  reticle.matrix.decompose(model.position, model.quaternion, model.scale);
  model.scale.setScalar(CONFIG.modelScale);
  scene.add(model);
  placedObject = model;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(timestamp, frame) {
  const dt = lastAnimateTime ? (timestamp - lastAnimateTime) / 1000 : 0;
  lastAnimateTime = timestamp;

  if (placedObject && dt > 0 && !isTouchActive && !isRotationPaused) {
    placedObject.rotation.y += CONFIG.modelRotateSpeed * dt;
  }

  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!FIX_MODEL_AT_START && !hitTestSourceRequested && session) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        return session.requestHitTestSource({ space: viewerSpace });
      }).then((source) => {
        hitTestSource = source;
      }).catch(console.warn);

      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (!FIX_MODEL_AT_START && hitTestSource && referenceSpace) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

// 전역에 노출 (인라인 스크립트에서 호출 가능하도록)
window.startARSession = startARSession;

// 이벤트 바인딩 (init 전에 등록해, init 실패 시에도 버튼 반응하도록)
btnStartAr.addEventListener('click', (e) => {
  e.preventDefault();
  startARSession();
});

btnCloseAr.addEventListener('click', () => {
  if (xrSession) {
    xrSession.end();
  }
});

function updatePlayPauseButton() {
  if (!btnPlayPause) return;
  const icon = btnPlayPause.querySelector('.btn-play-pause-icon');
  const text = btnPlayPause.querySelector('.btn-play-pause-text');
  if (isRotationPaused) {
    if (icon) icon.textContent = '▶';
    if (text) text.textContent = '재생';
    btnPlayPause.classList.add('is-paused');
    btnPlayPause.setAttribute('aria-label', '재생');
  } else {
    if (icon) icon.textContent = '⏸';
    if (text) text.textContent = '일시정지';
    btnPlayPause.classList.remove('is-paused');
    btnPlayPause.setAttribute('aria-label', '일시정지');
  }
}

btnPlayPause.addEventListener('click', () => {
  isRotationPaused = !isRotationPaused;
  updatePlayPauseButton();
});

// 초기화 (실패 시 사용자에게 알림)
try {
  init();
} catch (err) {
  console.error('AR 초기화 실패:', err);
  alert('AR을 불러오는 중 오류가 발생했습니다. 브라우저 콘솔(F12)을 확인해주세요.');
}
