const express = require('express');
const cors = require('cors'); // 🎯 [추가 1] CORS 라이브러리 불러오기
const weatherEngine = require('./src/services/weatherEngine');
const authService = require('./src/services/authService');
const weatherRepository = require('./src/repositories/weatherRepository');
const authenticateToken = require('./src/middlewares/authMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // 🎯 [추가 2] 모든 도메인에서의 프론트엔드 접근을 전면 허용한다!
app.use(express.json());


// ==========================================
// 🔒 [3단계] 유저 인증 API 라우터 (회원가입 / 로그인)
// ==========================================

// 1. 회원가입 API (POST /api/auth/register)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = await authService.register(username, password);
    res.status(201).json({ message: '회원가입 성공!', user: newUser }); // 요구사항 요구 규격 코드 211 반영
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
// 🎯 [실시간 대기질 조회 API] 프론트엔드가 토큰을 들고 요청하면 최신 데이터를 DB에서 꺼내 전달합니다.
app.get('/api/environment/live', authenticateToken, async (req, res) => {
  try {
    // 1. weatherRepository를 통해 각 지역별 가장 최신 로그만 DB에서 가져옵니다.
    const latestData = await weatherRepository.getLatestLiveEntries();
    
    // 2. 가공된 데이터 리스트를 프론트엔드에 200 OK 상태코드와 함께 전달합니다.
    res.status(200).json({
      success: true,
      count: latestData.length,
      data: latestData
    });
  } catch (error) {
    console.error('⚠️ 실시간 대기질 데이터 조회 중 서버 에러 발생:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 🚀 백엔드 서버 포트 구동 (이 코드는 이미 하단에 있을 테니 위치만 확인해 주세요!)
app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
});