export default function TrendChart({ data, metric }) {
  if (!data.length) return <TrendMessage>분석에 필요한 데이터가 충분하지 않습니다.</TrendMessage>;

  const width = 760;
  const height = 260;
  const pad = { top: 20, right: 20, bottom: 42, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = data.flatMap((p) => [p.average, p.movingAverage, p.trend]).filter(Number.isFinite);
  const max = Math.max(metric.minMax, Math.ceil((Math.max(...values) + metric.padding) / metric.step) * metric.step);

  const toPoint = (value, index) => ({
    x: pad.left + (index / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + (1 - value / (max || 1)) * innerH,
  });

  const makePath = (key) =>
    data
      .map((point, index) => ({ ...toPoint(Number(point[key]) || 0, index), index }))
      .map((p) => `${p.index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: max * ratio,
    y: pad.top + (1 - ratio) * innerH,
  }));

  const avgPoints = data.map((point, index) => toPoint(Number(point.average) || 0, index));
  const avgPath = avgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `${avgPath} L ${avgPoints[avgPoints.length - 1].x} ${pad.top + innerH} L ${avgPoints[0].x} ${pad.top + innerH} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', minWidth: 520, height: 'auto' }}
        role="img"
        aria-label="트렌드 분석 그래프"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1589F0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1589F0" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />

        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="#f1f3f4" strokeWidth="1" />
            <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" fill="#9aa0a6" fontSize="11">{tick.value.toFixed(0)}</text>
          </g>
        ))}

        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} stroke="#e8eaed" strokeWidth="1" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} stroke="#e8eaed" strokeWidth="1" />

        {/* 채우기 영역 */}
        <path d={fillPath} fill="url(#trendGrad)" />

        {/* 일자별 평균 */}
        <path d={makePath('average')} fill="none" stroke="#1589F0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* 이동 평균 */}
        <path d={makePath('movingAverage')} fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* 추세선 */}
        <path d={makePath('trend')} fill="none" stroke="#fb7185" strokeWidth="2" strokeDasharray="7 5" strokeLinecap="round" />

        {/* 데이터 점 */}
        {avgPoints.map((p, index) => (
          <circle key={data[index].date} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#1589F0" strokeWidth="2" />
        ))}

        {/* X축 레이블 */}
        {data.map((point, index) => {
          if (index !== 0 && index !== data.length - 1 && index % Math.ceil(data.length / 5) !== 0) return null;
          const pos = toPoint(0, index);
          return (
            <text key={point.date} x={pos.x} y={height - 12} textAnchor="middle" fill="#9aa0a6" fontSize="11">
              {point.date.slice(5)}
            </text>
          );
        })}

        <text x={pad.left} y="13" fill="#9aa0a6" fontSize="11">{metric.label} ({metric.unit})</text>
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: '#70757a', fontSize: 12, marginTop: 10 }}>
        <Legend color="#1589F0" label="일자별 평균" />
        <Legend color="#facc15" label="이동 평균" />
        <Legend color="#fb7185" label="추세선" dashed />
      </div>
    </div>
  );
}

function Legend({ color, label, dashed = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 22, borderTop: `2.5px ${dashed ? 'dashed' : 'solid'} ${color}`, display: 'inline-block' }} />
      {label}
    </span>
  );
}

export function TrendMessage({ children }) {
  return (
    <div style={{ color: '#9aa0a6', textAlign: 'center', padding: '48px 12px', border: '1px dashed #e8eaed', borderRadius: 12, background: '#f8f9fa' }}>
      {children}
    </div>
  );
}
