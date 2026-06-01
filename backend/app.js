const express = require('express');
const cors = require('cors');
const weatherEngine = require('./src/services/weatherEngine');
const authService = require('./src/services/authService');
const weatherRepository = require('./src/repositories/weatherRepository');
const authenticateToken = require('./src/middlewares/authMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = await authService.register(username, password);
    res.status(201).json({ message: '회원가입 성공!', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authService.login(username, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/environment/live', authenticateToken, async (req, res) => {
  try {
    const latestData = await weatherRepository.getLatestLiveEntries();
    res.status(200).json({ success: true, count: latestData.length, data: latestData });
  } catch (error) {
    console.error('실시간 데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/environment/history/:region', authenticateToken, async (req, res) => {
  try {
    const { region } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const data = await weatherRepository.getHistoryByRegion(region, limit);
    res.status(200).json({ success: true, region, data });
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.post('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const { region, metric, threshold, condition } = req.body;
    const userId = req.user.id;
    const alert = await weatherRepository.saveAlertSetting({ userId, region, metric, threshold, condition });
    res.status(201).json({ message: '알림 설정 완료!', alert });
  } catch (error) {
    console.error('알림 설정 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alerts = await weatherRepository.getAlertsByUser(userId);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.delete('/api/alerts/:id', authenticateToken, async (req, res) => {
  try {
    await weatherRepository.deleteAlert(req.params.id, req.user.id);
    res.status(200).json({ message: '알림 삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '환경 모니터링 백엔드 가동 중', time: new Date().toISOString() });
});

function startDataCollectionScheduler() {
  const targetRegions = ['서울', '부산', '인천', '대구', '창원'];

  const collectAllData = async () => {
    console.log(`\n⏱️ [Scheduler] 데이터 수집 시작: ${new Date().toLocaleString()}`);
    for (const region of targetRegions) {
      try {
        const data = await weatherEngine.fetchAirKoreaData(region);
        await weatherEngine.saveEnvironmentLog(data);
      } catch (error) {
        console.error(`[Scheduler] ${region} 오류:`, error.message);
      }
    }
  };

  collectAllData();
  setInterval(collectAllData, 5 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  startDataCollectionScheduler();
});