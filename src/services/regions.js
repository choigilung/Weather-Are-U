import { api } from './api';

export const DEFAULT_REGION_META = [
  { code: 'seoul', name: '서울', latitude: 37.5665, longitude: 126.9780, order: 1 },
  { code: 'busan', name: '부산', latitude: 35.1796, longitude: 129.0756, order: 2 },
  { code: 'incheon', name: '인천', latitude: 37.4563, longitude: 126.7052, order: 3 },
  { code: 'daegu', name: '대구', latitude: 35.8714, longitude: 128.6014, order: 4 },
  { code: 'changwon', name: '창원', latitude: 35.2279, longitude: 128.6811, order: 5 },
  { code: 'gwangju', name: '광주', latitude: 35.1595, longitude: 126.8526, order: 6 },
  { code: 'daejeon', name: '대전', latitude: 36.3504, longitude: 127.3845, order: 7 },
  { code: 'gangneung', name: '강릉', latitude: 37.7519, longitude: 128.8761, order: 8 },
  { code: 'jeonju', name: '전주', latitude: 35.8242, longitude: 127.1480, order: 9 },
  { code: 'ulsan', name: '울산', latitude: 35.5384, longitude: 129.3114, order: 10 },
  { code: 'jeju', name: '제주', latitude: 33.4996, longitude: 126.5312, order: 11 },
];

export const DEFAULT_REGIONS = DEFAULT_REGION_META.map((region) => region.name);

export function regionsToCoords(regions) {
  return regions.reduce((coords, region) => {
    coords[region.name] = { lat: region.latitude, lng: region.longitude };
    return coords;
  }, {});
}

export async function fetchRegions() {
  try {
    const result = await api.get('/api/regions');
    return result.data?.length ? result.data : DEFAULT_REGION_META;
  } catch {
    return DEFAULT_REGION_META;
  }
}

export async function searchLocation(lat, lon) {
  const result = await api.get(`/api/search/location?lat=${lat}&lon=${lon}`);
  return result;
}
