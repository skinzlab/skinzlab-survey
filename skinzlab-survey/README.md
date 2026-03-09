# SKINCODE Survey — Skinzlab™

MSTI™ 사전 설문조사 웹 앱. React + Vite + Firebase Firestore, Vercel 배포.

## 파일 구조

```
skinzlab-survey/
├── public/
│   └── og-image.png          ← KakaoTalk 공유 썸네일 (800×400px)
├── src/
│   ├── main.jsx              ← React 진입점
│   ├── App.jsx               ← 설문 컴포넌트 전체
│   └── firebase.js           ← Firestore 클라이언트
├── .env.example              ← 환경변수 템플릿
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 Firebase 설정값 입력

# 3. 개발 서버 시작
npm run dev
```

## Vercel 배포

1. GitHub에 push
2. Vercel에서 저장소 연결 (Framework: Vite 자동 감지)
3. **Settings > Environment Variables**에 `.env.example`의 6개 변수 입력
4. 배포

## Firebase Firestore 설정

Firebase Console → Firestore Database → 규칙:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /survey_responses/{docId} {
      allow create: if true;          // 누구나 응답 제출 가능
      allow read: if true;            // 결과 페이지 공개 (비공개 원하면 false)
    }
  }
}
```

## 데이터 구조

Firestore 컬렉션: `survey_responses`

각 문서:
```json
{
  "q_gender": "여성",
  "q_age": "만 24~27세",
  "q_source": ["화해·글로우픽 등 리뷰 앱", "인스타그램·유튜브 등 SNS"],
  "q_intent": "5",
  "q_email": "user@example.com",
  "submitted_at": "<Firestore Timestamp>"
}
```
