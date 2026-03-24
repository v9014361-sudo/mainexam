import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password)) {
      return setError('Password must include uppercase, lowercase, number, and special character');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally { setLoading(false); }
  };

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div style={styles.container}>
      <div style={styles.bgPattern} />
      <div style={styles.card} className="fade-in">
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join SecureExam Platform</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} style={styles.input} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Register As</label>
            <select value={form.role} onChange={e => update('role', e.target.value)} style={styles.select}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} style={styles.input} minLength={8} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} style={styles.input} required />
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register Securely'}
          </button>
        </form>
        <p style={styles.link}>Already have an account? <Link to="/login" style={styles.linkA}>Sign in</Link></p>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' },
  bgPattern: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 50%)', pointerEvents: 'none' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2.5rem', width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1, boxShadow: 'var(--shadow)' },
  title: { textAlign: 'center', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' },
  error: { background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.8rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)' },
  select: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.8rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)' },
  button: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', marginTop: '0.5rem' },
  link: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1.5rem' },
  linkA: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 },
};

export default Register;
