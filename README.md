# Claude Chef's Mystery Kitchen 🧪
### 클로드 셰프의 수상한 음료 연구소 — 학생문화제 랜덤 음료 레시피 생성기

방문객이 마시기 싫은 음료를 빼고 **🎲 레시피 뽑기!** 를 누르면, 클로드 셰프가 룰렛으로 음료를 2~5개 뽑고
**정확히 180mL** 가 되는 혼합 비율까지 정해 줍니다. 부스 운영자는 카드에 적힌 **mL** 대로 음료를 만들면 됩니다.

- 인터넷 없이 동작 (폰트·효과음·그림 모두 내장, 효과음은 Web Audio 로 직접 합성)
- 1920×1080 기준, 1280×720 까지 스크롤 없이 한 화면에 맞춰 자동 축소
- 레시피는 애니메이션 시작 **전에** 확정 → 룰렛/건너뛰기는 결과를 바꾸지 않음

---

## 1. 설치

[Node.js](https://nodejs.org) 20 이상이 필요합니다.

```bash
npm install
```

## 2. 실행 (개발 모드)

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다. `drinks.yaml` 을 수정하고 저장하면 화면이 바로 바뀝니다.

## 3. 빌드

```bash
npm run build
```

`dist/index.html` **파일 하나**가 만들어집니다 (모든 리소스 포함, 약 5MB).
이 파일만 USB 등으로 옮겨서 **더블클릭**하면 Chrome/Edge 에서 바로 실행됩니다. 서버나 인터넷이 필요 없습니다.

### 미리보기용 아티팩트 (설치 없이 링크로 보기)

```bash
npm run build:artifact
```

`artifact/claude-chef.html` 이 만들어집니다. 빌드 결과에서 `<html>/<head>/<body>` 태그만 벗겨 낸 파일로,
claude.ai 아티팩트로 올려 링크만으로 앱을 확인할 수 있게 할 때 씁니다.
yaml 을 고친 뒤에는 이 명령을 다시 실행하고 같은 아티팩트에 다시 올리면 링크는 그대로 내용만 바뀝니다.

## 4. 테스트

```bash
npm test
```

- `src/test/logic.test.ts` — 분수 변환, 비율 템플릿(합계 180mL), 개수 범위, 중복/제외 음료, **10,000회 반복 생성** 검증, 애니메이션 타임라인
- `src/test/app.test.tsx` — 설정 모달, 입력 검증, 명세서의 시나리오 1·2·3, 건너뛰기, 연속 클릭 방지, 남은 타이머 없음, 효과음 토글

---

## 5. 음료 목록 수정하기 → `drinks.yaml`

프로젝트 맨 위의 **`drinks.yaml`** 만 고치면 됩니다. 코드 수정은 필요 없습니다.

```yaml
  - id: peach-tea          # 영문 소문자/숫자/하이픈, 음료마다 다르게
    name: 복숭아 아이스티   # 화면에 보이는 이름
    icon: tall-glass       # cup | glass | tall-glass | can | bottle | carton
    color: "#F08A5D"       # 카드·그래프 대표 색
    liquid: "#F7A072"      # 아이콘 속 음료(또는 캔·팩 몸통) 색 — 생략 가능
    garnish: peach         # none | ice | orange | lemon | apple | grape | peach
    label: PEACH           # 캔/병/팩에 적힐 짧은 영문 (선택)
    containsCaffeine: true # 실제 제품 라벨로 확인!
    containsMilk: false    # 실제 제품 라벨로 확인!
```

| 하고 싶은 것 | 방법 |
|---|---|
| 음료 추가 | 위처럼 한 덩어리를 복사해서 붙여 넣기 |
| **실제 음료 사진 쓰기** | 사진을 `drink-images/` 폴더에 넣고 그 음료에 `image: 파일이름.png` 추가 (예: 포카리스웨트 → `image: pocari.png`). 사진이 있으면 그림 아이콘 대신 사진이 보이고, 파일이 없으면 그림 아이콘으로 대신 표시됩니다. 정사각형·흰 배경 사진이 가장 잘 어울립니다 |
| 재료가 떨어져서 잠시 빼기 | 그 음료에 `hidden: true` 추가 |
| 완전히 삭제 | 그 덩어리 지우기 |

- 저장 후 `npm run dev` 화면은 자동 반영, `dist/index.html` 을 쓰는 경우 **`npm run build` 를 다시 실행**하세요.
- 잘못 적으면 앱 화면에 어떤 줄이 틀렸는지 안내가 나옵니다.
- `containsCaffeine` / `containsMilk` 는 설정 화면의 **☕ 카페인 빼기 / 🥛 우유 성분 빼기** 버튼에 쓰입니다.
  알레르기와 관련될 수 있으니 **부스에서 실제로 쓰는 제품 라벨과 꼭 대조**해 주세요.

## 6. 궁합 모드 (맛 임베딩 + ⚡서프라이즈) → `drinks.yaml` 의 `mixing:`

```yaml
mixing:
  mode: harmony      # harmony = 궁합 모드 / random = 완전 랜덤(원래 명세서 방식)
  harmony: 2         # β 궁합 강도
  surprise: 0.2      # ε 서프라이즈 재료 확률
  surpriseNoise: 0.35  # σ 서프라이즈 벡터 무작위성
```

**작동 방식** (`src/logic/harmony.ts`)

1. **맛 임베딩**: 각 음료의 `flavor`(sweet·sour·fizzy·creamy·bitter·fruity·salty·light, 0~1)를 벡터로 만들고,
   전체 평균을 빼서(중심화) 길이 1로 정규화합니다. 두 음료의 궁합 = 코사인 유사도(-1~1).
2. **조인트 덴시티**: 음료 개수 N 은 지금처럼 균등하게 정한 뒤, N 개 묶음 S 를
   `p(S) ∝ exp(β × 묶음 안 평균 유사도)` 로 뽑습니다. 음료가 11개면 가능한 묶음(최대 462개)을 전부 나열해 **정확하게** 샘플링합니다.
   모든 묶음의 확률이 0보다 커서 이상한 조합도 가끔 나옵니다.
3. **서프라이즈 벡터**: 확률 ε 로, 먼저 N-1 개의 "궁합 코어"를 뽑고
   `s = normalize(-코어 평균 맛 + σ·랜덤)` (코어와 반대 맛 방향)에 가까운 음료 하나를 **마지막 재료**로 끼워 넣습니다.
   룰렛에서 ⚡서프라이즈 배지와 함께 공개됩니다.

**β 고르는 기준** (현재 11개 음료 기준, 2가지 섞을 때)

| β | 가장 잘 맞는 쌍 | 가장 안 맞는 쌍 | 느낌 |
|---|---|---|---|
| 0 | 1배 | 1배 | 완전 랜덤 |
| 1.5 | 3.8배 | 0.32배 | 살짝 궁합 |
| **2 (기본)** | 5.2배 | 0.19배 | 궁합 + 다양성 균형 |
| 3 | 8.4배 | 0.06배 | 꽤 무난한 조합 위주 |
| 4 | 11.4배 | 0.02배 | 과일주스끼리만 자주 나옴 |

(배수 = 완전 랜덤일 때 대비 등장 확률)

## 7. 음료 이름 짓기 → `names.yaml`

레시피가 완성되면 셰프가 "이 음료의 이름은…" 하고 이름을 붙여 줍니다 (예: 「월요일 아침의 묘약」, 「배신의 우유 펀치」).
인터넷·AI 없이, 조합의 특징으로 단어장의 빈칸을 채워 만듭니다 (`src/logic/drinkName.ts`).

- **대표 맛**: mL 비중으로 섞은 맛 중 평균보다 두드러지는 맛 → 형용사·장소·음료 종류 단어 선택
- **분위기**: 맛 임베딩 유사도가 높으면 `harmony`(환상의…), 낮으면 `chaos`(혼돈의…)
- **⚡서프라이즈**가 있으면 서프라이즈 전용 템플릿과 한마디 사용
- 같은 레시피에는 항상 같은 이름 (건너뛰기해도 동일)

`names.yaml` 에서 템플릿과 단어를 자유롭게 추가하세요. 빈칸 종류와 조사 자동 맞춤(`{이/가}` 등) 설명이 파일 맨 위에 있습니다.
음료의 짧은 별명은 `drinks.yaml` 의 `nickname` 으로 정합니다 (예: 포카리스웨트 → 포카리, 아메리카노 → 아아).

## 8. 비율 템플릿 수정하기 → `src/logic/ratioTemplates.ts`

```ts
3: [
  [60, 60, 60],   // 1/3 + 1/3 + 1/3
  [90, 45, 45],   // 1/2 + 1/4 + 1/4
  ...
],
```

- 숫자 단위는 **mL**, 숫자 개수 = 음료 개수, **합계는 반드시 180**
- 분수(1/2, 1/12 …)는 mL 에서 자동으로 약분되어 표시됩니다
- 수정 후 `npm test` 를 돌리면 합계가 틀린 템플릿을 잡아 줍니다

---

## 9. 행사장 PC에서 실행하기

1. 미리 `npm run build` 로 `dist/index.html` 을 만들어 둡니다.
2. 행사 PC로 `dist/index.html` 을 복사합니다.
3. Chrome 또는 Edge 로 열고 **F11 (전체 화면)** 을 누릅니다.
4. 화면을 한 번 클릭하면 효과음이 켜집니다 (브라우저 자동재생 정책). 오른쪽 위 🔊 버튼으로 ON/OFF.
5. 손님이 바뀔 때마다 결과 화면의 **👋 새 손님 시작** 을 눌러 주세요 → 음료 제외 설정과 개수가 기본값으로 초기화됩니다.

> 노트북 화면이 작으면 브라우저 확대/축소(Ctrl + -/+)가 100% 인지 확인하세요. 화면 크기에 맞춰 자동으로 줄어듭니다.

---

## 폴더 구조

```
drinks.yaml                  ← 음료 목록 (여기만 고치면 됨)
drink-images/                ← 음료 사진 (drinks.yaml 의 image: 로 연결)
names.yaml                   ← 음료 이름 단어장·템플릿
src/
  data/        drinks.ts, drinkSchema.ts   음료 불러오기·검사
  logic/       recipeGenerator, harmony(궁합·서프라이즈), drinkName(이름 짓기), ratioTemplates, fractions, random, settings
  lib/         animation(타임라인), sound(효과음), color
  state/       kitchen(상태 정의), useKitchen(추첨 진행)
  components/  ChefCharacter, RouletteDisplay, IngredientCard, RatioBar,
               SettingsModal, Header, ChefSpeechBubble, CelebrationEffect, NamePlate, icons/DrinkIcon
  test/        자동 테스트
```

기술 스택: React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Motion · Lucide · Web Audio API · Vitest
