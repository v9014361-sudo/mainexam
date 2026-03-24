import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgPattern} />
      <div style={styles.card} className="fade-in">
        <div style={styles.lockIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 style={styles.title}>SecureExam</h1>
        <p style={styles.subtitle}>End-to-End Encrypted Examination Platform</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={styles.input} placeholder="you@email.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={styles.input} placeholder="••••••••" required />
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In Securely'}
          </button>
        </form>
        
        <p style={styles.link}>
          Don't have an account? <Link to="/register" style={styles.linkA}>Register here</Link>
        </p>
        
        <div style={styles.security}>
          <span style={styles.secBadge}>🔐 AES-256 Encrypted</span>
          <span style={styles.secBadge}>🛡️ HMAC Verified</span>
          <span style={styles.secBadge}>🔒 Secure Session</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' },
  bgPattern: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)', pointerEvents: 'none' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '3rem', width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1, boxShadow: 'var(--shadow)' },
  lockIcon: { width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' },
  title: { textAlign: 'center', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '-0.02em' },
  subtitle: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' },
  error: { background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', animation: 'shake 0.3s ease-in-out' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-display)', transition: 'border-color 0.2s' },
  button: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.9rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'background 0.2s, transform 0.1s', marginTop: '0.5rem' },
  link: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1.5rem' },
  linkA: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 },
  security: { display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' },
  secBadge: { fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0.3rem 0.6rem', borderRadius: '20px', border: '1px solid var(--border)' },
};

export default Login;
