import { getPm25Grade, fmt } from '../utils/grade';

export default function RegionCard({ data, onClick, selected }) {
  const grade = getPm25Grade(data?.pm25);

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? 'rgba(34,197,94,0.08)' : '#1e293b',
        border: `1px solid ${selected ? 'rgba(34,197,94,0.4)' : '#334155'}`,
        borderRadius: 8,
        padding: '18px 20px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 4px' }}>지역</p>
          <p style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            {data?.region || '-'}
          </p>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: grade.bg,
            color: grade.color,
            border: `1px solid ${grade.color}40`,
          }}>
            {grade.label}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
            {fmt(data?.pm25)}
          </p>
          <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>PM2.5 ug/m3</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'PM10', value: fmt(data?.pm10, ' ug/m3') },
          { label: 'CO2', value: fmt(data?.co2, ' ppm') },
          { label: '온도', value: fmt(data?.temperature, ' C') },
          { label: '습도', value: fmt(data?.humidity, '%') },
        ].map((item) => (
          <div key={item.label} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ color: '#475569', fontSize: 10, margin: '0 0 2px' }}>{item.label}</p>
            <p style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {data?.measured_at && (
        <p style={{ color: '#475569', fontSize: 10, margin: '10px 0 0', textAlign: 'right' }}>
          {new Date(data.measured_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
        </p>
      )}
    </button>
  );
}
