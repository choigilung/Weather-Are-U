const axios = require('axios');
require('dotenv').config();

const REGION_GRID = {
  서울: { nx: 60, ny: 127 },
  부산: { nx: 98, ny: 76 },
  인천: { nx: 55, ny: 124 },
  대구: { nx: 89, ny: 90 },
  창원: { nx: 89, ny: 76 },
};

const REGION_COORDS = {
  서울: { lat: 37.5665, lon: 126.978 },
  부산: { lat: 35.1796, lon: 129.0756 },
  인천: { lat: 37.4563, lon: 126.7052 },
  대구: { lat: 35.8714, lon: 128.6014 },
  창원: { lat: 35.2279, lon: 128.6811 },
};

const SKY_LABEL = { 1: '맑음', 3: '구름많음', 4: '흐림' };
const PTY_LABEL = { 0: '', 1: '비', 2: '비/눈', 3: '눈', 5: '빗방울', 6: '빗방울/눈날림', 7: '눈날림' };
const WIND_DIR = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];

function getConditionLabel(sky, pty) {
  if (pty > 0) return PTY_LABEL[pty] || '비';
  return SKY_LABEL[sky] || '맑음';
}

function calcFeelsLike(temp, windSpeed) {
  // 바람체감온도 공식 (기온 10도 이하, 풍속 1.3m/s 이상일 때 적용)
  if (temp > 10 || windSpeed < 1.3) return temp;
  const wkmh = windSpeed * 3.6;
  return Math.round(13.12 + 0.6215 * temp - 11.37 * Math.pow(wkmh, 0.16) + 0.3965 * temp * Math.pow(wkmh, 0.16));
}

function getWindDir(deg) {
  if (deg == null) return null;
  return WIND_DIR[Math.round(deg / 22.5) % 16];
}

// KST 현재 시각 기반 날짜/시간 정보
function getKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(0, 10).replace(/-/g, '');
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  return { kst, date, h, m };
}

// 초단기실황/예보 base time (HH00, 매시 30분 이후 발표)
function getUltraBase() {
  const { kst, date, h, m } = getKST();
  let baseH = m < 30 ? h - 1 : h;
  let baseDate = date;
  if (baseH < 0) {
    baseH = 23;
    const prev = new Date(kst);
    prev.setUTCDate(prev.getUTCDate() - 1);
    baseDate = prev.toISOString().slice(0, 10).replace(/-/g, '');
  }
  return { baseDate, baseTime: String(baseH).padStart(2, '0') + '00' };
}

// 단기예보 base time (0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300)
function getVilageBase() {
  const { kst, date, h } = getKST();
  const bases = [2, 5, 8, 11, 14, 17, 20, 23];
  const validBases = bases.filter((b) => b <= h);
  if (validBases.length > 0) {
    const baseH = validBases[validBases.length - 1];
    return { baseDate: date, baseTime: String(baseH).padStart(2, '0') + '00' };
  }
  // 자정~02시 사이면 전날 2300
  const prev = new Date(kst);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return { baseDate: prev.toISOString().slice(0, 10).replace(/-/g, ''), baseTime: '2300' };
}

class ForecastService {
  async getWeatherForecast(region) {
    const grid = REGION_GRID[region];
    const coords = REGION_COORDS[region];
    if (!grid) throw new Error('지원하지 않는 지역입니다.');

    const weatherKey = process.env.WEATHER_API_KEY;
    const sunriseKey = process.env.SUNRISE_API_KEY;

    const [ncstRes, fcstRes, sunRes] = await Promise.allSettled([
      this.fetchNcst(weatherKey, grid),
      this.fetchVilageFcst(weatherKey, grid),
      this.fetchSunrise(sunriseKey, coords),
    ]);

    const ncst = ncstRes.status === 'fulfilled' ? ncstRes.value : {};
    const fcst = fcstRes.status === 'fulfilled' ? fcstRes.value : {};
    const sun = sunRes.status === 'fulfilled' ? sunRes.value : {};

    const temp = ncst.temperature ?? null;
    const wind = ncst.windSpeed ?? 0;

    return {
      region,
      current: {
        temperature: temp,
        feelsLike: temp !== null ? calcFeelsLike(temp, wind) : null,
        humidity: ncst.humidity ?? null,
        windSpeed: wind,
        windVec: ncst.windVec ?? null,
        windDirection: getWindDir(ncst.windVec),
        sky: fcst.currentSky ?? 1,
        pty: ncst.pty ?? 0,
        condition: getConditionLabel(fcst.currentSky ?? 1, ncst.pty ?? 0),
      },
      today: {
        minTemp: fcst.todayMin ?? null,
        maxTemp: fcst.todayMax ?? null,
        sunrise: sun.sunrise ?? null,
        sunset: sun.sunset ?? null,
      },
      tomorrow: {
        minTemp: fcst.tomorrowMin ?? null,
        maxTemp: fcst.tomorrowMax ?? null,
        morningPop: fcst.tomorrowMorningPop ?? null,
        afternoonPop: fcst.tomorrowAfternoonPop ?? null,
        morningSky: fcst.tomorrowMorningSky ?? null,
        afternoonSky: fcst.tomorrowAfternoonSky ?? null,
      },
      hourly: fcst.hourly ?? [],
    };
  }

