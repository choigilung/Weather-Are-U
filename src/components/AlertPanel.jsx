import { useState, useEffect } from 'react';
import { api } from '../services/api';

const METRICS = [
  { value: 'pm25', label: 'PM2.5 (㎍/㎥)' },
  { value: 'pm10', label: 'PM10 (㎍/㎥)' },
  { value: 'co2', label: 'CO₂ (ppm)' },
  { value: 'temperature', label: '온도 (°C)' },
  { value: 'humidity', label: '습도 (%)' },
];
const REGIONS = ['서울', '부산', '인천', '대구', '창원'];

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ region: '서울', metric: 'pm25', threshold: '', condition: 'gt' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try {
      const data = await api.get('/api/alerts');
      setAlerts(data.data || []);
    } catch {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.threshold) return;
    setSaving(true);
    try {
      await api.post('/api/alerts', { ...form, threshold: parseFloat(form.threshold) });
      setMsg('✅ 알림 설정 저장 완료!');
      setForm(p => ({ ...p, threshold: '' }));
      loadAlerts();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/alerts/${id}`);
      loadAlerts();
    } catch {}
  };

  const inputStyle = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    color: '#f1f5f9', padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box'
  };

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
      <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>🔔 알림 설정</h3>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>지역</label>
            <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} style={inputStyle}>
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>지표</label>
            <select value={form.metric} onChange={e => setForm(p => ({ ...p, metric: e.target.value }))} style={inputStyle}>
              {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>조건</label>
            <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} style={inputStyle}>
              <option value="gt">초과할 때</option>
              <option value="lt">미만일 때</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>임계값</label>
            <input type="number" placeholder="숫자 입력" value={form.threshold}
              onChange={e => setForm(p => ({ ...p, threshold: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <button type="submit" disabled={saving} style={{
          padding: '10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)',
          fontSize: 13, fontWeight: 600,
          background: saving ? '#334155' : 'rgba(34,197,94,0.2)',
          color: saving ? '#64748b' : '#22c55e',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? '저장 중...' : '+ 알림 추가'}
        </button>
        {msg && <p style={{ color: msg.startsWith('✅') ? '#22c55e' : '#f87171', fontSize: 12, margin: 0 }}>{msg}</p>}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0
          ? <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>설정된 알림이 없습니다</p>
          : alerts.map(a => (
            <div key={a.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#0f172a', borderRadius: 8, padding: '10px 14px',
            }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>
                  {a.region} · {METRICS.find(m => m.value === a.metric)?.label || a.metric}
                </span>
                <span style={{ color: '#22c55e', fontSize: 13, marginLeft: 8, fontFamily: 'monospace' }}>
                  {a.condition === 'gt' ? '>' : '<'} {a.threshold}
                </span>
              </div>
              <button onClick={() => handleDelete(a.id)} style={{
                background: 'none', border: 'none', color: '#475569',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px'
              }}>×</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}