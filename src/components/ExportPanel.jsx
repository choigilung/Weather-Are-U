import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const REGIONS = ['서울', '부산', '인천', '대구', '창원'];
const METRICS = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'temperature', label: '온도' },
  { key: 'humidity', label: '습도' },
  { key: 'co2', label: 'CO2' },
];

export default function ExportPanel({ selectedRegion }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    startDate: today,
    endDate: today,
    region: selectedRegion || '서울',
    metrics: ['pm25', 'pm10', 'temperature', 'humidity', 'co2'],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const toggleMetric = (metric) => {
    setForm((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter((item) => item !== metric)
        : [...prev.metrics, metric],
    }));
  };

  const downloadCsv = async () => {
    setLoading(true);
    setMessage('');

    try {
      const params = new URLSearchParams({
        format: 'csv',
        startDate: form.startDate,
        endDate: form.endDate,
        region: form.region,
        metrics: form.metrics.join(','),
      });
      const response = await fetch(`${BASE_URL}/api/analysis/export?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'CSV 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `environment-data-${form.region}-${form.startDate}-${form.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('CSV 다운로드를 시작했습니다.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f1f5f9',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
  };

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24 }}>
      <h2 style={{ color: '#f1f5f9', fontSize: 16, margin: '0 0 16px' }}>CSV 내보내기</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <label style={{ color: '#94a3b8', fontSize: 12 }}>
          시작일
          <input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ color: '#94a3b8', fontSize: 12 }}>
          종료일
          <input type="date" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ color: '#94a3b8', fontSize: 12 }}>
          지역
          <select value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} style={inputStyle}>
            {REGIONS.map((region) => <option key={region}>{region}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {METRICS.map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => toggleMetric(metric.key)}
            style={{
              border: `1px solid ${form.metrics.includes(metric.key) ? '#22c55e' : '#334155'}`,
              background: form.metrics.includes(metric.key) ? 'rgba(34,197,94,0.14)' : '#0f172a',
              color: form.metrics.includes(metric.key) ? '#22c55e' : '#94a3b8',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {metric.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={downloadCsv}
        disabled={loading || form.metrics.length === 0}
        style={{
          border: '1px solid rgba(34,197,94,0.35)',
          background: loading ? '#334155' : 'rgba(34,197,94,0.2)',
          color: loading ? '#64748b' : '#22c55e',
          borderRadius: 8,
          padding: '10px 14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {loading ? '다운로드 준비 중...' : 'CSV 다운로드'}
      </button>
      {message && <p style={{ color: '#94a3b8', fontSize: 13, margin: '12px 0 0' }}>{message}</p>}
    </div>
  );
}
