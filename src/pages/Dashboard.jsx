import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import RegionCard from '../components/RegionCard';
import AlertPanel from '../components/AlertPanel';
import { getPm25Grade, fmt } from '../utils/grade';

export default function Dashboard({ user, onLogout }) {
  const [liveData, setLiveData] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState('dashboard');

  const loadLive = useCallback(async () => {
    try {
      const data = await api.get('/api/environment/live');
      setLiveData(data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('데이터 로드 실패:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (region) => {
    try {
      const data = await api.get(`/api/environment/history/${encodeURIComponent(region)}?limit=10`);
      setHistory(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadLive();
    const timer = setInterval(loadLive, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadLive]);

  useEffect(() => { loadHistory(selectedRegion); }, [selectedRegion, loadLive]);

  const selectedData = liveData.find(d => d.region === selectedRegion);
  const grade = getPm25Grade(selectedData?.pm25);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>
      <header style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🌍</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>환경 모니터링</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'dashboard', label: '대시보드' }, { id: 'alerts', label: '알림 설정' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.id ? 'rgba(34,197,94,0.15)' : 'transparent',
              color: tab === t.id ? '#22c55e' : '#64748b',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>👤 {user?.username}</span>
          <button onClick={onLogout} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid #334155',
            background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer'
          }}>로그아웃</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {tab === 'dashboard' && (
          <>
            <div style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
              padding: '18px 24px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
            }}>
              <div>
                <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>선택 지역</p>
                <p style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedRegion}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>공기질 등급</p>
                <span style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 700,
                  background: grade.bg, color: grade.color, border: `1px solid ${grade.color}40`
                }}>{grade.label}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>PM2.5</p>
                <p style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
                  {fmt(selectedData?.pm25, ' ㎍/㎥')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>마지막 갱신</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                  {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                </p>
                <button onClick={loadLive} style={{
                  marginTop: 4, padding: '3px 10px', borderRadius: 6, border: '1px solid #334155',
                  background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer'
                }}>↻ 새로고침</button>
              </div>
            </div>

            <h2 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>전국 현황</h2>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ background: '#1e293b', borderRadius: 14, height: 180, opacity: 0.4 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
                {liveData.map(d => (
                  <RegionCard
                    key={d.region}
                    data={d}
                    selected={selectedRegion === d.region}
                    onClick={() => setSelectedRegion(d.region)}
                  />
                ))}
              </div>
            )}

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
                📈 {selectedRegion} 최근 측정 이력
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['측정시각', 'PM2.5', 'PM10', 'CO₂', '온도', '습도'].map(h => (
                        <th key={h} style={{
                          color: '#475569', fontWeight: 600, padding: '8px 12px',
                          textAlign: 'left', borderBottom: '1px solid #334155', whiteSpace: 'nowrap'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={6} style={{ color: '#475569', padding: '20px 12px', textAlign: 'center' }}>데이터가 없습니다</td></tr>
                    ) : history.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ color: '#64748b', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {new Date(row.measured_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        {['pm25', 'pm10', 'co2', 'temperature', 'humidity'].map(k => (
                          <td key={k} style={{ color: '#cbd5e1', padding: '10px 12px', fontFamily: 'monospace' }}>
                            {fmt(row[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <AlertPanel />
          </div>
        )}
      </main>
    </div>
  );
}