import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const MyResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await api.get('/exam/available');
        const all = [];
        for (const exam of data.exams) {
          try {
            const res = await api.get(`/exam/${exam._id}/results`);
            if (res.data.results.length > 0) {
              all.push({
                exam,
                sessions: res.data.results,
                best: res.data.results.reduce(
                  (best, s) => ((s.percentage || 0) > (best.percentage || 0) ? s : best),
                  res.data.results[0]
                ),
              });
            }
          } catch (e) {
            // Skip exams without accessible results
          }
        }
        setResults(all);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>My Results</h1>

        {loading ? (
          <div style={styles.empty}>Loading results...</div>
        ) : results.length === 0 ? (
          <div style={styles.empty}>
            <p>No exam results yet.</p>
            <button onClick={() => navigate('/dashboard')} style={styles.goBtn}>Browse Exams</button>
          </div>
        ) : (
          <div style={styles.list}>
            {results.map(({ exam, sessions, best }) => (
              <div key={exam._id} style={styles.card} className="fade-in">
                <div style={styles.cardLeft}>
                  <div
                    style={{
                      ...styles.resultCircle,
                      borderColor: best.passed ? 'var(--success)' : 'var(--danger)',
                      color: best.passed ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    <span style={styles.circleVal}>{best.percentage || 0}%</span>
                    <span style={styles.circleLabel}>{best.passed ? 'PASS' : 'FAIL'}</span>
                  </div>
                </div>
                <div style={styles.cardMiddle}>
                  <h3 style={styles.examTitle}>{exam.title}</h3>
                  <p style={styles.examDesc}>{exam.description?.substring(0, 100) || 'No description'}...</p>
                  <div style={styles.metaRow}>
                    <span style={styles.meta}>Score: <strong>{best.score}</strong></span>
                    <span style={styles.meta}>Attempts: <strong>{sessions.length}/{exam.settings?.maxAttempts || 1}</strong></span>
                    <span style={styles.meta}>
                      Violations: <strong style={{ color: best.totalViolations > 0 ? 'var(--warning)' : 'inherit' }}>{best.totalViolations || 0}</strong>
                    </span>
                  </div>
                  {best.submittedAt && (
                    <span style={styles.date}>
                      Submitted: {new Date(best.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div style={styles.cardRight}>
                  {sessions.length < (exam.settings?.maxAttempts || 1) && !best.passed && (
                    <button onClick={() => navigate(`/exam/${exam._id}/take`)} style={styles.retryBtn}>
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  content: { maxWidth: '900px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  pageTitle: { fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem' },
  empty: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  goBtn: {
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem 1.5rem',
  },
  cardLeft: { flexShrink: 0 },
  resultCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleVal: { fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 },
  circleLabel: { fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em' },
  cardMiddle: { flex: 1 },
  examTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' },
  examDesc: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' },
  metaRow: { display: 'flex', gap: '1.25rem', marginBottom: '0.25rem' },
  meta: { fontSize: '0.78rem', color: 'var(--text-secondary)' },
  date: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  cardRight: { flexShrink: 0 },
  retryBtn: {
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
  },
};

export default MyResults;
