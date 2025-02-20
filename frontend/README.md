# TownChat Frontend

## 시작하기 전에

아래 프로그램들이 컴퓨터에 설치되어 있어야 합니다:

### 1. Node.js 설치하기

1. [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)에서 `nvm-setup.exe` 다운로드
2. 다운로드 받은 파일 실행 후 설치
3. 명령 프롬프트(cmd)를 관리자 권한으로 실행
4. 아래 명령어로 Node.js 설치 및 사용

```bash
# Node.js 20.18.1 설치
nvm install 20.18.1

# 설치된 Node.js 버전 확인
nvm list

# Node.js 20.18.1 사용 설정
nvm use 20.18.1

# 설정된 버전 확인
node --version
```

### 2. 기타 필수 프로그램

-   [Visual Studio Code](https://code.visualstudio.com/) (추천 에디터)
-   [Git](https://git-scm.com/)

## 프로젝트 실행 방법

1. **프로젝트 클론받기**

```bash
git clone https://github.com/smnm1998/TownChat.git
cd TownChat/frontend
```

2. **의존성 패키지 설치**

```bash
yarn install
```

3. **개발 서버 실행**

```bash
yarn run dev
```

-   브라우저에서 `http://localhost:5173` 접속
-   코드 수정 시 자동으로 새로고침됩니다

## 주요 명령어

```bash
yarn run dev      # 개발 서버 실행
yarn run build    # 프로덕션용 빌드
yarn run lint     # 코드 문법 검사
yarn run preview  # 빌드된 결과물 미리보기
```

## VS Code 추천 확장 프로그램

1. **필수 확장 프로그램**

-   `ESLint` - 코드 문법 검사
-   `Prettier` - 코드 자동 정렬
-   `Tailwind CSS IntelliSense` - Tailwind CSS 자동완성
-   `PostCSS Language Support` - @apply 경고 문구 제어

2. **선택 확장 프로그램**

-   `Auto Rename Tag` - HTML 태그 자동 수정
-   `Material Icon Theme` - 파일 아이콘 테마
-   `GitLens` - Git 기록 확인

## 프로젝트 구조

```
frontend/
├── public/          # 정적 파일 (빌드 시 그대로 복사됨)
├── src/             # 소스 코드
│   ├── assets/      # 이미지, 폰트 등 정적 리소스
│   ├── components/  # 재사용 가능한 컴포넌트들
│   ├── hooks/       # 커스텀 훅 (상태 로직 재사용)
│   ├── pages/       # 페이지 컴포넌트 (라우팅)
│   ├── store/       # Zustand 전역 상태 관리
│   ├── styles/      # 전역 스타일
│   ├── App.jsx      # 최상위 컴포넌트
│   ├── main.jsx     # 앱 진입점
│   └── vite-env.d.ts # Vite 타입 선언
├── index.html       # HTML 진입점
├── vite.config.js   # Vite 설정
├── package.json     # 프로젝트 설정/의존성
└── tailwind.config.js # Tailwind 설정
```

## Git 작업 규칙

### 1. 브랜치 정책

-   `main`: 배포용 브랜치
-   `develop`: 개발용 브랜치 (모든 작업은 여기서 진행)
-   ⚠️ 추가 원격 브랜치 생성 금지
-   로컬 브랜치 작업 완료 후, `devlop`에 `merge`해서 push 하는 것을 추천

### 2. 작업 시작하기

```bash
# develop 브랜치로 전환
git checkout develop

# develop 브랜치 최신화
git pull origin develop

# 새로운 기능 개발 시작 전 로컬 브랜치 생성
git checkout -b feature/기능이름 (ex. feature/auth)

# 작업 완료 후
git commit -m "feat: 새로운 기능 구현"

# develop 브랜치로 전환
git checkout develop

# 로컬 브랜치 병합
git merge feature/기능이름

# develop에 푸시
git push origin develop

# 작업 완료된 로컬 브랜치 삭제 (선택사항)
git branch -d feature/기능이름
```

### 3. 주의사항

-   항상 `develop` 브랜치에서 작업 시작
-   작업 전 `git pull origin develop`으로 최신화 (!!제일 중요!!)
-   모든 변경사항은 `develop` 브랜치에 푸시
-   로컬 브랜치는 작업 완료 후 삭제 (선택사항, 계속 쌓아서 백업용으로 사용해도됨)
-   충돌 발생 시 즉시 팀원과 상의

### 4. 커밋 메시지 규칙

```bash
feat: 새로운 기능 추가
fix: 버그 수정
build: 빌드 관련 수정 및 추가
chore: 기타 수정 사항
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
```

## 자주 발생하는 문제 해결

### 1. `yarn install` 실행 시 오류가 발생하는 경우

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
yarn install
```

### 2. 포트 5173이 이미 사용 중인 경우

```bash
# 포트 확인
netstat -ano | findstr :5173
# 해당 프로세스 종료
taskkill /PID [프로세스ID] /F
```

### 3. Git 충돌이 발생한 경우

```bash
# 현재 변경사항 저장
git stash
# 최신 코드 가져오기
git pull origin main
# 저장한 변경사항 적용
git stash pop
```

## 코드 작성 규칙

1. **파일/폴더 이름**

    - 컴포넌트: PascalCase (예: `LoginForm.jsx`)
    - 일반 파일: camelCase (예: `utils.js`)

2. **코드 스타일**

    - 들여쓰기: 4칸 공백
    - 문자열: 작은따옴표 사용
    - 세미콜론 필수

## 도움이 필요하다면?

1. 팀원에게 물어보기기
2. 구글링 & ChatGPT 활용

---
