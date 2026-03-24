import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = useMemo(() => {
    if (user.role === 'admin') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: '📋' },
        { to: '/admin/users', label: 'Users', icon: '👥' },
        { to: '/exam/create', label: 'Create', icon: '➕' },
        { to: '/analytics', label: 'Analytics', icon: '📊' },
        { to: '/profile', label: 'Profile', icon: '👤' },
      ];
    }
    if (user.role === 'teacher') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: '📋' },
        { to: '/exam/create', label: 'Create', icon: '➕' },
        { to: '/analytics', label: 'Analytics', icon: '📊' },
        { to: '/profile', label: 'Profile', icon: '👤' },
      ];
    }
    return [
      { to: '/dashboard', label: 'Exams', icon: '📝' },
      { to: '/my-results', label: 'Results', icon: '🏆' },
      { to: '/profile', label: 'Profile', icon: '👤' },
    ];
  }, [user.role]);

  const welcomeText = user.role === 'teacher' || user.role === 'admin' ? 'Welcome Teacher' : 'Welcome Student';

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.inner}>
          <Link to="/dashboard" style={styles.logo}>
            <span style={styles.logoMark}>🔒</span>
            <span style={styles.logoText}>SecureExam</span>
          </Link>

          {!isMobile && (
            <div style={styles.links}>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    ...styles.link,
                    ...(location.pathname === link.to ? styles.linkActive : {}),
                  }}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}

          <div style={styles.right}>
            {!isMobile && <span style={styles.welcome}>{welcomeText}</span>}
            <button style={styles.iconBtn} title="Notifications">🔔</button>
            <button
              style={styles.iconBtn}
              title={darkMode ? 'Switch to light' : 'Switch to dark'}
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? '🌙' : '☀️'}
            </button>

            <div style={styles.userWrap}>
              <button style={styles.userBtn} onClick={() => setMenuOpen((prev) => !prev)}>
                <span style={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</span>
                {!isMobile && (
                  <span style={styles.userMeta}>
                    <span style={styles.userName}>{user.name}</span>
                    <span style={styles.userRole}>{user.role}</span>
                  </span>
                )}
                <span style={styles.chevron}>{menuOpen ? '▲' : '▼'}</span>
              </button>

              {menuOpen && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <p style={styles.dropName}>{user.name}</p>
                    <p style={styles.dropEmail}>{user.email}</p>
                  </div>
                  <button style={styles.dropAction} onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                    👤 Profile
                  </button>
                  <button style={{ ...styles.dropAction, color: 'var(--danger)' }} onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isMobile && (
        <div style={styles.bottomNav}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                ...styles.bottomItem,
                ...(location.pathname === link.to ? styles.bottomItemActive : {}),
              }}
            >
              <span style={styles.bottomIcon}>{link.icon}</span>
              <span style={styles.bottomText}>{link.label}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 1100,
    backdropFilter: 'blur(10px)',
    background: 'rgba(255,255,255,0.85)',
    borderBottom: '1px solid var(--border)',
  },
  inner: {
    maxWidth: 1400,
    margin: '0 auto',
    height: 66,
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.8rem',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none', color: 'var(--text-primary)' },
  logoMark: { fontSize: '1.1rem' },
  logoText: { fontWeight: 800, letterSpacing: '-0.02em' },
  links: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
  link: {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.84rem',
    fontWeight: 600,
    borderRadius: 10,
    padding: '0.48rem 0.72rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    transition: 'all 0.2s ease',
  },
  linkActive: { background: 'var(--accent-glow)', color: 'var(--accent)' },
  right: { display: 'flex', alignItems: 'center', gap: '0.45rem' },
  welcome: {
    fontSize: '0.78rem',
    color: 'var(--accent)',
    fontWeight: 700,
    background: 'rgba(37,99,235,0.1)',
    border: '1px solid rgba(37,99,235,0.25)',
    borderRadius: 999,
    padding: '0.2rem 0.55rem',
  },
  iconBtn: {
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    borderRadius: 10,
    width: 34,
    height: 34,
    cursor: 'pointer',
  },
  userWrap: { position: 'relative' },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    borderRadius: 10,
    cursor: 'pointer',
    padding: '0.2rem 0.35rem',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  userMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '0.1rem' },
  userName: { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' },
  userRole: { fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'capitalize' },
  chevron: { fontSize: '0.58rem', color: 'var(--text-muted)', paddingRight: '0.2rem' },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: 220,
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    boxShadow: '0 14px 30px rgba(15,23,42,0.15)',
    overflow: 'hidden',
  },
  dropdownHeader: { padding: '0.75rem', borderBottom: '1px solid var(--border)' },
  dropName: { fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' },
  dropEmail: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  dropAction: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    background: 'transparent',
    padding: '0.65rem 0.75rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1200,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid var(--border)',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    padding: '0.35rem 0.4rem calc(0.45rem + env(safe-area-inset-bottom))',
  },
  bottomItem: {
    textDecoration: 'none',
    color: 'var(--text-muted)',
    borderRadius: 10,
    padding: '0.35rem 0.2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.1rem',
  },
  bottomItemActive: { background: 'var(--accent-glow)', color: 'var(--accent)' },
  bottomIcon: { fontSize: '0.95rem' },
  bottomText: { fontSize: '0.62rem', fontWeight: 700 },
};

export default Navbar;
