# Kartrider
OpenAI Student Collective 3rd Studio session

## Apex Kart

세 개의 서킷과 드라이버, 카트에서 각각 하나씩 골라 세 바퀴를 주행하는 브라우저용 3D 타임 어택 게임입니다.

```sh
npm ci
npm run dev
```

Vite가 출력하는 주소를 WebGL 2를 지원하는 브라우저에서 엽니다. 배포용 파일은 `npm run build`로 생성합니다.

| 입력 | 동작 |
| --- | --- |
| ↑ / W | 가속 |
| ↓ / S | 브레이크 및 후진 |
| ← / → / A / D | 조향 |
| Shift + ← / → | 속도를 낸 상태에서 드리프트 |
| Ctrl | 충전된 부스터 사용 (드리프트 중에도 가능) |
| R | 현재 레이스 다시 시작 |

3–2–1 카운트다운에서 숫자가 밝아질 때 가속키를 눌러 유지하면 출발 부스터를 쓸 수 있습니다. 가속과 조향, Shift 드리프트는 동시에 입력할 수 있습니다. 여러 방향키를 동시에 인식하지 않는 키보드에서는 W/A/S/D를 사용할 수 있습니다.

코너에서 드리프트하면 부스터 게이지가 차고, 가득 차면 계기판 기준 최대 300 km/h까지 짧게 가속할 수 있습니다. 벽에 닿으면 속도가 줄어들며, 역주행을 계속하면 경고가 표시됩니다. 터치 기기에서는 화살표, DRIFT, 번개 버튼을 사용하세요.

### GitHub Pages 배포

저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다. 이후 `main`에 푸시하거나 **Actions → Deploy Apex Kart to GitHub Pages → Run workflow**를 선택하면 배포됩니다.

### Vercel 배포

Vercel에서 이 GitHub 저장소를 가져오고 프로덕션 브랜치로 `main`을 선택합니다. `vercel.json`이 Vite 빌드와 `dist` 출력 폴더를 지정합니다. 연결된 프로젝트에서는 `main` 푸시가 프로덕션 배포를 시작합니다.
