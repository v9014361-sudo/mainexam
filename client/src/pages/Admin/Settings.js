import React from 'react';
import Navbar from '../../components/Navbar';

const Settings = () => {
  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Portal Settings</h1>
          <p style={styles.subtitle}>Configure global system parameters and security policies.</p>
        </div>
        <div style={styles.content}>
          <div style={styles.emptyBox}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
            <h3>System Settings</h3>
            <p>Configuration options for the examination portal will be available here soon.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.9rem' },
  content: { background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '2rem' },
  emptyBox: { textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' },
};

export default Settings;
