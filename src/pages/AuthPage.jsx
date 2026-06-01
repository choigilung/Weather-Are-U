import { useState } from 'react';
import { api } from '../services/api';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.post('/api/auth/register', form);
        setMode('login');
        alert('회원가입 완료! 로그인해주세요.');
      } else {
        const data = await api.post('/api/auth/login', form);
        onLogin(data.token, data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
          }}>🌍</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>환경 모니터링</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            {mode === 'login' ? '로그인하여 시작하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        <div style={{ display: 'flex', background: '#0f172a', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: mode === m ? '#334155' : 'transparent',
                color: mode === m ? '#f1f5f9' : '#64748b',
              }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {['username', 'password'].map(field => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                {field === 'username' ? '아이디' : '비밀번호'}
              </label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                placeholder={field === 'username' ? '아이디 입력' : '비밀번호 입력'}
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                  background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            background: loading ? '#334155' : '#22c55e', color: loading ? '#64748b' : '#0f172a',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  );
}