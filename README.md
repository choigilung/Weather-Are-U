# 🌤 WAU - Weather Are U

> 소프트웨어공학 13조 | 주제 2: 환경 모니터링 대시보드

실시간 대기질·날씨 데이터를 수집·시각화하고, 트렌드 분석 및 알림 기능을 제공하는 환경 모니터링 웹 애플리케이션입니다.

🔗 **배포 URL**: https://weather-are-u-4bno.vercel.app

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 🏠 홈 대시보드 | 지역별 실시간 PM2.5·PM10·온도·습도·CO2 현황 |
| 🌦 날씨 카드 | 기상청 API 기반 현재 날씨, 시간별·내일 예보 |
| 📊 24시간 추이 차트 | 지역별 측정 이력 시계열 그래프 |
| 🗺 지도 탭 | 네이버 지도 위 지역별 대기질 마커 |
| 📈 트렌드 분석 | 일자별 평균, 이동평균, 선형 추세 및 3일 예측 |
| 🔔 알림 설정 | PM2.5·PM10·온도·습도 임계값 초과 시 알림 |
| 📄 PDF 보고서 | 전체 대시보드 PDF 저장 |
| 📥 CSV 내보내기 | 날짜·지역·항목 선택 후 측정 데이터 다운로드 |

---

## 기술 스택

**Frontend**
- React 19, Vite
- html2canvas, jsPDF (PDF 출력)
- 네이버 지도 API

**Backend**
- Node.js, Express 5
- PostgreSQL (Supabase)
- 기상청 단기예보·초단기실황 API
- 한국환경공단 에어코리아 API
- 일출일몰 API

**배포**
- Frontend: Vercel
- Backend: Render
- DB: Supabase (PostgreSQL)

---

## 로컬 실행 방법

### 사전 준비
- Node.js 18 이상
- PostgreSQL 또는 Supabase 계정

### 1. 저장소 클론

```bash
git clone https://github.com/choigilung/Weather-Are-U.git
cd Weather-Are-U
```

### 2. 프론트엔드 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에서 아래 항목 입력:
# VITE_API_URL=http://localhost:5000
# VITE_NAVER_MAPS_KEY_ID=발급받은_키
```

### 3. 백엔드 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에서 아래 항목 입력
```

**`backend/.env` 항목**

```
PORT=5000
DB_HOST=
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=임의의_문자열

AIRKOREA_API_KEY=    # 에어코리아 API 키
WEATHER_API_KEY=     # 기상청 API 키
SUNRISE_API_KEY=     # 일출일몰 API 키

FRONTEND_URL=http://localhost:5173
```

### 4. DB 테이블 생성

Supabase SQL Editor 또는 psql에서 실행:

```bash
psql -U [사용자] -d [DB명] -f backend/init.sql
```

### 5. 실행

```bash
# 터미널 1 - 백엔드
cd backend
npm run dev

# 터미널 2 - 프론트엔드 (루트 폴더)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 환경변수 발급처

| 키 | 발급처 |
|---|---|
| `AIRKOREA_API_KEY` | [공공데이터포털](https://www.data.go.kr) → 한국환경공단_에어코리아 대기질 실시간 API |
| `WEATHER_API_KEY` | [공공데이터포털](https://www.data.go.kr) → 기상청 단기예보 조회서비스 |
| `SUNRISE_API_KEY` | [공공데이터포털](https://www.data.go.kr) → 한국천문연구원 일출몰 API |
| `VITE_NAVER_MAPS_KEY_ID` | [네이버 클라우드 플랫폼](https://www.ncloud.com) → Maps → Web Dynamic Map |

---

## 프로젝트 구조

```
Weather-Are-U/
├── src/
│   ├── pages/
│   │   └── Dashboard.jsx        # 메인 대시보드 페이지
│   ├── components/
│   │   ├── WeatherHeroCard.jsx   # 날씨 히어로 카드
│   │   ├── Pm25LineChart.jsx     # 24시간 추이 차트
│   │   ├── TrendChart.jsx        # 트렌드 분석 차트
│   │   ├── ForecastPanel.jsx     # 예측 패널
│   │   ├── AlertPanel.jsx        # 알림 설정 모달
│   │   ├── NaverMapPanel.jsx     # 네이버 지도 패널
│   │   ├── ExportPanel.jsx       # CSV 내보내기 모달
│   │   └── PdfReportButton.jsx   # PDF 보고서 버튼
│   ├── services/
│   │   ├── api.js                # API 클라이언트
│   │   └── regions.js            # 지역 목록
│   └── utils/
│       └── grade.js              # 대기질 등급 계산
├── backend/
│   ├── app.js                    # Express 서버 진입점
│   ├── init.sql                  # DB 초기화 스크립트
│   └── src/
│       ├── services/
│       │   ├── weatherEngine.js   # 데이터 수집 스케줄러
│       │   ├── forecastService.js # 날씨 예보 서비스
│       │   ├── trendAnalyzer.js   # 트렌드 분석 서비스
│       │   ├── alertManager.js    # 알림 처리 서비스
│       │   └── regionService.js   # 지역 정보
│       └── repositories/
│           ├── weatherRepository.js
│           └── userRepository.js
├── .env.example
├── vercel.json                   # Vercel 배포 설정
└── render.yaml                   # Render 배포 설정
```

---

## 데이터 수집 주기

백엔드 서버 실행 시 **5분마다** 자동으로 전국 5개 지역(서울, 부산, 인천, 대구, 창원) 데이터를 수집해 DB에 저장합니다.
