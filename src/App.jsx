import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Wind, Thermometer, Droplets, User, Lock, LogOut } from 'lucide-react';

function App() {
  // 인증 관련 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userRole, setUserRole] = useState('user');

  // 데이터 관련 상태
  const [envData, setEnvData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. 회원가입 / 로그인 처리 함수
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

      if (!response.ok) {
        throw new Error(result.error || '인증 처리에 실패했습니다.');
      }

      if (isRegisterMode) {
        alert('회원가입이 완료되었습니다! 로그인해 주세요.');
        setIsRegisterMode(false);
        setPassword('');
      } else {
        // 로그인 성공 시 JWT 토큰 보관
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

  // 2. 실시간 대기질 데이터 가져오기 (JWT 토큰 헤더 인증 필요)
// 2. 실시간 대기질 데이터 가져오기 (5000번 백엔드 주소 직접 타격 및 예외 오타 수정)
  const fetchEnvironmentData = async (authToken = token) => {
    setLoading(true);
    setError('');
    try {
      // 🎯 target 주소를 5000번 백엔드로 완전히 고정합니다.
      const res = await fetch('http://localhost:5000/api/environment/live', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || '데이터를 가져오는데 실패했습니다.');
      }

      setEnvData(result.data);
    } catch (err) {
      setError(err.message);
      // 🎯 77번째 줄의 response 오타를 res로 수정하거나 안전하게 체크하도록 보완
      if (err.message.includes('토큰') || err.message.includes('인증')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUsername('');
    setPassword('');
    setEnvData([]);
  };

  // UI 스타일 서브 컴포넌트
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '2rem' }}>
      {/* 대시보드 헤더 */}
      <header style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#38bdf8' }}>📊 실시간 통합 대시보드</h1>
          <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>AirKorea 가상 데이터 스트림 수집 현황 (5분 주기 동기화)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          <span style={{ backgroundColor: '#334155', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
            🔐 <b>{username}</b> 님 ({userRole === 'admin' ? '관리자' : '일반 유저'})
          </span>
          <button onClick={() => fetchEnvironmentData()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </header>

      {/* 대시보드 메인 판넬 Grid */}
      {loading && envData.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: '1.25rem', color: '#94a3b8', marginTop: '5rem' }}>데이터를 동기화 중입니다...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {envData.map((item) => (
            <div key={item.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fba524' }}>📍 {item.region}</span>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#0f172a', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#94a3b8', marginLeft: 'auto' }}>{item.source}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}><Wind size={18} color="#38bdf8" /> 초미세먼지 (PM2.5)</div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem', marginLeft: 'auto' }}>{item.pm25} <small>µg/m³</small></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}><Wind size={18} color="#0ea5e9" /> 미세먼지 (PM10)</div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem', marginLeft: 'auto' }}>{item.pm10} <small>µg/m³</small></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}><Shield size={18} color="#10b981" /> 이산화탄소 (CO2)</div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem', marginLeft: 'auto' }}>{item.co2} <small>ppm</small></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}><Thermometer size={18} color="#f43f5e" /> 대기 온도</div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem', marginLeft: 'auto' }}>{item.temperature} <small>°C</small></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}><Droplets size={18} color="#22d3ee" /> 대기 습도</div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem', marginLeft: 'auto' }}>{item.humidity} <small>%</small></span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1.25rem', textAlign: 'right', borderTop: '1px dashed #334155', paddingTop: '0.5rem' }}>
                수집 시각: {new Date(item.measured_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;