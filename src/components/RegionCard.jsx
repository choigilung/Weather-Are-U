import { useState } from 'react';
import { getPm25Grade, fmt } from '../utils/grade';

export default function RegionCard({ data, onClick, selected }) {
  const [hovered, setHovered] = useState(false);
  const grade = getPm25Grade(data?.pm25);

  const metrics = [
    { label: 'PM10', value: fmt(data?.pm10) },
    { label: 'CO2', value: fmt(data?.co2) },
    { label: '온도', value: fmt(data?.temperature, '°C') },
    { label: '습도', value: fmt(data?.humidity, '%') },
  ];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      type="button"
      style={{
        width: '100%',
        minWidth: 180,
        background: selected ? '#f0f9ff' : '#ffffff',
        border: selected ? '1.5px solid #0ea5e9' : '1.5px solid #e8eaed',
        borderRadius: 14,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        padding: '18px 20px',
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 150ms, box-shadow 150ms, border-color 150ms, background 150ms',
        userSelect: 'none',
      }}
    >
      {/* 지역명 + 등급 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <p style={{ color: '#202124', fontSize: 18, fontWeight: 800, margin: 0 }}>
          {data?.region || '-'}
        </p>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: grade.color,
          background: grade.bg,
          border: `1px solid ${grade.color}40`,
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: grade.color }} />
          {grade.label}
        </span>
      </div>

      {/* PM2.5 큰 숫자 */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <p style={{ color: '#202124', fontSize: 40, fontWeight: 900, lineHeight: 1, margin: 0, fontFamily: "'Roboto Mono', monospace" }}>
          {fmt(data?.pm25)}
        </p>
        <p style={{ color: '#9aa0a6', fontSize: 12, margin: '4px 0 0' }}>ug/m³</p>
      </div>

      {/* 기타 지표 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12, rowGap: 6 }}>
        {metrics.map((item) => (
          <div key={item.label}>
            <p style={{ color: '#9aa0a6', fontSize: 10, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {item.label}
            </p>
            <p style={{ color: '#202124', fontSize: 13, fontWeight: 600, margin: 0, fontFamily: "'Roboto Mono', monospace" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {data?.measured_at && (
        <p style={{ color: '#9aa0a6', fontSize: 10, fontWeight: 500, margin: '10px 0 0', textAlign: 'center' }}>
          {new Date(data.measured_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
        </p>
      )}
    </button>
  );
}