  async fetchNcst(apiKey, grid) {
    const { baseDate, baseTime } = getUltraBase();
    const res = await axios.get(
      'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst',
      {
        params: { serviceKey: apiKey, pageNo: 1, numOfRows: 10, dataType: 'JSON', base_date: baseDate, base_time: baseTime, nx: grid.nx, ny: grid.ny },
        timeout: 8000,
      }
    );
    const items = res.data?.response?.body?.items?.item || [];
    const get = (cat) => {
      const item = items.find((i) => i.category === cat);
      return item ? parseFloat(item.obsrValue) : null;
    };
    return {
      temperature: get('T1H'),
      humidity: get('REH'),
      windSpeed: get('WSD'),
      windVec: get('VEC'),
      pty: get('PTY'),
    };
  }

  async fetchVilageFcst(apiKey, grid) {
    const { baseDate, baseTime } = getVilageBase();
    const { kst, date: todayDate, h } = getKST();
    const tomorrowKst = new Date(kst);
    tomorrowKst.setUTCDate(tomorrowKst.getUTCDate() + 1);
    const tomorrowDate = tomorrowKst.toISOString().slice(0, 10).replace(/-/g, '');

    const fetchItems = async (bDate, bTime, rows = 400) => {
      const r = await axios.get(
        'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',
        { params: { serviceKey: apiKey, pageNo: 1, numOfRows: rows, dataType: 'JSON', base_date: bDate, base_time: bTime, nx: grid.nx, ny: grid.ny }, timeout: 10000 }
      );
      return r.data?.response?.body?.items?.item || [];
    };

    // 현재 base time으로 시간별 + 내일 데이터
    const items = await fetchItems(baseDate, baseTime);

    // TMN/TMX는 0600·1500에 위치 — 현재 base time이 오후라 오늘 값이 없을 수 있음
    // → 오늘 날짜의 0200 base time으로 별도 조회해서 보완
    let morningItems = [];
    try {
      morningItems = await fetchItems(todayDate, '0200', 200);
    } catch { /* silent */ }

    const allTodayItems = [...items, ...morningItems].filter((i) => i.fcstDate === todayDate);

    const filterItems = (list, date, time) => list.filter((i) => i.fcstDate === date && (!time || i.fcstTime === time));
    const getVal = (list, cat) => {
      const item = list.find((i) => i.category === cat);
      return item ? parseFloat(item.fcstValue) : null;
    };

    // 오늘 최저/최고
    const todayMin = getVal(allTodayItems, 'TMN');
    const todayMax = getVal(allTodayItems, 'TMX');

    // 내일
    const tomorrowAll = items.filter((i) => i.fcstDate === tomorrowDate);
    const tomorrowMin = getVal(tomorrowAll, 'TMN');
    const tomorrowMax = getVal(tomorrowAll, 'TMX');
    const tmMorn = filterItems(items, tomorrowDate, '0900');
    const tmAftn = filterItems(items, tomorrowDate, '1500');

    // 현재 시각에 가장 가까운 SKY
    const nearTime = String(h).padStart(2, '0') + '00';
    const currentItems = filterItems(items, todayDate, nearTime);
    const currentSky = getVal(currentItems, 'SKY') ?? getVal(filterItems(items, todayDate, '1200'), 'SKY') ?? 1;

    // 시간별 (현재부터 12시간)
    const hourly = [];
    for (let i = 0; i <= 12; i++) {
      const offset = h + i;
      const isNextDay = offset >= 24;
      const fcstDate = isNextDay ? tomorrowDate : todayDate;
      const fcstH = offset % 24;
      const fcstTime = String(fcstH).padStart(2, '0') + '00';
      const hourItems = filterItems(items, fcstDate, fcstTime);
      if (hourItems.length > 0) {
        hourly.push({
          time: `${String(fcstH).padStart(2, '0')}:00`,
          temp: getVal(hourItems, 'TMP'),
          pop: getVal(hourItems, 'POP'),
          sky: getVal(hourItems, 'SKY'),
          pty: getVal(hourItems, 'PTY'),
        });
      }
    }

    return {
      todayMin,
      todayMax,
      tomorrowMin,
      tomorrowMax,
      tomorrowMorningPop: getVal(tmMorn, 'POP'),
      tomorrowAfternoonPop: getVal(tmAftn, 'POP'),
      tomorrowMorningSky: getVal(tmMorn, 'SKY'),
      tomorrowAfternoonSky: getVal(tmAftn, 'SKY'),
      currentSky,
      hourly,
    };
  }

  async fetchSunrise(apiKey, coords) {
    const { date } = getKST();
    const res = await axios.get(
      'https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getLCRiseSetInfo',
      {
        params: { serviceKey: apiKey, locdate: date, longitude: coords.lon, latitude: coords.lat, dnYn: 'Y' },
        timeout: 8000,
      }
    );
    const xml = typeof res.data === 'string' ? res.data : '';
    const extract = (tag) => {
      const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
      if (!m) return null;
      const v = m[1].trim();
      return v.length >= 4 ? `${v.slice(0, 2)}:${v.slice(2, 4)}` : v;
    };
    return { sunrise: extract('sunrise'), sunset: extract('sunset') };
  }
}

module.exports = new ForecastService();
