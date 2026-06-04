
﻿요구사항 문서  
Requirements Document
주제 : 환경 모니터링 대시보드
작성일	2026년 5월 22일
과목명	소프트웨어 공학
담당 교수	이혁 교수님
팀 번호	13조
팀원	심민준, 최길웅, 박미르, 류석종


목차
1. 개요 (Overview)
1.1 프로젝트 목적
1.2 적용 범위
1.3 용어 정의
1.4 참고 문헌
2. 사용자 분석 (User Research)
2.1 사용자 페르소나
2.2 설문 개요 및 결과
2.3 심층 인터뷰 결과
2.4 AI 시뮬레이션 검증 로그
3. 유스케이스 (Use Case)
3.1 유스케이스 다이어그램
3.2 상세 유스케이스 명세
4. 기능 요구사항 (Functional Requirements)
4.1 데이터 수집 및 연동
4.2 실시간 대시보드
4.3 알림 기능
4.4 데이터 분석 및 내보내기
4.5 사용자 인증
5. 비기능 요구사항 (Non-Functional Requirements)
5.1 성능
5.2 보안
5.3 사용성
5.4 유지보수성
6. 제약 사항 및 가정
6.1 제약사항
6.2 가정

1. 개요 (Overview)
1.1 프로젝트 목적
본 문서는 환경 모니터링 대시보드 시스템의 소프트웨어 요구사항을 정의한다. 본 시스템은 공기 질, 온도, 습도 등의 환경 데이터를 실시간으로 수집·시각화하고, 사용자에게 맞춤 알림과 데이터를 제공하는 웹 기반 대시보드이다.
실제 IoT 센서 연동은 옵션이며, 시뮬레이션 데이터 또는 공개 API(예: OpenWeatherMap, AirKorea)로 대체 가능하다.

1.2 적용 범위
본 SRS는 다음 이해관계자를 대상으로 작성되었다.
개발팀: 기능 구현의 기준 문서로 활용
테스트팀: 테스트 케이스 작성의 기반 문서로 활용
최종 사용자: 일반 시민, 환경 연구자, 학생

1.3 용어 정의
용어	정의
IoT	Internet of Things. 물리적 기기가 인터넷을 통해 데이터를 송수신하는 기술
대시보드	다양한 데이터 시각화 요소를 하나의 화면에 모아 보여주는 UI
시뮬레이션 데이터	실제 센서 없이 코드로 생성하는 가상의 환경 측정값
폴링(Polling)	일정 주기로 서버에 데이터를 요청하는 방식 (WebSocket 대체)
생활 밀착형 지수	세탁지수, 운동지수, 코디 지수 등 일상 행동 결정에 활용되는 체감형 지표
PM(미세먼지)	공기 중에 떠다니는 미세한 입자 상 물질
AQI(Air Quality Index)	대기오염 수치를 직관적으로 이해할 수 있도록 표현한 통합 대기질 지수

