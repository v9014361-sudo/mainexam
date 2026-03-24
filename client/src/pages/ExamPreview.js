import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const ExamPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checksDone, setChecksDone] = useState(false);
  const [systemCheck, setSystemCheck] = useState({
    fullscreen: null,
    browser: null,
    notifications: null,
    screenSize: null,
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const { data } = await api.get(`/exam/${id}`);
        setExam(data.exam);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const runSystemCheck = () => {
    const ua = navigator.userAgent;
    const checks = {
      fullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen),
      browser: /Chrome|Firefox|Edg/.test(ua),
      notifications: true,
      screenSize: window.innerWidth >= 1024 && window.innerHeight >= 600,
    };
    setSystemCheck(checks);
    setChecksDone(true);
  };

  const allChecksPassed = checksDone && Object.values(systemCheck).every(Boolean);

  if (loading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.center}><p style={{ color: 'var(--text-secondary)' }}>Loading exam details...</p></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.center}>
          <h2 style={{ color: 'var(--danger)' }}>Exam not found</h2>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <button onClick={() => navigate('/dashboard')} style={styles.breadcrumb}>Back to Exams</button>

        <div style={styles.heroCard}>
          <div style={styles.heroTop}>
            <div>
              <h1 style={styles.title}>{exam.title}</h1>
              <p style={styles.desc}>{exam.description || 'No description provided.'}</p>
            </div>
            <div style={styles.heroBadges}>
              {exam.settings?.requireFullscreen && <span style={styles.badge}>Proctored</span>}
              {exam.settings?.encryptQuestions && <span style={styles.badgeGreen}>E2E Encrypted</span>}
            </div>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}><span style={styles.statVal}>{exam.duration}</span><span style={styles.statLabel}>Minutes</span></div>
            <div style={styles.stat}><span style={styles.statVal}>{exam.questions?.length || 0}</span><span style={styles.statLabel}>Questions</span></div>
            <div style={styles.stat}><span style={styles.statVal}>{exam.totalPoints || 0}</span><span style={styles.statLabel}>Points</span></div>
            <div style={styles.stat}><span style={styles.statVal}>{exam.passingScore}%</span><span style={styles.statLabel}>Pass Mark</span></div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>System Compatibility Check</h2>
          {!checksDone ? (
            <div style={styles.checkPrompt}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Run a quick check to verify your system setup.
              </p>
              <button onClick={runSystemCheck} style={styles.checkBtn}>Run System Check</button>
            </div>
          ) : (
            <div style={styles.checkResults}>
              {[
                ['Fullscreen Support', systemCheck.fullscreen],
                ['Browser Compatibility', systemCheck.browser],
                ['Notification API', systemCheck.notifications],
                ['Screen Size (min 1024x600)', systemCheck.screenSize],
              ].map(([label, pass]) => (
                <div key={label} style={styles.checkItem}>
                  <span style={{ color: pass ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{pass ? 'OK' : 'NO'}</span>
                  <span style={{ color: pass ? 'var(--text-primary)' : 'var(--danger)', fontSize: '0.9rem' }}>{label}</span>
                </div>
              ))}
              <div style={styles.checkSummary}>
                {allChecksPassed ? <span style={{ color: 'var(--success)' }}>All checks passed.</span> : <span style={{ color: 'var(--warning)' }}>Some checks failed.</span>}
              </div>
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button onClick={() => navigate('/dashboard')} style={styles.cancelBtn}>Back</button>
          <button
            onClick={() => navigate(`/exam/${id}/take`)}
            style={{
              ...styles.startBtn,
              opacity: checksDone && !allChecksPassed ? 0.6 : 1,
            }}
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' },
  content: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  breadcrumb: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem', padding: '0.25rem 0', marginBottom: '1rem', display: 'block' },
  heroCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '1.5rem' },
  heroTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' },
  desc: { color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' },
  heroBadges: { display: 'flex', gap: '0.4rem', flexShrink: 0 },
  badge: { fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.25)', whiteSpace: 'nowrap', fontWeight: 600 },
  badgeGreen: { fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap', fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' },
  stat: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 0.75rem', textAlign: 'center' },
  statVal: { display: 'block', fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  statLabel: { display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.2rem' },
  section: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' },
  checkPrompt: { textAlign: 'center', padding: '1rem' },
  checkBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.9rem' },
  checkResults: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  checkItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' },
  checkSummary: { marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 500, padding: '0.5rem', textAlign: 'center' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem' },
  startBtn: { background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem' },
  backBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)' },
};

export default ExamPreview;
