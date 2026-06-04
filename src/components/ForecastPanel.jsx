export default function ForecastPanel({ data, loading, message, metric }) {
  if (loading) return <ForecastMessage>예측 데이터를 불러오는 중입니다...</ForecastMessage>;
  if (message) return <ForecastMessage>{message}</ForecastMessage>;
  if (!data?.forecast?.length) return <ForecastMessage>예측 가능한 데이터가 없습니다.</ForecastMessage>;

  return (
    <div style={{ borderTop: '1px solid #334155', marginTop: 24, paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>향후 {metric.label} 예측</h3>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{data.method}</span>
      </div>
      <p style={{ color: '#facc15', fontSize: 12, margin: '0 0 12px' }}>{data.notice}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {data.forecast.map((item) => (
          <div key={item.date} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 14 }}>
            <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 6px' }}>{item.date}</p>
            <p style={{ color: metric.color, fontSize: 22, fontWeight: 800, margin: 0 }}>
              {item.predicted} {metric.unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastMessage({ children }) {
  return (
    <div style={{ borderTop: '1px solid #334155', marginTop: 24, paddingTop: 20 }}>
      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '32px 12px', border: '1px dashed #334155', borderRadius: 8 }}>
        {children}
      </div>
    </div>
  );
}
