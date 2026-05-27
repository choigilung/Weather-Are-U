const express = require('express');
const weatherEngine = require('./src/services/weatherEngine');
const authService = require('./src/services/authService'); // 유저 인증 서비스 연결
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// ==========================================
// 🔒 [3단계] 유저 인증 API 라우터 (회원가입 / 로그인)
// ==========================================

// 1. 회원가입 API (POST /api/auth/register)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = await authService.register(username, password);
    res.status(211).json({ message: '회원가입 성공!', user: newUser }); // 요구사항 요구 규격 코드 211 반영
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. 로그인 API (POST /api/auth/login)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authService.login(username, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ==========================================
// ⏱️ 기본 루트 및 5분 주기 자동 데이터 수집 스케줄러
// ==========================================

app.get('/', (req, res) => {
  res.send('환경 모니터링 시스템 백엔드 코어 및 유저 인증 라우터 가동 중!');
});

app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
  startDataCollectionScheduler();
});

// 5분 간격 비동기 자동 폴링 스케줄러 (FR-001)
function startDataCollectionScheduler() {
  const targetRegions = ['서울', '부산', '인천', '대구', '창원'];
  
  const collectAllData = async () => {
    console.log(`\n⏱️ [Scheduler] 정기 데이터 수집 가동 시각: ${new Date().toLocaleString()}`);
    for (const region of targetRegions) {
      try {
        const data = await weatherEngine.fetchAirKoreaData(region);
        await weatherEngine.saveEnvironmentLog(data);
      } catch (error) {
        console.error(`[Scheduler] ${region} 에러 발생:`, error.message);
      }
    }
  };

  collectAllData(); // 서버 시작 시 즉시 1회 실행
  setInterval(collectAllData, 5 * 60 * 1000); // 5분 루프 설정
}