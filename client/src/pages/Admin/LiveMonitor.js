import React from 'react';
import Navbar from '../../components/Navbar';

const LiveMonitor = () => {
  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Live Exam Monitor</h1>
          <p style={styles.subtitle}>Real-time monitoring of active exam sessions.</p>
        </div>
        <div style={styles.content}>
          <div style={styles.emptyBox}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
            <h3>Waiting for active sessions...</h3>
            <p>Once students start an exam, their live status and violations will appear here.</p>
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

export default LiveMonitor;
