import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage({ showToast }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
        showToast('Account created! You can now log in.', 'success');
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError('');
    setLoading(true);
    try {
      await login('admin', 'admin123');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Demo login failed – make sure all servers are running');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">⚽</div>
          <h1 className="login-title">
            <span className="logo-kick">Kick</span>
            <span className="logo-cut">Cut</span>
          </h1>
          <p className="login-subtitle">
            {mode === 'login' ? 'Sign in to access highlights & live chat' : 'Create your account'}
          </p>
        </div>

        {/* Quick demo access button */}
        {mode === 'login' && (
          <button
            id="demo-login-btn"
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 20, fontSize: '0.875rem' }}
            onClick={handleDemoLogin}
            disabled={loading}
            type="button"
          >
            ⚡ Quick Demo Login (admin)
          </button>
        )}

        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            id="login-submit-btn"
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              mode === 'login' ? '→ Sign In' : '🚀 Create Account'
            )}
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button id="goto-register-btn" onClick={() => { setMode('register'); setError(''); }}>
                Register
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button id="goto-login-btn" onClick={() => { setMode('login'); setError(''); }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
