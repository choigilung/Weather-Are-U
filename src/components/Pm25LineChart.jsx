export default function Pm25LineChart({ data, loading, error, metric }) {
  if (loading) return <ChartMessage>지난 24시간 데이터를 불러오는 중입니다...</ChartMessage>;
  if (error) return <ChartMessage>{error}</ChartMessage>;
  const chartData = data
    .map((item) => ({ ...item, value: Number(item[metric.key]) }))
    .filter((item) => Number.isFinite(item.value));

  if (!chartData.length) return <ChartMessage>지난 24시간 데이터가 없습니다.</ChartMessage>;

  const width = 720;
  const height = 260;
  const pad = { top: 24, right: 24, bottom: 44, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const values = chartData.map((item) => item.value);
  const min = 0;
  const maxValue = Math.max(...values);
  const max = Math.max(metric.minMax, Math.ceil((maxValue + metric.padding) / metric.step) * metric.step);
  const points = chartData.map((item, index) => {
    const x = pad.left + (index / Math.max(chartData.length - 1, 1)) * innerW;
    const y = pad.top + (1 - (item.value - min) / (max - min || 1)) * innerH;
    return { x, y, item };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = min + (max - min) * ratio;
    const y = pad.top + (1 - ratio) * innerH;
    return { value, y };
  });
  const xTicks = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 4) === 0);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="지난 24시간 PM2.5 꺾은선 그래프" style={{ width: '100%', minWidth: 520, height: 'auto' }}>
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="#334155" strokeDasharray="4 4" />
            <text x={pad.left - 10} y={tick.y + 4} textAnchor="end" fill="#64748b" fontSize="11">
              {tick.value.toFixed(0)}
            </text>
          </g>
        ))}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#475569" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#475569" />
        <path d={path} fill="none" stroke={metric.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => (
          <circle key={`${point.item.measured_at}-${point.x}`} cx={point.x} cy={point.y} r="4" fill={metric.color} />
        ))}
        {xTicks.map((point) => (
          <text key={point.item.measured_at} x={point.x} y={height - 16} textAnchor="middle" fill="#64748b" fontSize="11">
            {new Date(point.item.measured_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </text>
        ))}
        <text x={pad.left} y="14" fill="#94a3b8" fontSize="12">{metric.label} ({metric.unit})</text>
      </svg>
    </div>
  );
}

function ChartMessage({ children }) {
  return (
    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '56px 12px', border: '1px dashed #334155', borderRadius: 8 }}>
      {children}
    </div>
  );
}
