import { useEffect, useState } from 'react';
import { DEFAULT_REGIONS, fetchRegions } from '../services/regions';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const METRICS = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'temperature', label: '온도' },
  { key: 'humidity', label: '습도' },
  { key: 'co2', label: 'CO2' },
];

const inputStyle = {
  background: '#f8f9fa',
  border: '1px solid #e8eaed',
  borderRadius: 8,
  color: '#202124',
  padding: '9px 12px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  marginTop: 5,
};

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
  const [regions, setRegions] = useState(DEFAULT_REGIONS);

  useEffect(() => {
    fetchRegions().then((items) => setRegions(items.map((region) => region.name)));
  }, []);

  useEffect(() => {
    if (selectedRegion) setForm((prev) => ({ ...prev, region: selectedRegion }));
  }, [selectedRegion]);

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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600 }}>시작일</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600 }}>종료일</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600 }}>지역</label>
          <select
            value={form.region}
            onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
            style={inputStyle}
          >
            {regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#70757a', fontSize: 11, fontWeight: 600, margin: '0 0 8px' }}>항목 선택</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {METRICS.map((metric) => {
            const active = form.metrics.includes(metric.key);
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => toggleMetric(metric.key)}
                style={{
                  border: `1px solid ${active ? '#0ea5e9' : '#e8eaed'}`,
                  background: active ? '#e0f2fe' : '#f8f9fa',
                  color: active ? '#0369a1' : '#70757a',
                  borderRadius: 20,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  transition: 'all 120ms',
                }}
              >
                {metric.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={downloadCsv}
        disabled={loading || form.metrics.length === 0}
        style={{
          width: '100%',
          border: 'none',
          background: loading || form.metrics.length === 0 ? '#e8eaed' : '#0ea5e9',
          color: loading || form.metrics.length === 0 ? '#9aa0a6' : '#ffffff',
          borderRadius: 8,
          padding: '10px 14px',
          cursor: loading || form.metrics.length === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: 13,
          transition: 'background 120ms',
        }}
      >
        {loading ? '다운로드 준비 중...' : 'CSV 다운로드'}
      </button>

      {message && (
        <p style={{ color: '#0ea5e9', fontSize: 12, margin: '10px 0 0', textAlign: 'center' }}>{message}</p>
      )}
    </div>
  );
}
