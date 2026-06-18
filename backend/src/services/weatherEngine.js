const db = require('../repositories/db');
const axios = require('axios');
const alertManager = require('./alertManager');
require('dotenv').config();

// AirKorea/기상청 관측값은 시간 단위로만 갱신되므로, 5분 폴링마다 호출하면
// 일일 API 호출 한도(통상 1,000회)를 빠르게 초과한다. 지역별로 약 55분간 캐시해 재사용한다.
const CACHE_TTL_MS = 55 * 60 * 1000;

function isCacheValid(entry) {
  return Boolean(entry) && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

class WeatherEngine {
  constructor() {
    this.pollingInterval = 5;
    this.observers = [];
    this.airKoreaCache = new Map();
    this.weatherCache = new Map();
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  notifyObservers(data) {
    this.observers.forEach((observer) => observer.update(data));
  }

  generateSimulationData(region) {
    return {
      region,
      pm25: Math.floor(Math.random() * 80) + 5,
      pm10: Math.floor(Math.random() * 120) + 10,
      co2: Math.floor(Math.random() * 300) + 350,
      temperature: parseFloat((Math.random() * 15 + 15).toFixed(1)),
      humidity: Math.floor(Math.random() * 40) + 40,
      measured_at: new Date(),
      source: 'simulation',
    };
  }

  async fetchAirKoreaData(region) {
    const sidoMap = {
      서울: '서울',
      부산: '부산',
      인천: '인천',
      대구: '대구',
      창원: '경남',
      광주: '광주',
      대전: '대전',
      강릉: '강원',
      전주: '전북',
      울산: '울산',
      제주: '제주',
    };

    const apiKey = process.env.AIRKOREA_API_KEY;
    if (!apiKey) return this.generateSimulationData(region);

    let airData = this.airKoreaCache.get(region);
    if (!isCacheValid(airData)) {
      try {
        const response = await axios.get('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty', {
          params: {
            serviceKey: apiKey,
            returnType: 'json',
            numOfRows: 100,
            pageNo: 1,
            sidoName: sidoMap[region] || region,
            ver: '1.0',
          },
          timeout: 10000,
        });

        const items = response.data?.response?.body?.items;
        if (!items || items.length === 0) {
          console.log(`[WeatherEngine] ${region} API 데이터 없음. 시뮬레이션 데이터를 사용합니다.`);
          return this.generateSimulationData(region);
        }

        const item = items[0];
        airData = {
          pm25: parseFloat(item.pm25Value) || null,
          pm10: parseFloat(item.pm10Value) || null,
          fetchedAt: Date.now(),
        };
        this.airKoreaCache.set(region, airData);
      } catch (error) {
        console.error(`[WeatherEngine] ${region} API 오류:`, error.message);
        return this.generateSimulationData(region);
      }
    }

    const weatherData = await this.fetchWeatherData(region);

    return {
      region,
      pm25: airData.pm25 ?? Math.floor(Math.random() * 80) + 5,
      pm10: airData.pm10 ?? Math.floor(Math.random() * 120) + 10,
      co2: Math.floor(Math.random() * 300) + 350,
      temperature: weatherData?.temperature ?? parseFloat((Math.random() * 15 + 15).toFixed(1)),
      humidity: weatherData?.humidity ?? Math.floor(Math.random() * 40) + 40,
      measured_at: new Date(),
      source: 'api',
    };
  }

  async fetchWeatherData(region) {
    const cached = this.weatherCache.get(region);
    if (isCacheValid(cached)) return cached;

    const regionGrid = {
      서울: { nx: 60, ny: 127 },
      부산: { nx: 98, ny: 76 },
      인천: { nx: 55, ny: 124 },
      대구: { nx: 89, ny: 90 },
      창원: { nx: 89, ny: 76 },
      광주: { nx: 58, ny: 74 },
      대전: { nx: 67, ny: 100 },
      강릉: { nx: 92, ny: 131 },
      전주: { nx: 63, ny: 89 },
      울산: { nx: 102, ny: 84 },
      제주: { nx: 52, ny: 38 },
    };

    const grid = regionGrid[region];
    if (!grid) return null;

    const result = await this.getNowcastByGrid(grid.nx, grid.ny);
    if (!result) return cached || null;

    const entry = { ...result, fetchedAt: Date.now() };
    this.weatherCache.set(region, entry);
    return entry;
  }

  async getNowcastByGrid(nx, ny) {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) return null;

    try {
      // Render 서버는 UTC 기준 → KST(+9h) 변환 필요
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const baseDate = kst.toISOString().slice(0, 10).replace(/-/g, '');
      const hours = kst.getUTCHours();
      const minutes = kst.getUTCMinutes();
      // 초단기실황은 매시 30분 이후 발표 → 30분 이전이면 1시간 전 base
      let baseH = minutes < 30 ? hours - 1 : hours;
      const actualBaseDate = baseH < 0
        ? new Date(kst.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
        : baseDate;
      baseH = ((baseH % 24) + 24) % 24;
      const baseTime = `${String(baseH).padStart(2, '0')}00`;

      const response = await axios.get('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst', {
        params: {
          serviceKey: apiKey,
          pageNo: 1,
          numOfRows: 10,
          dataType: 'JSON',
          base_date: actualBaseDate,
          base_time: baseTime,
          nx,
          ny,
        },
        timeout: 10000,
      });

      const items = response.data?.response?.body?.items?.item;
      if (!items) return null;

      const temp = items.find((item) => item.category === 'T1H');
      const humidity = items.find((item) => item.category === 'REH');

      return {
        temperature: temp ? parseFloat(temp.obsrValue) : null,
        humidity: humidity ? parseFloat(humidity.obsrValue) : null,
      };
    } catch (error) {
      console.error('[WeatherEngine] 기상청 API 오류:', error.message);
      return null;
    }
  }

  async saveEnvironmentLog(data) {
    const queryText = `
      INSERT INTO environment_logs (region, pm25, pm10, co2, temperature, humidity, measured_at, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
    `;
    const values = [
      data.region,
      data.pm25,
      data.pm10,
      data.co2,
      data.temperature,
      data.humidity,
      data.measured_at,
      data.source,
    ];
    const res = await db.query(queryText, values);
    console.log(`[WeatherEngine] ${data.region} 저장 완료 (Log ID: ${res.rows[0].id}, source: ${data.source})`);

    await alertManager.checkThresholds(data);
    this.notifyObservers(data);
    return res.rows[0].id;
  }
}

module.exports = new WeatherEngine();
