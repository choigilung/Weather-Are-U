export function getPm25Grade(pm25) {
  if (pm25 === null || pm25 === undefined) {
    return { label: '정보 없음', color: '#6b7280', bg: '#6b728015' };
  }
  if (pm25 <= 15) {
    return { label: '좋음', color: '#22c55e', bg: '#22c55e15' };
  }
  if (pm25 <= 35) {
    return { label: '보통', color: '#eab308', bg: '#eab30815' };
  }
  if (pm25 <= 75) {
    return { label: '나쁨', color: '#f97316', bg: '#f9731615' };
  }
  return { label: '매우 나쁨', color: '#ef4444', bg: '#ef444415' };
}

export function fmt(value, unit = '') {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return `${number.toFixed(1)}${unit}`;
}
