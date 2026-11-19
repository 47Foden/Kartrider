# Kartrider
OpenAI Student Collective 3rd Studio session

## Apex Kart

노란 카트로 해안 서킷을 세 바퀴 도는 브라우저용 3D 타임 어택 게임입니다.

```sh
npm ci
npm run dev
```

Vite가 출력하는 주소를 WebGL 2를 지원하는 브라우저에서 엽니다. 배포용 파일은 `npm run build`로 생성합니다.

| 입력 | 동작 |
| --- | --- |
| ↑ | 가속 |
| ↓ | 브레이크 및 후진 |
| ← / → | 조향 |
| R | 현재 레이스 다시 시작 |

터치 기기에서는 화면의 화살표 버튼으로 조작할 수 있습니다. **구글 지도** 탭에서 산타모니카 피어 또는 검색한 장소의 Google 지도를 불러옵니다. 지도 임베드에는 Google Maps에 접속할 수 있는 네트워크가 필요합니다. 주행 코스는 게임에 포함된 3D 서킷입니다.

### GitHub Pages 배포

저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다. 이후 `main`에 푸시하거나 **Actions → Deploy Apex Kart to GitHub Pages → Run workflow**를 선택하면 배포됩니다.
