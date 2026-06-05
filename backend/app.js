const express = require('express');
const cors = require('cors');
const weatherEngine = require('./src/services/weatherEngine');
const weatherRepository = require('./src/repositories/weatherRepository');
const userRepository = require('./src/repositories/userRepository');
const trendAnalyzer = require('./src/services/trendAnalyzer');
const forecastService = require('./src/services/forecastService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const TARGET_REGIONS = ['서울', '부산', '인천', '대구', '창원'];

app.use(cors());
app.use(express.json());

app.get('/api/environment/live', async (req, res) => {
  try {
    const latestData = await weatherRepository.getLatestLiveEntries();
    res.status(200).json({ success: true, count: latestData.length, data: latestData });
  } catch (error) {
    console.error('실시간 데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const latestData = await weatherRepository.getLatestLiveEntries();
    const region = req.query.region;
    const selected = region
      ? latestData.find((item) => item.region === region)
      : latestData[0];

    res.status(200).json({
      success: true,
      region: region || selected?.region || null,
      data: selected || null,
      allRegions: latestData,
    });
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/environment/history/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const hours = req.query.hours ? parseInt(req.query.hours, 10) : null;
    const data = await weatherRepository.getHistoryByRegion(region, { limit, hours });
    res.status(200).json({ success: true, region, data });
  } catch (error) {
    console.error('이력 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

async function createAlertSetting(req, res) {
  try {
    const { region, metric, threshold, condition } = req.body;
    const userId = await userRepository.findOrCreateGuestUserId();
    const alert = await weatherRepository.saveAlertSetting({
      userId,
      region,
      metric,
      threshold,
      condition,
    });
    res.status(201).json({ message: '알림 설정을 저장했습니다.', alert });
  } catch (error) {
    console.error('알림 설정 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}

async function getAlertSettings(req, res) {
  try {
    const userId = await userRepository.findOrCreateGuestUserId();
    const alerts = await weatherRepository.getAlertsByUser(userId);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}

app.post('/api/alerts', createAlertSetting);
app.post('/api/alerts/settings', createAlertSetting);
app.get('/api/alerts', getAlertSettings);
app.get('/api/alerts/settings', getAlertSettings);

app.get('/api/alerts/history', async (req, res) => {
  try {
    const userId = await userRepository.findOrCreateGuestUserId();
    await weatherRepository.cleanupOldAlertRecords(userId, 5);
    const records = await weatherRepository.getAlertRecordsByUser(userId);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('알림 이력 조회 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.patch('/api/alerts/history/:id/read', async (req, res) => {
  try {
    const userId = await userRepository.findOrCreateGuestUserId();
    await weatherRepository.markAlertRecordAsRead(req.params.id, userId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/weather/forecast', async (req, res) => {
  try {
    const { region } = req.query;
    if (!region) return res.status(400).json({ error: 'region 파라미터가 필요합니다.' });
    const data = await forecastService.getWeatherForecast(region);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[weather/forecast]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/trends', async (req, res) => {
  try {
    const result = await trendAnalyzer.getTrendAnalysis({
      region: req.query.region,
      metric: req.query.metric || 'pm25',
      period: req.query.period || '7d',
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/analysis/forecast', async (req, res) => {
  try {
    const result = await trendAnalyzer.getForecast({
      region: req.query.region,
      metric: req.query.metric || 'pm25',
      period: req.query.period || '7d',
      days: req.query.days ? parseInt(req.query.days, 10) : 3,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/analysis/export', async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, region } = req.query;
    const metrics = String(req.query.metrics || 'pm25,pm10,temperature,humidity,co2')
      .split(',')
      .map((metric) => metric.trim())
      .filter(Boolean);

    if (format !== 'csv') return res.status(400).json({ error: 'format=csv만 지원합니다.' });
    if (!startDate || !endDate || !region) {
      return res.status(400).json({ error: 'startDate, endDate, region query parameter가 필요합니다.' });
    }

    const { columns, rows } = await weatherRepository.getEnvironmentLogsForExport({ region, startDate, endDate, metrics });
    if (rows.length === 0) {
      return res.status(404).json({ error: '선택 기간에 데이터가 없습니다.' });
    }

    const csv = toCsv(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="environment-data.csv"');
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    console.error('CSV 내보내기 오류:', error);
    return res.status(500).json({ error: 'CSV 파일 생성 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/alerts/:id', async (req, res) => {
  try {
    const userId = await userRepository.findOrCreateGuestUserId();
    await weatherRepository.deleteAlert(req.params.id, userId);
    res.status(200).json({ message: '알림을 삭제했습니다.' });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '환경 모니터링 백엔드가 실행 중입니다.',
    time: new Date().toISOString(),
  });
});

function startDataCollectionScheduler() {
  const collectAllData = async () => {
    console.log(`\n[Scheduler] 데이터 수집 시작: ${new Date().toLocaleString()}`);

    for (const region of TARGET_REGIONS) {
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
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  startDataCollectionScheduler();
});

function toCsv(columns, rows) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const text = value instanceof Date ? value.toISOString() : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
}
