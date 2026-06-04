import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

const METRICS = [
  { value: 'pm25', label: 'PM2.5 (ug/m3)' },
  { value: 'pm10', label: 'PM10 (ug/m3)' },
  { value: 'co2', label: 'CO2 (ppm)' },
  { value: 'temperature', label: '온도 (C)' },
  { value: 'humidity', label: '습도 (%)' },
];

const REGIONS = ['서울', '부산', '인천', '대구', '창원'];

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [records, setRecords] = useState([]);
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

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f1f5f9',
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24 }}>
      <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>
        알림 설정
      </h3>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>지역</label>
            <select value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} style={inputStyle}>
              {REGIONS.map((region) => <option key={region}>{region}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>항목</label>
            <select value={form.metric} onChange={(event) => setForm((prev) => ({ ...prev, metric: event.target.value }))} style={inputStyle}>
              {METRICS.map((metric) => <option key={metric.value} value={metric.value}>{metric.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>조건</label>
            <select value={form.condition} onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))} style={inputStyle}>
              <option value="gt">초과하면</option>
              <option value="lt">미만이면</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>임계값</label>
            <input
              type="number"
              placeholder="숫자 입력"
              value={form.threshold}
              onChange={(event) => setForm((prev) => ({ ...prev, threshold: event.target.value }))}
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
            border: '1px solid rgba(34,197,94,0.3)',
            fontSize: 13,
            fontWeight: 600,
            background: saving ? '#334155' : 'rgba(34,197,94,0.2)',
            color: saving ? '#64748b' : '#22c55e',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '알림 추가'}
        </button>

        {message && <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{message}</p>}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 ? (
          <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            설정된 알림이 없습니다.
          </p>
        ) : alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a',
              borderRadius: 8,
              padding: '10px 14px',
              gap: 12,
            }}
          >
            <div>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {alert.region} / {METRICS.find((metric) => metric.value === alert.metric)?.label || alert.metric}
              </span>
              <span style={{ color: '#22c55e', fontSize: 13, marginLeft: 8, fontFamily: 'monospace' }}>
                {alert.condition === 'gt' ? '>' : '<'} {alert.threshold}
              </span>
            </div>
            <button
              onClick={() => handleDelete(alert.id)}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 4px',
              }}
              aria-label="알림 삭제"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #334155', marginTop: 24, paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>
            알림 이력
          </h3>
          <button
            type="button"
            onClick={loadHistory}
            style={{
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#94a3b8',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            새로고침
          </button>
        </div>

        {historyError && <p style={{ color: '#fca5a5', fontSize: 12, margin: '0 0 10px' }}>{historyError}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {historyLoading ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
              알림 이력을 불러오는 중입니다...
            </p>
          ) : records.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
              아직 발송된 알림이 없습니다.
            </p>
          ) : records.map((record) => (
            <div key={record.id} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
                  {record.region} / {METRICS.find((metric) => metric.value === record.metric)?.label || record.metric}
                </span>
                <span style={{ color: record.is_read ? '#64748b' : '#22c55e', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {record.is_read ? '읽음' : '안 읽음'}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.45, margin: '0 0 8px' }}>
                {record.message}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', color: '#64748b', fontSize: 12 }}>
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
