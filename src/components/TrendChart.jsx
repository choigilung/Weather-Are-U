export default function TrendChart({ data, metric }) {
  if (!data.length) return <TrendMessage>분석에 필요한 데이터가 충분하지 않습니다.</TrendMessage>;

  const width = 760;
  const height = 280;
  const pad = { top: 24, right: 24, bottom: 46, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const values = data.flatMap((point) => [point.average, point.movingAverage, point.trend]).filter(Number.isFinite);
  const max = Math.max(metric.minMax, Math.ceil((Math.max(...values) + metric.padding) / metric.step) * metric.step);

  const toPoint = (value, index) => ({
    x: pad.left + (index / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + (1 - value / (max || 1)) * innerH,
  });
  const makePath = (key) => data
    .map((point, index) => ({ ...toPoint(Number(point[key]) || 0, index), index }))
    .map((point) => `${point.index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: max * ratio,
    y: pad.top + (1 - ratio) * innerH,
  }));

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 560, height: 'auto' }} role="img" aria-label="트렌드 분석 그래프">
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="#334155" strokeDasharray="4 4" />
            <text x={pad.left - 10} y={tick.y + 4} textAnchor="end" fill="#64748b" fontSize="11">{tick.value.toFixed(0)}</text>
          </g>
        ))}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#475569" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#475569" />
        <path d={makePath('average')} fill="none" stroke={metric.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath('movingAverage')} fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath('trend')} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" />
        {data.map((point, index) => {
          const pos = toPoint(Number(point.average) || 0, index);
          return <circle key={point.date} cx={pos.x} cy={pos.y} r="4" fill={metric.color} />;
        })}
        {data.map((point, index) => {
          if (index !== 0 && index !== data.length - 1 && index % Math.ceil(data.length / 5) !== 0) return null;
          const pos = toPoint(0, index);
          return <text key={point.date} x={pos.x} y={height - 16} textAnchor="middle" fill="#64748b" fontSize="11">{point.date.slice(5)}</text>;
        })}
        <text x={pad.left} y="14" fill="#94a3b8" fontSize="12">{metric.label} ({metric.unit})</text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#94a3b8', fontSize: 12 }}>
        <Legend color={metric.color} label="일자별 평균" />
        <Legend color="#facc15" label="이동 평균" />
        <Legend color="#f87171" label="추세선" dashed />
      </div>
    </div>
  );
}

function Legend({ color, label, dashed = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 22, borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      {label}
    </span>
  );
}

export function TrendMessage({ children }) {
  return (
    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '56px 12px', border: '1px dashed #334155', borderRadius: 8 }}>
      {children}
    </div>
  );
}
