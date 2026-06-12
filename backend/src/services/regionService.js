const REGIONS = [
  {
    code: 'seoul',
    name: '서울',
    latitude: 37.5665,
    longitude: 126.9780,
    grid: { nx: 60, ny: 127 },
    order: 1,
  },
  {
    code: 'busan',
    name: '부산',
    latitude: 35.1796,
    longitude: 129.0756,
    grid: { nx: 98, ny: 76 },
    order: 2,
  },
  {
    code: 'incheon',
    name: '인천',
    latitude: 37.4563,
    longitude: 126.7052,
    grid: { nx: 55, ny: 124 },
    order: 3,
  },
  {
    code: 'daegu',
    name: '대구',
    latitude: 35.8714,
    longitude: 128.6014,
    grid: { nx: 89, ny: 90 },
    order: 4,
  },
  {
    code: 'changwon',
    name: '창원',
    latitude: 35.2279,
    longitude: 128.6811,
    grid: { nx: 89, ny: 76 },
    order: 5,
  },
  {
    code: 'gwangju',
    name: '광주',
    latitude: 35.1595,
    longitude: 126.8526,
    grid: { nx: 58, ny: 74 },
    order: 6,
  },
  {
    code: 'daejeon',
    name: '대전',
    latitude: 36.3504,
    longitude: 127.3845,
    grid: { nx: 67, ny: 100 },
    order: 7,
  },
  {
    code: 'gangneung',
    name: '강릉',
    latitude: 37.7519,
    longitude: 128.8761,
    grid: { nx: 92, ny: 131 },
    order: 8,
  },
  {
    code: 'jeonju',
    name: '전주',
    latitude: 35.8242,
    longitude: 127.1480,
    grid: { nx: 63, ny: 89 },
    order: 9,
  },
  {
    code: 'ulsan',
    name: '울산',
    latitude: 35.5384,
    longitude: 129.3114,
    grid: { nx: 102, ny: 84 },
    order: 10,
  },
  {
    code: 'jeju',
    name: '제주',
    latitude: 33.4996,
    longitude: 126.5312,
    grid: { nx: 52, ny: 38 },
    order: 11,
  },
];

function getRegions() {
  return REGIONS.map((region) => ({
    code: region.code,
    name: region.name,
    latitude: region.latitude,
    longitude: region.longitude,
    grid: region.grid,
    order: region.order,
  }));
}

function getRegionByName(name) {
  return REGIONS.find((region) => region.name === name);
}

function getRegionGrid(name) {
  return getRegionByName(name)?.grid || null;
}

function getRegionCoords(name) {
  const region = getRegionByName(name);
  if (!region) return null;
  return { lat: region.latitude, lon: region.longitude };
}

module.exports = {
  REGIONS,
  REGION_NAMES: REGIONS.map((region) => region.name),
  getRegions,
  getRegionByName,
  getRegionGrid,
  getRegionCoords,
};
