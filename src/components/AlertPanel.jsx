import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { DEFAULT_REGIONS, fetchRegions } from '../services/regions';

const METRICS = [
  { value: 'pm25', label: 'PM2.5 (ug/m3)' },
  { value: 'pm10', label: 'PM10 (ug/m3)' },
  { value: 'co2', label: 'CO2 (ppm)' },
  { value: 'temperature', label: '온도 (C)' },
  { value: 'humidity', label: '습도 (%)' },
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
};

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [records, setRecords] = useState([]);
  const [regions, setRegions] = useState(DEFAULT_REGIONS);
  const [form, setForm] = useState({ region: '서울', metric: 'pm25', threshold: '', condition: 'gt' });
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [message, setMessage] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.get('/api/alerts');
      setAlerts(data.data || []);
    } catch (err) {
      setMessage(err.message);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await api.get('/api/alerts/history');
      setRecords(data.data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadHistory();
  }, [loadAlerts, loadHistory]);

  useEffect(() => {
    fetchRegions().then((items) => setRegions(items.map((region) => region.name)));
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.threshold) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post('/api/alerts', { ...form, threshold: parseFloat(form.threshold) });
      setMessage('알림 설정을 저장했습니다.');
      setForm((prev) => ({ ...prev, threshold: '' }));
      await loadAlerts();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`);
      await loadAlerts();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/api/alerts/history/${id}/read`);
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, is_read: true } : r));
    } catch {
      // silent
    }
  };

  return (
    <div>
      <form onSubmit={handleSave} style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>지역</label>
            <select value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} style={inputStyle}>
              {regions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>항목</label>
            <select value={form.metric} onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))} style={inputStyle}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>조건</label>
            <select value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))} style={inputStyle}>
              <option value="gt">초과하면</option>
              <option value="lt">미만이면</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#70757a', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>임계값</label>
            <input
              type="number"
              placeholder="숫자 입력"
              value={form.threshold}
              onChange={(e) => setForm((p) => ({ ...p, threshold: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            background: saving ? '#e8eaed' : '#0ea5e9',
            color: saving ? '#9aa0a6' : '#ffffff',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 120ms',
          }}
        >
          {saving ? '저장 중...' : '알림 추가'}
        </button>

        {message && (
          <p style={{ color: '#0ea5e9', fontSize: 12, margin: 0, textAlign: 'center' }}>{message}</p>
        )}
      </form>

      {/* 현재 알림 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {alerts.length === 0 ? (
          <p style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '14px 0', margin: 0 }}>
            설정된 알림이 없습니다.
          </p>
        ) : alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8f9fa',
              border: '1px solid #e8eaed',
              borderRadius: 8,
              padding: '10px 14px',
              gap: 12,
            }}
          >
            <span style={{ color: '#202124', fontSize: 13 }}>
              {alert.region} / {METRICS.find((m) => m.value === alert.metric)?.label || alert.metric}
              <span style={{ color: '#0ea5e9', fontWeight: 700, marginLeft: 8, fontFamily: 'monospace' }}>
                {alert.condition === 'gt' ? '>' : '<'} {alert.threshold}
              </span>
            </span>
            <button
              onClick={() => handleDelete(alert.id)}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#9aa0a6',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 4px',
                flexShrink: 0,
              }}
              aria-label="알림 삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 알림 이력 */}
      <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h4 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: 0 }}>알림 이력</h4>
          <button
            type="button"
            onClick={loadHistory}
            style={{
              border: '1px solid #e8eaed',
              background: '#f8f9fa',
              color: '#70757a',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            새로고침
          </button>
        </div>

        {historyError && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 10px' }}>{historyError}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
          {historyLoading ? (
            <p style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>
              알림 이력을 불러오는 중입니다...
            </p>
          ) : records.length === 0 ? (
            <p style={{ color: '#9aa0a6', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>
              아직 발송된 알림이 없습니다.
            </p>
          ) : records.map((record) => (
            <div key={record.id} style={{ background: '#f8f9fa', border: `1px solid ${record.is_read ? '#e8eaed' : '#bae6fd'}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#202124', fontSize: 13, fontWeight: 700 }}>
                  {record.region} / {METRICS.find((m) => m.value === record.metric)?.label || record.metric}
                </span>
                {!record.is_read ? (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(record.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0ea5e9',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    읽음으로 표시
                  </button>
                ) : (
                  <span style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>읽음</span>
                )}
              </div>
              <p style={{ color: '#5f6368', fontSize: 13, lineHeight: 1.45, margin: '0 0 6px' }}>
                {record.message}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', color: '#9aa0a6', fontSize: 11 }}>
                <span>실제값: {record.actual_value}</span>
                <span>임계값: {record.threshold_value}</span>
                <span>{new Date(record.created_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
