# SPECIA WebAR 명함

모바일 퍼스트 WebAR 명함 페이지입니다. 두 가지 AR 체험 방식이 있습니다.

## 페이지 구성

| 페이지 | 기술 | 특징 |
|--------|------|------|
| `index.html` | model-viewer | 간편한 3D 뷰어 + AR, 핫스팟 |
| `webxr-ar.html` | Three.js + WebXR | Hit-test, Tap-to-place, DOM 오버레이 |

## WebXR AR (webxr-ar.html) 기능

- **immersive-ar**: WebXR AR 세션 사용
- **카메라 자동 시작**: 탭 한 번으로 AR 세션 진입
- **Hit-test**: 바닥·평면 감지
- **Tap-to-place**: 탭한 위치에 3D 명함 배치
- **DOM 오버레이**: AR 중에도 홈페이지·프로모션 영상 버튼 유지
- **iOS/Android 최적화**: safe-area, 터치 최적화

## model-viewer (index.html) 기능

- **모바일 AR**: WebXR / Scene Viewer / Quick Look 지원
- **회전·확대·축소**: 터치/마우스로 조작
- **인터랙티브 핫스팟**: 3D 모델 위 링크 버튼
- **반응형 디자인**

## 프로젝트 구조

```
SPECIA-명함/
├── index.html        # model-viewer 메인 페이지
├── webxr-ar.html     # Three.js WebXR AR 페이지
├── webxr-ar.js       # WebXR AR 로직
├── webxr-ar.css      # WebXR AR 스타일
├── public/
│   └── models/
│       └── business-card.glb   # 3D 명함 모델 (여기에 추가)
├── styles.css
├── script.js
├── vercel.json
└── README.md
```

## 사용 전 설정

### 1. 3D 모델 추가

- **WebXR AR**: `public/models/business-card.glb`에 명함 3D 모델을 넣으세요. (Vite가 이 경로를 `/models/business-card.glb`로 서빙합니다.)
- **model-viewer**: `models/business-card.glb`에 넣으면 됩니다.
- 없으면 임시 카드 모델 또는 데모용 샘플이 사용됩니다.
- [modelviewer.dev/editor](https://modelviewer.dev/editor)에서 모델을 불러와 핫스팟 위치를 확인·수정할 수 있습니다.

### 2. 링크 수정

**model-viewer (`script.js`)**
```js
const CONFIG = {
  homepage: 'https://yoursite.com',
  promoVideo: 'https://youtube.com/...',
};
```

**WebXR AR (`webxr-ar.js`)**
```js
const CONFIG = {
  homepageUrl: 'https://yoursite.com',
  promoVideoUrl: 'https://youtube.com/...',
};
```

### 3. 핫스팟 위치 조정 (선택)

명함 모델에 맞게 `index.html`의 `data-position`, `data-normal` 값을 조정하세요. [modelviewer.dev/editor](https://modelviewer.dev/editor)에서 모델을 열고 핫스팟을 클릭해 나온 값을 복사해 쓰면 됩니다.

## 로컬 실행 (HTTPS)

모바일 AR 테스트를 위해 HTTPS 서버를 사용합니다.

```bash
npm install
npm run dev
```

브라우저에 `https://localhost:5173`이 열립니다. PC와 같은 Wi‑Fi의 휴대폰에서 `https://[PC의IPv4주소]:5173`으로 접속하세요.

> 첫 접속 시 인증서 경고가 나오면 「고급」→「(안전하지 않음)으로 이동」을 눌러 진행합니다. 개발용 자체 서명 인증서입니다.

## Vercel 배포

1. [Vercel](https://vercel.com)에 로그인 후 새 프로젝트를 생성합니다.
2. 이 저장소를 연결하거나, 파일을 업로드합니다.
3. 빌드 설정 없이 그대로 Deploy합니다.

배포 후에는 HTTPS가 적용되어 AR 기능이 정상 동작합니다.

## 지원 환경

- **Android**: Chrome 83+, ARCore 지원 기기 (WebXR hit-test, DOM overlay)
- **iOS**: Safari 15.2+ (WebXR immersive-ar, DOM overlay는 미지원 가능)
- **데스크톱**: 3D 뷰어로 조작
