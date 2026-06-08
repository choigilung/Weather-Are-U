import { api } from './api';

export const DEFAULT_REGION_META = [
  { code: 'seoul', name: '서울', latitude: 37.5665, longitude: 126.9780, order: 1 },
  { code: 'busan', name: '부산', latitude: 35.1796, longitude: 129.0756, order: 2 },
  { code: 'incheon', name: '인천', latitude: 37.4563, longitude: 126.7052, order: 3 },
  { code: 'daegu', name: '대구', latitude: 35.8714, longitude: 128.6014, order: 4 },
  { code: 'changwon', name: '창원', latitude: 35.2279, longitude: 128.6811, order: 5 },
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
