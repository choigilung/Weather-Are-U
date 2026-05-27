const express = require('express');
const weatherEngine = require('./src/services/weatherEngine');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('환경 모니터링 시스템 백엔드 코어 정상 작동 중!');
});

app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
  startDataCollectionScheduler();
});

// 5분 주기 비동기 자동 수집 엔진 가동 (FR-001)
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
  collectAllData(); // 최초 즉시 가동
  setInterval(collectAllData, 5 * 60 * 1000); // 5분 루프
}