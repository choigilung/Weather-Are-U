export default function Pm25LineChart({ data, loading, error, metric }) {
  if (loading) return <ChartMessage>지난 24시간 데이터를 불러오는 중입니다...</ChartMessage>;
  if (error) return <ChartMessage>{error}</ChartMessage>;

  const chartData = data
    .map((item) => ({ ...item, value: Number(item[metric.key]) }))
    .filter((item) => Number.isFinite(item.value));

  if (!chartData.length) return <ChartMessage>지난 24시간 데이터가 없습니다.</ChartMessage>;

  const width = 720;
  const height = 240;
  const pad = { top: 20, right: 20, bottom: 40, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = chartData.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const min = Math.max(0, Math.floor((minValue - 5) / metric.step) * metric.step);
  const max = Math.ceil((maxValue + 10) / metric.step) * metric.step;

  const points = chartData.map((item, index) => {
    const x = pad.left + (index / Math.max(chartData.length - 1, 1)) * innerW;
    const y = pad.top + (1 - (item.value - min) / (max - min || 1)) * innerH;
    return { x, y, item };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `${path} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: min + (max - min) * ratio,
    y: pad.top + (1 - ratio) * innerH,
  }));
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  // 정확히 4개: 인덱스 0, 1/3, 2/3, 끝 → 픽셀 겹침 원천 차단
  // 레이블은 각 포인트 시각을 가장 가까운 2시간 경계로 반올림
  const n = points.length - 1;
  const xTicks = [...new Set([0, Math.round(n / 3), Math.round((2 * n) / 3), n])].map((idx) => {
    const p = points[idx];
    const t = new Date(p.item.measured_at).getTime();
    const labelTime = Math.round(t / TWO_HOURS_MS) * TWO_HOURS_MS;
    return { point: p, labelTime };
  });

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`지난 24시간 ${metric.label} 꺾은선 그래프`}
        style={{ width: '100%', minWidth: 480, height: 'auto' }}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 배경 격자 */}
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="#f1f3f4" strokeWidth="1" />
            <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" fill="#9aa0a6" fontSize="11">
              {tick.value.toFixed(0)}
            </text>
          </g>
        ))}

        {/* 축 */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#e8eaed" strokeWidth="1" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#e8eaed" strokeWidth="1" />

        {/* 채우기 영역 */}
        <path d={fillPath} fill="url(#chartGrad)" />

        {/* 꺾은선 */}
        <path d={path} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* 데이터 점 */}
        {points.map((p) => (
          <circle key={`${p.item.measured_at}-${p.x}`} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke={metric.color} strokeWidth="2" />
        ))}

        {/* X축 레이블 */}
        {xTicks.map(({ point: p, labelTime }, i) => {
          const isFirst = i === 0;
          const isLast = i === xTicks.length - 1;
          const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
          const timeStr = new Date(labelTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          return (
            <text key={labelTime} x={p.x} y={height - 12} textAnchor={anchor} fill="#9aa0a6" fontSize="11">
              {timeStr}
            </text>
          );
        })}

        {/* 단위 레이블 */}
        <text x={pad.left} y="13" fill="#9aa0a6" fontSize="11">{metric.label} ({metric.unit})</text>
      </svg>
    </div>
  );
}

function ChartMessage({ children }) {
  return (
    <div style={{ color: '#9aa0a6', textAlign: 'center', padding: '48px 12px', border: '1px dashed #e8eaed', borderRadius: 10, background: '#f8f9fa' }}>
      {children}
    </div>
  );
}
