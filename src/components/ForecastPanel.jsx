export default function ForecastPanel({ data, loading, message, metric }) {
  if (loading) return <ForecastMessage>예측 데이터를 불러오는 중입니다...</ForecastMessage>;
  if (message) return <ForecastMessage>{message}</ForecastMessage>;
  if (!data?.forecast?.length) return <ForecastMessage>예측 가능한 데이터가 없습니다.</ForecastMessage>;

  return (
    <div style={{ borderTop: '1px solid #eef2f7', marginTop: 18, paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ color: '#202124', fontSize: 15, fontWeight: 800, margin: 0 }}>향후 {metric.label} 예측</h3>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>{data.method}</span>
      </div>
      {data.notice && (
        <p style={{ color: '#d97706', fontSize: 12, margin: '0 0 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px' }}>
          {data.notice}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {data.forecast.map((item) => (
          <div key={item.date} style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          }}>
            <p style={{ color: '#64748b', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>{formatForecastDate(item.date)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ForecastIcon color={metric.color || '#1589F0'} />
              <p style={{ color: '#202124', fontSize: 21, fontWeight: 900, margin: 0, fontFamily: "'Roboto Mono', monospace" }}>
                {item.predicted}
                <span style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600, marginLeft: 3 }}>{metric.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastMessage({ children }) {
  return (
    <div style={{ borderTop: '1px solid #eef2f7', marginTop: 18, paddingTop: 16 }}>
      <div style={{ color: '#9aa0a6', textAlign: 'center', padding: '24px 12px', border: '1px dashed #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
        {children}
      </div>
    </div>
  );
}

function formatForecastDate(date) {
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
  }
  return date;
}

function ForecastIcon({ color }) {
  return (
    <svg width="36" height="36" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r="16" fill={`${color}15`} />
      <path d="M12 23c3-5 8-8 14-8" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="15" r="4" fill={color} />
      <path d="M13 25h13" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