1.4 참고 문헌
ISO/IEC/IEEE 29148:2018 — Systems and software engineering — Requirements engineering
OpenWeatherMap API Documentation (https://openweathermap.org/api)
한국환경공단 AirKorea Open API 명세서

2. 사용자 분석 (User Research)
본 장은 초안의 설문조사 기반 페르소나에 더해, 추가 사용자 조사(페르소나 심층 분석, 인터뷰, AI 시뮬레이션 검증)를 통합하여 구성하였다.
2.1 사용자 페르소나
총 3개의 페르소나를 도출하였다. 페르소나 1~2는 초안 설문 기반이며, 페르소나 3은 추가 조사를 통해 보완되었다.
페르소나 1 — 영유아 자녀를 둔 부모
항목	내용
이름 / 나이	박민정 / 35세, 육아 중
생활 환경	경기도 거주, 스마트폰 위주 사용
목표	아이 외출 가능 여부 빠르게 판단
불만점	수치보다 '좋음/나쁨' 같은 직관적 표현이 필요
주요 사용 기능	외출 가능 여부 표시, 경보 알림, 모바일 최적화 UI

페르소나 2 — 환경 데이터 연구자/학생
항목	내용
이름 / 나이	이준혁 / 24세, 환경공학과 학생
생활 환경	PC 위주 사용, 데이터 분석 경험 있음
목표	기간별 트렌드 비교, 데이터 보고서 내보내기
불만점	공공 데이터 포털은 UI가 불편하고 다운로드가 어려움
주요 사용 기능	트렌드 그래프, PDF/CSV 내보내기, 지역 비교

페르소나 3 — 일상 밀착형 라이프스타일러 
항목	내용
이름 / 나이	이민지 / 26세, 직장인 (사회초년생)
대표 문구	"오늘 아침에 날씨 앱을 켜는 이유는 '오늘 하루를 어떻게 대비할지' 결정하기 위해서예요."
특징	출근 전 날씨와 미세먼지를 확인하여 코디(두께·우산 여부)와 퇴근 후 운동 계획(실내 vs 야외)을 결정
불만점	앱마다 다른 날씨 정보와 과도한 수치 제공. 세탁지수·운동지수 등 체감 정보를 한눈에 보고 싶어 함
주요 사용 기능	생활 밀착형 지수 카드(세탁·운동·코디), 위치 기반 실시간 데이터


2.2 설문 개요 및 결과
항목	내용
설문 기간	2026년 5월 (시뮬레이션)
설문 대상	환경 정보에 관심 있는 성인 남녀
응답 인원	50명 (일반 사용자 50명 시뮬레이션 기준)
설문 방법	온라인 설문지 (Google Forms 활용, AI 시뮬레이션 로그 포함)
환경 앱 사용 습관 및 선호도 설문 결과
질문 문항	응답 결과 (핵심 인사이트)	비율	요구사항 반영
앱 접속 목적 1위	외출 전 옷차림 및 소지품(우산 등) 결정	65%	온도/강수 기반 코디 제안
앱 접속 목적 2위	야외 활동(운동, 세탁물 건조) 가능 여부 확인	28%	활동 지수(Activity Index) 제공
불편한 점 1위	직관적 표현 부족 (수치보다 알기 쉬운 메시지 원함)	55%	생활 밀착형 메시지 출력
불편한 점 2위	정보가 너무 많아 한눈에 들어오지 않음	42%	직관적인 카드형 대시보드 UI
추가 희망 정보	현재 위치의 실시간 수치	53%	API와 센서 데이터 결합 정보
데이터 내보내기	필요하다고 응답	47%	CSV/PDF 내보내기 기능
2.3 심층 인터뷰 결과
아래는 사용자 유형별 심층 인터뷰에서 도출된 핵심 발언이다.

일반 사용자 (이민지, 26세)
저는 아침에 미세먼지 수치를 볼 때 '80㎍/㎥'이라는 숫자보다, '오늘 마스크 꼭 쓰세요'라거나 '오늘은 빨래가 잘 안 마를 거예요' 같은 직관적인 메시지가 더 와닿아요. 날씨와 공기질이 내 계획에 어떤 영향을 주는지 알고 싶은 거죠.

환경 데이터 연구자/학생 (이준혁, 24세):
공공 데이터 포털에서 데이터를 받을 때마다 CSV 파일 포맷이 달라서 정말 고통스러워요. 출처마다 컬럼 이름도 다르고, 날짜 형식도 달라서 매번 전처리를 해야 해요. 하나의 시스템에서 균일한 포맷으로 내려받을 수 있다면 연구 속도가 두 배는 빨라질 것 같아요. 그리고 7일치 이동 평균 같은 기본 통계도 미리 계산해서 그래프로 보여줬으면 좋겠어요.


라이프스타일러/직장인 (이민지, 26세):
아침에 날씨 앱을 네 개씩 켜보는 게 이상한 거 아니잖아요? 앱마다 다르게 나오니까요. 어떤 앱은 '미세먼지 보통'이라고 하고, 어떤 앱은 '나쁨'이라고 해요. 그냥 한 곳에서 '오늘 운동 해도 돼요, 야외 괜찮아요'라고 딱 말해주는 게 있으면 좋겠어요. 숫자 말고요. 저는 PM2.5가 뭔지 몰라도 되잖아요.
2.4 AI 시뮬레이션 검증 로그
사용자 시나리오를 AI 로직으로 시뮬레이션하여 요구사항의 실현 가능성을 사전 검증하였다.

Scenario 1 — 일반 사용자 생활 루틴 검증
항목	내용
Input	기온 12°C, 습도 85%, 초미세먼지 '보통'
AI Analysis	높은 습도로 인한 세탁 효율 저하 및 쌀쌀한 기온 감지
Result	"가벼운 외투를 챙기세요. 오늘은 실내 건조를 권장합니다." 가이드 출력
검증 결과	성공 — 생활 밀착형 메시지 출력 기능 요구사항 확인

Scenario 2 — 임계값 알림 및 데이터 내보내기 검증
항목	내용
Input	PM2.5 72㎍/㎥ (나쁨 임계값 초과), 사용자 알림 임계값: PM2.5 > 50㎍/㎥, 조회 기간: 최근 7일, 내보내기 형식: CSV
AI Analysis	PM2.5 값이 사용자 설정 임계가(50㎍/㎥)를 22㎍/㎥ 초과. 알림 발송 조건 충족 확인. 최근 7일 데이터 존재 확인 및 CSV 변환 가능 여부 검증.
Result	(1) "현재 PM2.5가 나쁨 수준입니다. 외출 시 마스크를 착용하세요. 알림 자동 발송. (2) 최근 7일 PM2.5,온도,습도 데이터를 포함한 CSV 파일 다운로드 링크 생성.
검증 결과	성공 — FR-010(임계값 초과 알림), FR-013(CSV 내보내기) 요구사항 동시 검증 완료


3. 유스케이스 (Use Case)
3.1 유스케이스 다이어그램 
아래 표는 주요 액터와 유스케이스의 관계를 정리한 것이다. (UML 다이어그램은 설계 문서에 별도 첨부)
액터	유스케이스
사용자	실시간 환경 데이터 조회
사용자	지도 기반 주변 환경 탐색
           사용자		지역 선택 및 변경
사용자	생활 밀착형 지수 확인 (세탁·운동·코디)
사용자	맞춤 오염 알림 설정 및 수신
      사용자		데이터 트렌드 분석 및 예측 조회
사용자	보고서 생성 및 PDF 내보내기
시스템	데이터 자동 수집 (주기적 갱신)
시스템	오염 임계값 초과 시 알림 발송




3.2 상세 유스케이스 명세
UC-01: 실시간 환경 데이터 조회
항목	내용
유스케이스 ID	UC-01
액터	사용자
사전 조건	인터넷 연결 상태, 시스템 정상 작동 중
기본 흐름	1. 사용자가 대시보드 접속 → 2. 지역 선택 → 3. 시스템이 최신 데이터 표시 (PM2.5, PM10, 온도, 습도, CO2) → 4. 사용자가 그래프 확인
대안 흐름	데이터 수신 실패 시 '데이터를 불러올 수 없습니다' 메시지 표시 및 재시도 버튼 제공
사후 조건	최신 환경 데이터가 화면에 표시됨

UC-02: 맞춤 알림 설정
항목	내용
유스케이스 ID	UC-02
액터	사용자
사전 조건	인터넷 연결 상태
기본 흐름	1. 알림 설정 메뉴 접근 → 2. 알림 받을 환경 지표 선택 (PM2.5, CO2 등) → 
3. 저장
대안 흐름	알림 설정 실패 시 “다시 알림 설정 필요' 메시지 표시 및 재시도 버튼 제공
사후 조건	설정된 임계값 초과 시 알림 발송

UC-03: 보고서 및 데이터 내보내기
항목	내용
유스케이스 ID	UC-03
액터	사용자 
사전 조건	조회 기간 내 데이터 존재
기본 흐름	1. 데이터 내보내기 메뉴 접근 → 2. 조회 기간 및 지표 선택 → 3. 형식 선택 (CSV 또는 PDF) → 4. 시스템이 파일 생성 → 5. 사용자가 다운로드
대안 흐름	선택 기간에 데이터가 없을 경우 '해당 기간의 데이터가 없습니다' 메시지 표시
사후 조건	선택한 기간의 환경 데이터가 CSV 또는 PDF 파일로 다운로드됨




UC-04: 트렌드 분석 및 예측 조회
항목	내용
유스케이스 ID	UC-04
액터	사용자
사전 조건	인터넷 연결 상태, 시스템 정상 작동 중
기본 흐름	1. 트렌드 분석 메뉴 접근 → 2. 분석 기간 선택 (7일 또는 30일) → 3. 지표 선택 (PM2.5, 온도 등) → 4. 시스템이 이동 평균 및 추세선 계산 → 5. 꺾은선 그래프로 결과 표시
대안 흐름	데이터 부족 시 '분석에 필요한 데이터가 충분하지 않습니다' 메시지 표시
사후 조건	선택한 기간의 트렌드 그래프 및 추세선이 화면에 표시됨

UC-05: 지도 기반 주변 환경 탐색
항목	내용
유스케이스 ID	UC-05
액터	사용자
사전 조건	인터넷 연결 상태, 구글 지도 API 정상 호출 가능 상태
기본 흐름	1. 사용자가 '위치 보기' 탭 클릭 → 2.구글 지도가 랜더링되며 사용자 현재 위치 기반으로 핀 표시→ 3. 핀 클릭 시 해당 위치의 환경 데이터 팝업 표시
대안 흐름	사용자가 위치 정보 제공 거부 시, 기본 설정 지역을 중심으로 지도 표시
사후 조건	사용자는 선택한 위치를 지도 상에서 직관적으로 확인 가능함

UC-06: AI 기반 생활 밀착형 지수 카드 생성
항목	내용
유스케이스 ID	UC-06
액터	사용자
사전 조건	환경 데이터 정상 수집 완료
기본 흐름	1. 시스템이 실시간 수집 데이터를 AI 모델로 전송 → 2.AI가 세탁,운동,코디 등에 대한 종합 행동 가이드 문구 생성→ 3. 대시보드 화면에 카드 UI 형태로 출력
대안 흐름	AI 통신 지연 또는 장애 발생 시, '다시 시도' 메시지 표시 및 재시도 버튼 제공
사후 조건	사용자는 수치가 아닌 일상적 언어로 번역된 맞춤형 행동 가이드 확인함

4. 기능 요구사항 (Functional Requirements)
4.1 데이터 수집 및 연동
요구사항 ID	기능 분류	요구사항 설명	우선순위	출처
FR-001	데이터 수집	시스템은 5분 간격으로 데이터를 요청(Polling)하되, 외부 API(에어코리아 등)의 실제 업데이트 주기(최대 1시간)를 고려하여 최신성(Recency)을 유지해야 한다. 시뮬레이션 데이터는 5분 단위로 생성한다.	High	페르소나 1
FR-002	API 연동	OpenWeatherMap 또는 AirKorea 공개 API와 연동하여 실제 데이터를 사용할 수 있어야 한다.	High	페르소나 1
FR-003	시뮬레이션 모드	실제 API 없이도 시뮬레이션 데이터로 시스템이 동작해야 한다.	Medium	개발 편의

4.2 실시간 대시보드
요구사항 ID	기능 분류	요구사항 설명	우선순위	출처
FR-004	대시보드 표시	수집된 데이터(PM2.5, PM10, 온도, 습도, CO2)를 대시보드에 실시간으로 표시해야 한다.	High	페르소나 1,3
FR-005	상태 표시	데이터 수준에 따라 '좋음/보통/나쁨/매우 나쁨' 상태를 색상 코드와 함께 표시해야 한다.	High	페르소나 1,3
FR-006	시간대별 그래프	지난 24시간의 환경 데이터를 시간대별 꺾은선 그래프로 표시해야 한다.	High	페르소나 2
FR-007	지역 선택	사용자가 모니터링할 지역을 선택하거나 변경할 수 있어야 한다.	Medium	페르소나 1,3
FR-008	생활 밀착형 지수 카드	기온·습도·미세먼지 데이터를 AI 모델로 분석하여 세탁지수, 운동지수, 코디 추천 등의 카드형 UI를 생성 및 제공해야 한다.	High	페르소나 3
FR-009	지도 기반 탐색
    구글 지도 API를 활용하여 대시보드 내에 지도를 렌더링하고 위치를 표시해야 한다.
    Medium	페르소나 1






4.3 알림 기능 
요구사항 ID	기능 분류	요구사항 설명	우선순위	출처
FR-010	임계값 초과 알림	설계자가 설정한 임계값 초과 시 알림 탭에 알림을 발송해야 한다.	High	페르소나 1,3
FR-011	알림 이력	발송된 알림 내역을 목록으로 조회할 수 있어야 한다.	Low	페르소나 1,3
4.4 데이터 분석 및 내보내기
요구사항 ID	기능 분류	요구사항 설명	우선순위	출처
FR-012	트렌드 분석	최근 7일 또는 30일 데이터의 이동 평균을 계산하여 추세선을 그래프에 표시해야 한다.	Medium	페르소나 2
FR-013	CSV 내보내기	사용자는 특정 기간의 데이터를 CSV 파일로 다운로드할 수 있어야 한다.	Medium	페르소나 2
FR-014	PDF 보고서	일반 사용자용 단순 대시보드 캡처 PDF를 내보낼 수 있어야 한다. (법적 효력이 없는 개인 보관용 스냅샷)	Low	페르소나 2
FR-015		향후 공기질 예측	과거 데이터를 기반으로 향후 공기질 및 기상 추이를 예측하여 표시해야 한다.	Medium	페르소나 3 




5. 비기능 요구사항 (Non-Functional Requirements)
5.1 성능
대시보드 초기 로딩 시간은 3초 이내여야 한다.
데이터 갱신(폴링) 주기는 5분이며, 갱신 중에도 화면이 멈추지 않아야 한다.
동시 접속자 50명 이상을 처리할 수 있어야 한다.
AI 분석 결과를 가져오는 데 소요되는 시간이 시스템에 병목을 주지 않아야 한다.

5.2 보안
API 키는 환경변수(.env)로 관리하며 클라이언트에 노출되지 않아야 한다.
사용자 비밀번호는 bcrypt 등의 방식으로 암호화하여 저장해야 한다.
HTTPS 프로토콜을 통해서만 서비스를 제공해야 한다.

5.3 사용성
색상 코드(초록/노랑/빨강)와 텍스트를 함께 사용하여 색각 이상자도 상태를 인식할 수 있어야 한다.
모바일(375px 이상) 및 데스크톱 해상도를 모두 지원하는 반응형 UI를 제공해야 한다.
사용자 화면은 수치보다 카드형 체감 지수 중심으로 구성하여 직관성을 높여야 한다.

5.4 유지보수성
프론트엔드와 백엔드를 분리하여 각각 독립적으로 수정·배포할 수 있도록 한다.
GitHub Actions 또는 유사 CI/CD 도구를 통해 자동 배포 파이프라인을 구축한다.

6. 제약 사항 및 가정
6.1 제약 사항
실제 IoT 센서 구매 및 연결은 본 프로젝트 범위에 포함하지 않는다.
외부 API 무료 티어의 호출 제한을 초과하지 않는 수준에서 개발한다.
배포 환경은 무료 플랜(Vercel, Render, Railway 등)을 사용하므로 성능에 제한이 있을 수 있다.

6.2 가정
사용자는 최신 버전의 크롬, 파이어폭스, 사파리 브라우저를 사용한다고 가정한다.
인터넷 연결이 가능한 환경에서만 서비스를 사용한다고 가정한다.
시뮬레이션 데이터는 실제 환경 측정값과 유사한 패턴으로 생성한다고 가정한다.

-------------------------------------------------------------------------------
﻿설계 문서
Design Document
환경 모니터링 대시보드
작성일	2026년 5월 22일
과목명	소프트웨어 공학
담당 교수	이혁 교수님
팀 번호	13조
팀원	심민준, 최길웅, 박미르, 류석종


목차
1. 문서 개요
1.1 목적
1.2 범위 및 참고 문서
1.3 아키텍처 개요
2. 클래스 다이어그램 (Class Diagram)
2.1 다이어그램
2.2 주요 클래스 명세
2.3 관계 및 설계 결정 근거
3. 시퀀스 다이어그램 (Sequence Diagram)
3.1 시나리오 1: 실시간 대시보드 조회
3.2 시나리오 2: 스케줄링 폴링 및 맞춤 알림 발송
4. GOF 디자인 패턴 통합 설계
4.1 옵저버 패턴
4.2 팩토리 메서드 패턴
5. REST API 인터페이스 명세
6. 데이터베이스 스키마 설계

1. 문서 개요
1.1 목적
본 설계 문서는 '환경 모니터링 대시보드' 시스템의 소프트웨어 설계 구조를 명세하기 위해 작성되었다. 요구사항 명세서(SRS)에서 정의된 유스케이스 UC-01~UC-06와 기능 요구사항을 실제 구현 가능한 소프트웨어 구조로 변환하는 것이 목표이다.

본 문서는 정적 구조를 표현하는 클래스 다이어그램과 동적 행위를 표현하는 시퀀스 다이어그램 2종, 그리고 아키텍처 개요를 포함한다. 모든 UML 다이어그램은 특정 구현 기술에 종속되지 않는 PIM(Platform Independent Model) 수준으로 작성하였다.

1.2 범위 및 참고 문서
소프트웨어공학_13조_요구사항 문서
ISO/IEC/IEEE 29148:2018 — Requirements Engineering
Gamma et al., Design Patterns (GoF), Addison-Wesley, 1994
Kruchten, P., Architectural Blueprints — The 4+1 View Model, IEEE Software, 1995

1.3 아키텍처 개요
본 시스템은 3-Tier 클라이언트-서버 아키텍처를 채택한다. 사용자 브라우저(Presentation Tier), 백엔드 서버(Business Logic Tier), 데이터베이스(Data Tier)로 물리적으로 분리되어 독립 배포가 가능하다.

계층 (Tier)	구성 요소	역할 및 책임
Presentation	React (프론트엔드)	사용자 인터페이스 렌더링, 대시보드 카드/그래프 표시, 지역 선택 등 이벤트 처리
Business Logic	백엔드 서버	WeatherEngine(폴링/저장/알림 발행), AlertManager(알림 검증), TrendAnalyzer(통계 분석 및 공기질 예측, FR-015) 핵심 비즈니스 로직 처리
Data	PostgreSQL DB + External API	환경 측정 시계열 로그 영속 저장, 사용자/알림설정 관리, AirKorea Open API 연동
[표 1] 3-Tier 아키텍처 계층별 구성 요소 및 역할

백엔드 내부 구조는 계층형 아키텍처(Layered Architecture)를 적용하여 Presentation Layer (Controller) → Business Logic Layer (Service/Engine) → Persistence Layer (Repository) 방향으로만 의존성이 흐르도록 설계하였다. 역방향 의존 및 계층 건너뛰기(Layer Skipping)는 전면 금지된다.


2. 클래스 다이어그램 (Class Diagram)
2.1 다이어그램
다음 클래스 다이어그램은 시스템의 핵심 도메인 객체와 정적 관계를 UML 2.x 표기법으로 표현한 PIM 수준의 설계 명세이다. 클래스 간 관계(일반화, 연관, 의존, 실체화)와 다중성 제약을 포함한다. 옵저버·팩토리 패턴 관련 클래스(AlertManager, NotificationFactory, EmailNotification, PushNotification)와 인터페이스(«interface» Observer, «interface» Notification)를 포함하였다.


[그림 1] 환경 모니터링 대시보드 클래스 다이어그램 

2.2 주요 클래스 명세
다이어그램에 표현된 주요 클래스·인터페이스의 속성(Fields)과 오퍼레이션(Methods)을 다음 표에 정리한다.

클래스명	주요 속성 (Fields)	주요 오퍼레이션 (Methods)
User (슈퍼클래스)	userId: String selectedRegion: String	viewRealtimeDashboard(region) updateSelectedRegion(region)
MemberUser (서브클래스)	alertSettings: List<CustomAlert>	createAlertSetting(dto) exportDataHistory(period, format) getTrendAnalysis(period)
DashboardController	weatherEngine: WeatherEngine trendAnalyzer: TrendAnalyzer	getDashboardData(request) handleRegionChange(request)
WeatherEngine «Subject»	pollingInterval: int = 5 apiSecretKey: String (private) observers: List<Observer>	fetchAirKoreaData(region) processLifestyleIndexes(raw) notifyObservers(EnvironmentDto) filterOutliers(data) [private] getLatestData(region): EnvironmentDto
TrendAnalyzer	movingAveragePeriod: int = 7 envRepository: Repository	calculateMovingAverage(days) predictAirQualityForecast(history)
CustomAlert	alertId: String userId: String targetMetric: String thresholdValue: double alertChannel: String	checkThreshold(currentValue) formatMessage()
EnvironmentRepository	dbConnectionPool: Pool (private)	insertEnvironmentLog(entity) selectHistoryByPeriod(start, end)
«interface» Observer	(없음)	update(EnvironmentDto) [추상]
AlertManager (implements Observer)	alertSettings: List<AlertSetting>	update(EnvironmentDto) checkThresholds(dto) triggerAlert(userId, metric) getAlertHistory(userId): List<AlertRecord>
«interface» Notification	(없음)	send(userId, message) [추상]
NotificationFactory «static»	(없음)	create(channel): Notification [static]
PushNotification (implements Notification)	(없음)	send(userId, message) [알림 발송]
[표 2] 클래스별 속성 및 오퍼레이션 명세 (인터페이스 및 패턴 클래스 포함)

2.3 관계 및 설계 결정 근거
다중성 제약 및 합성 관계 (MemberUser 1 ◆── 0..* CustomAlert)
한 명의 계정은 알림 설정을 0개 이상 가질 수 있으나, 각 CustomAlert 객체는 반드시 1명의 사용자에게만 귀속된다. MemberUser가 삭제될 때 소속된 CustomAlert도 함께 삭제되는 강한 소유 관계이므로 합성 연관(Composition, 채워진 마름모)으로 표현한다. 데이터베이스 외래키 제약(alert_settings.user_id → users.id, CASCADE DELETE)과 1:1로 매핑된다.

실체화 관계 (AlertManager implements Observer / EmailNotification implements Notification)
옵저버 패턴과 팩토리 메서드 패턴에서 요구하는 인터페이스 계약을 실체화 관계(점선 + 빈 삼각형)로 명시하였다. 이를 통해 WeatherEngine은 구체적인 AlertManager의 존재를 모른 채 Observer 인터페이스만을 통해 통지하고, 알림 서비스는 Notification 인터페이스만을 통해 발송 채널을 다형적으로 처리한다.


3. 시퀀스 다이어그램 (Sequence Diagram)
시스템의 동적 행위를 표현하기 위해 SRS의 핵심 유스케이스 2개를 시나리오별 시퀀스 다이어그램으로 모델링하였다. 실선 화살표는 동기식 메시지 호출, 점선 화살표는 반환(Return)을 나타낸다.

3.1 시나리오 1: 실시간 대시보드 조회 (데이터 주도형)
사용자가 지역을 선택하면 DashboardController가 WeatherEngine을 통해 EnvironmentRepository(DB)에서 가장 최신의 환경 데이터(5분마다 스케줄러가 저장한 값)를 SELECT하여 반환하는 흐름이다. 사용자 조회 시마다 외부 API를 직접 호출하지 않음으로써 API Rate Limit 초과 위험을 제거하고 응답 시간 목표(3초 이내)를 달성한다.


[그림 2] 시퀀스 다이어그램 — 시나리오 1: 실시간 대시보드 조회

핵심 설계 포인트
DashboardController → WeatherEngine으로 처리를 위임 — 컨트롤러가 비즈니스 로직을 직접 처리하지 않도록 분리 (SRP 준수)
4번 메시지: WeatherEngine → EnvironmentRepository SELECT — 사용자 조회 시 외부 AirKorea API 직접 호출 제거. 시나리오 2 스케줄러가 5분마다 저장한 DB 최신값을 읽어옴
6번 메시지(processLifestyleIndexes): pm2.5·온도·습도 원시 수치를 세탁지수·운동지수·코디지수로 변환 — 비즈니스 레이어 완전 캡슐화
전체 응답 시간 목표: 3초 이내 


3.2 시나리오 2: 스케줄러 폴링 및 맞춤 알림 발송 (이벤트 주도형)
사용자 개입 없이 5분 주기 타이머 이벤트에 의해 WeatherEngine이 AirKorea API를 폴링하고, 수집된 데이터를 DB에 저장한 후 Observer로 등록된 AlertManager에 알림을 전파하는 이벤트 주도형 흐름이다.


[그림 3] 시퀀스 다이어그램 — 시나리오 2: 알림 발송

핵심 설계 포인트
발행자 명칭 통일: 시나리오 2의 타이머 이벤트 수신 및 Observer 알림 발행 주체를 WeatherEngine으로 통일 (표 3 옵저버 패턴 명세와 일치)
1번 메시지(Timer Event): SystemScheduler 5분 타이머 만료 신호 — Non-blocking I/O 처리로 UI 스레드 중단 없음
5번 메시지(notifyObservers): 옵저버 패턴 핵심 구간 — AlertManager가 Observer로 등록되어 WeatherEngine 상태 변경 시 자동 실행
8번 메시지(checkThreshold): 조건 이벤트 발화점 — 설계자가 설정한 단계값보다 높을때에 상태 True로 전이되어 알림 트리거 생성
10번 메시지(POST /send-alert): 외부 AlertServer로의 비동기 REST 전송 — 발송 결과를 기다리지 않아 서비스 응답성 유지


4. GoF 디자인 패턴 통합 설계
객체 간 결합도를 완화하고 개방-폐쇄 원칙(OCP)을 달성하기 위해 GoF 디자인 패턴 2종을 적용하였다.

4.1 옵저버 패턴 (Observer Pattern)
적용 배경 및 문제 상황
5분 주기로 WeatherEngine이 대기질 데이터를 수집할 때, AlertManager와 TrendAnalyzer가 동시에 반응해야 한다. WeatherEngine 내부에 두 클래스를 직접 인스턴스화하면 강결합이 형성되어 새로운 구독 모듈 추가 시마다 소스코드 수정이 필요한 OCP 위반이 발생한다.

설계 구조
역할	할당 클래스	책임
Subject (발행자)	WeatherEngine	Observer 등록/해제(subscribe/unsubscribe), 상태 변경 시 notifyObservers() 호출
«interface» Observer	Observer (interface)	update(EnvironmentDto) 오퍼레이션 규격 정의
ConcreteObserver	AlertManager	update() 구현 — 임계값 검증 로직 실행
(확장 가능)	TrendAnalyzer 등	동일 Observer 인터페이스 구현으로 WeatherEngine 변경 없이 추가 가능
[표 3] 옵저버 패턴 역할 분배

기대 효과
WeatherEngine은 AlertManager의 존재를 알 필요 없음 → 완전한 느슨한 결합(Loose Coupling)
새로운 구독 모듈 추가 시 기존 코드 수정 없이 Observer 등록만으로 확장 가능

4.2 팩토리 메서드 패턴 (Factory Method Pattern)
적용 배경 및 문제 상황
임계값 초과 이벤트 발생 시 알림을 발송해야 한다. 서비스 클래스 내부에 구체 클래스를 직접 생성하면 채널 추가 시마다 기존 코드를 수정해야 하는 OCP 위반이 발생한다.


설계 구조
역할	할당 클래스/인터페이스	책임
Factory (생성 위임)	NotificationFactory (static)	channel 문자열을 받아 적절한 Notification 구현 인스턴스 반환
«interface» Notification	Notification (interface)	send(userId, message) 오퍼레이션 규격 정의
ConcreteProduct	EmailNotification PushNotification	각 채널에 맞는 send() 구현 (알림탭에 알림 푸시)
[표 4] 팩토리 메서드 패턴 역할 분배

기대 효과
알림 서비스 클래스는 factory.create(channel).send() 한 줄로 구체 클래스 정체를 모른 채 호출 가능
새로운 채널(KakaoNotification 등) 추가 시 기존 코드 무수정 확장 가능

5. REST API 인터페이스 명세
프론트엔드와 백엔드의 결합도를 규격화하기 위해 주요 API 엔드포인트를 다음과 같이 정의한다. 인증이 필요한 모든 엔드포인트의 요청 헤더에는 Authorization: Bearer <JWT> 가 강제된다.

Method	Endpoint	인증	설명 및 처리 계층
GET	/api/dashboard?region={name}	불필요	지정 지역의 최신 대기질 + 세탁/운동/코디 지수 반환 — DB에서 캐시된 최신값 조회 (UC-01, UC-06)
POST	/api/alerts/settings	필요	지표별 알림 단계 설정 및 발송 설정 저장 (UC-02)
GET	/api/analysis/trends?period={7d|30d}	필요	이동평균 및 추세선 차트용 통계 배열 반환 (UC-04, TrendAnalyzer)
GET	/api/analysis/export?format={csv|pdf}	필요	환경 데이터 파일 다운로드 스트림 생성 (UC-03)
[표 5] REST API 엔드포인트 명세

6. 데이터베이스 스키마 설계 (PSM 수준)
PIM 수준의 클래스 다이어그램을 PostgreSQL 관계형 데이터베이스 환경에 맞게 변환한 PSM 수준의 DDL 명세이다.

테이블명	컬럼명	타입	설명 및 제약
users	id	SERIAL PK	자동 증가 기본키
environment_logs	id	SERIAL PK	자동 증가 기본키
    region	VARCHAR(50) NOT NULL	측정 지역명
    pm25, pm10, co2	FLOAT NOT NULL	미세먼지 농도 (μg/m³) / CO₂ 농도 (ppm)
    temperature, humidity	FLOAT NOT NULL	온도(℃), 습도(%)
    measured_at	TIMESTAMPTZ NOT NULL	실제 측정 시각 (UTC)
    source	VARCHAR(20) NOT NULL	'api' 또는 'simulation' 구분
alert_settings	id	SERIAL PK	자동 증가 기본키
    user_id	INTEGER FK → users.id	CASCADE DELETE 적용
    metric	VARCHAR(20) NOT NULL	'pm25', 'co2', 'temperature'
    threshold_value	FLOAT NOT NULL	설계자가 지정한 알림 임계 수치ID(예:PM 2.5 > 50.0시 알림)
    channel	VARCHAR(10) NOT NULL	알림탭에 알림 푸시
[표 6] 데이터베이스 테이블 스키마 (PostgreSQL DDL 기반)

environment_logs 테이블에는 지역별 시계열 대량 쿼리 성능 최적화를 위해 복합 인덱스 CREATE INDEX idx_env_region_time ON environment_logs (region, measured_at DESC) 를 생성한다.



