import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const Profile = () => {
  const { user } = useAuth();
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, passed: 0, avgScore: 0, totalViolations: 0 });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/exam/available');
        const allResults = [];
        for (const exam of data.exams) {
          try {
            const res = await api.get(`/exam/${exam._id}/results`);
            if (res.data.results.length > 0) {
              allResults.push(...res.data.results.map(r => ({ ...r, examTitle: exam.title })));
            }
          } catch (e) { /* skip */ }
        }
        allResults.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        setExamHistory(allResults);

        // Compute stats
        const submitted = allResults.filter(r => r.status === 'submitted');
        setStats({
          total: allResults.length,
          passed: submitted.filter(r => r.passed).length,
          avgScore: submitted.length > 0
            ? (submitted.reduce((a, r) => a + (r.percentage || 0), 0) / submitted.length).toFixed(1)
            : 0,
          totalViolations: allResults.reduce((a, r) => a + (r.totalViolations || 0), 0),
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        {/* Profile Header */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={styles.profileInfo}>
            <h1 style={styles.name}>{user?.name}</h1>
            <p style={styles.email}>{user?.email}</p>
            <span style={styles.roleBadge}>{user?.role?.toUpperCase()}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Exams Taken</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statValue, color: 'var(--success)' }}>{stats.passed}</span>
            <span style={styles.statLabel}>Passed</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statValue, color: 'var(--accent)' }}>{stats.avgScore}%</span>
            <span style={styles.statLabel}>Avg Score</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statValue, color: stats.totalViolations > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {stats.totalViolations}
            </span>
            <span style={styles.statLabel}>Total Violations</span>
          </div>
        </div>

        {/* Exam History */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Exam History</h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading history...</p>
          ) : examHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No exams taken yet. Go to the dashboard to start an exam!
            </p>
          ) : (
            <div style={styles.historyList}>
              {examHistory.map((session, i) => (
                <div key={session._id || i} style={styles.historyItem} className="fade-in">
                  <div style={styles.histItemLeft}>
                    <div style={{
                      ...styles.histIcon,
                      background: session.passed ? 'rgba(16,185,129,0.15)' : session.status === 'terminated' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: session.passed ? 'var(--success)' : session.status === 'terminated' ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      {session.passed ? '✓' : session.status === 'terminated' ? '✕' : '—'}
                    </div>
                    <div>
                      <span style={styles.histTitle}>{session.examTitle || 'Exam'}</span>
                      <span style={styles.histDate}>
                        {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Not submitted'}
                      </span>
                    </div>
                  </div>
                  <div style={styles.histItemRight}>
                    <span style={{
                      ...styles.histScore,
                      color: session.passed ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {session.percentage || 0}%
                    </span>
                    <span style={{
                      ...styles.histStatus,
                      color: session.status === 'submitted' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {session.status?.toUpperCase()}
                    </span>
                    {session.totalViolations > 0 && (
                      <span style={styles.histViol}>
                        ⚠ {session.totalViolations}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🔒 Account Security</h2>
          <div style={styles.secList}>
            <div style={styles.secItem}>
              <span style={{ color: 'var(--success)' }}>●</span>
              <span>Password encrypted with bcrypt (12 rounds)</span>
            </div>
            <div style={styles.secItem}>
              <span style={{ color: 'var(--success)' }}>●</span>
              <span>Session tokens rotate on refresh (JWT)</span>
            </div>
            <div style={styles.secItem}>
              <span style={{ color: 'var(--success)' }}>●</span>
              <span>Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Current session'}</span>
            </div>
            <div style={styles.secItem}>
              <span style={{ color: user?.loginAttempts > 0 ? 'var(--warning)' : 'var(--success)' }}>●</span>
              <span>Failed login attempts: {user?.loginAttempts || 0}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  content: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  profileCard: { display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '1.5rem' },
  avatar: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: 'white', flexShrink: 0 },
  profileInfo: { flex: 1 },
  name: { fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' },
  email: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' },
  roleBadge: { fontSize: '0.65rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.25)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' },
  statCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' },
  statValue: { display: 'block', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  statLabel: { display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' },
  section: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' },
  histItemLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  histIcon: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 },
  histTitle: { display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' },
  histDate: { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' },
  histItemRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  histScore: { fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  histStatus: { fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' },
  histViol: { fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 500 },
  secList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  secItem: { display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' },
};

export default Profile;
