import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Wind, Thermometer, Droplets, User, Lock, LogOut } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [envData, setEnvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('dashboard'); // 'dashboard' | 'history' | 'alerts'

  // 히스토리 관련
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 알림 관련
  const [alerts, setAlerts] = useState([]);
  const [alertForm, setAlertForm] = useState({ region: '서울', metric: 'pm25', threshold: '', condition: 'gt' });
  const [alertMsg, setAlertMsg] = useState('');

  const REGIONS = ['서울', '부산', '인천', '대구', '창원'];
  const METRICS = [
    { value: 'pm25', label: 'PM2.5 (㎍/㎥)' },
    { value: 'pm10', label: 'PM10 (㎍/㎥)' },
    { value: 'co2', label: 'CO₂ (ppm)' },
    { value: 'temperature', label: '온도 (°C)' },
    { value: 'humidity', label: '습도 (%)' },
  ];

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '인증 처리에 실패했습니다.');
      if (isRegisterMode) {
        alert('회원가입이 완료되었습니다! 로그인해 주세요.');
        setIsRegisterMode(false);
        setPassword('');
      } else {
        setToken(result.token);
        setIsLoggedIn(true);
        setUserRole(result.user.role);
        alert(`${result.user.username}님, 환영합니다!`);
        fetchEnvironmentData(result.token);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchEnvironmentData = async (authToken = token) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/environment/live', {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '데이터를 가져오는데 실패했습니다.');
      setEnvData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (region) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/environment/history/${encodeURIComponent(region)}?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      setHistory(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      setAlerts(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const saveAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.threshold) return;
    try {
      const res = await fetch('http://localhost:5000/api/alerts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...alertForm, threshold: parseFloat(alertForm.threshold) })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setAlertMsg('✅ 알림 설정 저장 완료!');
      setAlertForm(p => ({ ...p, threshold: '' }));
      fetchAlerts();
      setTimeout(() => setAlertMsg(''), 3000);
    } catch (err) {
      setAlertMsg('❌ ' + err.message);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (tab === 'history') fetchHistory(selectedRegion);
    if (tab === 'alerts') fetchAlerts();
  }, [tab, selectedRegion]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUsername('');
    setPassword('');
    setEnvData([]);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'sans-serif', color: '#f8fafc' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Shield size={48} color="#38bdf8" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>환경 모니터링 코어</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>{isRegisterMode ? '새로운 계정을 생성하세요' : '시스템 접속을 위해 인증이 필요합니다'}</p>
          </div>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>아이디</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} placeholder="아이디 입력" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>비밀번호</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} placeholder="비밀번호 입력" />
              </div>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>⚠️ {error}</div>}
            <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', padding: '0.75rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '0.5rem' }}>
              {isRegisterMode ? '회원가입 완료' : '시스템 로그인'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            <span onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }} style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>
              {isRegisterMode ? '이미 계정이 있으신가요? 로그인하기' : '아직 계정이 없으신가요? 회원가입'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px',
    color: '#fff', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #334155', padding: '1rem 2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ marginRight: 'auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#38bdf8' }}>📊 실시간 통합 대시보드</h1>
          <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>AirKorea 가상 데이터 스트림 수집 현황 (5분 주기 동기화)</p>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[{ id: 'dashboard', label: '대시보드' }, { id: 'history', label: '이력 조회' }, { id: 'alerts', label: '알림 설정' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: '600',
              backgroundColor: tab === t.id ? '#0284c7' : '#1e293b',
              color: tab === t.id ? '#fff' : '#94a3b8',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ backgroundColor: '#334155', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
            🔐 <b>{username}</b> 님 ({userRole === 'admin' ? '관리자' : '일반 유저'})
          </span>
          <button onClick={() => fetchEnvironmentData()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <RefreshCw size={16} /> 새로고침
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>

        {/* 대시보드 탭 */}
        {tab === 'dashboard' && (
          loading && envData.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: '1.25rem', color: '#94a3b8', marginTop: '5rem' }}>데이터를 동기화 중입니다...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {envData.map((item) => (
                <div key={item.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fba524' }}>📍 {item.region}</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#0f172a', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#94a3b8' }}>{item.source}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { icon: <Wind size={18} color="#38bdf8" />, label: '초미세먼지 (PM2.5)', val: `${item.pm25} µg/m³` },
                      { icon: <Wind size={18} color="#0ea5e9" />, label: '미세먼지 (PM10)', val: `${item.pm10} µg/m³` },
                      { icon: <Shield size={18} color="#10b981" />, label: '이산화탄소 (CO2)', val: `${item.co2} ppm` },
                      { icon: <Thermometer size={18} color="#f43f5e" />, label: '대기 온도', val: `${item.temperature} °C` },
                      { icon: <Droplets size={18} color="#22d3ee" />, label: '대기 습도', val: `${item.humidity} %` },
                    ].map(({ icon, label, val }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>{icon} {label}</div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1.25rem', textAlign: 'right', borderTop: '1px dashed #334155', paddingTop: '0.5rem' }}>
                    수집 시각: {new Date(item.measured_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 이력 조회 탭 */}
        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <button key={r} onClick={() => setSelectedRegion(r)} style={{
                  padding: '0.5rem 1.25rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  backgroundColor: selectedRegion === r ? '#0284c7' : '#1e293b',
                  color: selectedRegion === r ? '#fff' : '#94a3b8',
                  fontWeight: '600', fontSize: '0.875rem',
                }}>{r}</button>
              ))}
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
              <h3 style={{ color: '#f1f5f9', margin: '0 0 1rem', fontSize: '1rem' }}>📈 {selectedRegion} 최근 측정 이력</h3>
              {historyLoading ? (
                <p style={{ color: '#94a3b8', textAlign: 'center' }}>불러오는 중...</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        {['측정시각', 'PM2.5', 'PM10', 'CO₂', '온도', '습도'].map(h => (
                          <th key={h} style={{ color: '#64748b', padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '1px solid #334155', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr><td colSpan={6} style={{ color: '#475569', padding: '1.5rem', textAlign: 'center' }}>데이터가 없습니다</td></tr>
                      ) : history.map(row => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ color: '#64748b', padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            {new Date(row.measured_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          {['pm25', 'pm10', 'co2', 'temperature', 'humidity'].map(k => (
                            <td key={k} style={{ color: '#cbd5e1', padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{row[k]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 알림 설정 탭 */}
        {tab === 'alerts' && (
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
              <h3 style={{ color: '#f1f5f9', margin: '0 0 1.25rem', fontSize: '1rem' }}>🔔 알림 설정</h3>

              <form onSubmit={saveAlert} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>지역</label>
                    <select value={alertForm.region} onChange={e => setAlertForm(p => ({ ...p, region: e.target.value }))} style={inputStyle}>
                      {REGIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>지표</label>
                    <select value={alertForm.metric} onChange={e => setAlertForm(p => ({ ...p, metric: e.target.value }))} style={inputStyle}>
                      {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>조건</label>
                    <select value={alertForm.condition} onChange={e => setAlertForm(p => ({ ...p, condition: e.target.value }))} style={inputStyle}>
                      <option value="gt">초과할 때</option>
                      <option value="lt">미만일 때</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>임계값</label>
                    <input type="number" placeholder="숫자 입력" value={alertForm.threshold} onChange={e => setAlertForm(p => ({ ...p, threshold: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <button type="submit" style={{ padding: '0.625rem', borderRadius: '6px', border: '1px solid #0284c7', backgroundColor: 'rgba(2,132,199,0.15)', color: '#38bdf8', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}>
                  + 알림 추가
                </button>
                {alertMsg && <p style={{ color: alertMsg.startsWith('✅') ? '#22c55e' : '#f87171', fontSize: '0.875rem', margin: 0 }}>{alertMsg}</p>}
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.length === 0
                  ? <p style={{ color: '#475569', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>설정된 알림이 없습니다</p>
                  : alerts.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: '8px', padding: '0.625rem 1rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        {a.region} · {METRICS.find(m => m.value === a.metric)?.label || a.metric}
                        <span style={{ color: '#22c55e', marginLeft: '8px', fontFamily: 'monospace' }}>
                          {a.condition === 'gt' ? '>' : '<'} {a.threshold}
                        </span>
                      </span>
                      <button onClick={() => deleteAlert(a.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;