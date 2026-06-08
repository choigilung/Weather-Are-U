const axios = require('axios');
const forecastService = require('./forecastService');
const { getRegionGrid } = require('./regionService');

const CHECK_REGION = '서울';
const CHECK_TIMEOUT = 8000;

function baseStatus(name, envName) {
  return {
    name,
    envName,
    configured: Boolean(process.env[envName]),
    ok: false,
    message: '',
  };
}

function success(status, message) {
  return { ...status, ok: true, message };
}

function failure(status, error) {
  return {
    ...status,
    ok: false,
    message: error?.message || '상태 확인에 실패했습니다.',
  };
}

async function checkAirKorea() {
  const status = baseStatus('AirKorea 대기오염정보', 'AIRKOREA_API_KEY');
  if (!status.configured) return { ...status, message: 'API 키가 설정되어 있지 않습니다.' };

  try {
    const response = await axios.get('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty', {
      params: {
        serviceKey: process.env.AIRKOREA_API_KEY,
        returnType: 'json',
        numOfRows: 1,
        pageNo: 1,
        sidoName: CHECK_REGION,
        ver: '1.0',
      },
      timeout: CHECK_TIMEOUT,
    });

    const resultCode = response.data?.response?.header?.resultCode;
    const items = response.data?.response?.body?.items || [];
    if (resultCode && resultCode !== '00') {
      throw new Error(`공공데이터 응답 코드 ${resultCode}`);
    }
    if (!items.length) throw new Error('응답 데이터가 없습니다.');

    return success(status, '실시간 대기질 응답을 정상 수신했습니다.');
  } catch (error) {
    return failure(status, error);
  }
}

async function checkWeather() {
  const status = baseStatus('기상청 단기예보', 'WEATHER_API_KEY');
  if (!status.configured) return { ...status, message: 'API 키가 설정되어 있지 않습니다.' };

  try {
    const grid = getRegionGrid(CHECK_REGION);
    const weather = await forecastService.fetchNcst(process.env.WEATHER_API_KEY, grid);
    if (weather.temperature === null && weather.humidity === null) {
      throw new Error('기상 실황 데이터가 비어 있습니다.');
    }

    return success(status, '기상 실황 응답을 정상 수신했습니다.');
  } catch (error) {
    return failure(status, error);
  }
}

async function checkSunrise() {
  const status = baseStatus('한국천문연구원 출몰시각', 'SUNRISE_API_KEY');
  if (!status.configured) return { ...status, message: 'API 키가 설정되어 있지 않습니다.' };

  try {
    const result = await forecastService.fetchSunrise(process.env.SUNRISE_API_KEY, { lat: 37.5665, lon: 126.9780 });
    if (!result.sunrise || !result.sunset) {
      throw new Error('일출/일몰 데이터가 비어 있습니다.');
    }

    return success(status, '일출/일몰 응답을 정상 수신했습니다.');
  } catch (error) {
    return failure(status, error);
  }
}

async function getExternalStatus() {
  const [airKorea, weather, sunrise] = await Promise.all([
    checkAirKorea(),
    checkWeather(),
    checkSunrise(),
  ]);

  const googleMaps = {
    name: 'Google Maps JavaScript API',
    envName: 'VITE_GOOGLE_MAPS_API_KEY',
    configured: null,
    ok: null,
    message: '프론트엔드 .env에서 확인되는 클라이언트 키입니다.',
  };

  const services = { airKorea, weather, sunrise, googleMaps };
  const serverServices = [airKorea, weather, sunrise];

  return {
    success: true,
    checkedAt: new Date().toISOString(),
    ok: serverServices.every((service) => service.ok),
    services,
  };
}

module.exports = {
  getExternalStatus,
};
