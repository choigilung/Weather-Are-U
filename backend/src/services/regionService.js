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
