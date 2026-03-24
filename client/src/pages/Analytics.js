import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const Analytics = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data } = await api.get('/exam/my-exams');
        setExams(data.exams);
        if (data.exams.length > 0) {
          setSelectedExam(data.exams[0]._id);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    const fetchSessions = async () => {
      try {
        const { data } = await api.get(`/exam/${selectedExam}/all-results`);
        setSessions(data.results || []);
      } catch (err) { console.error(err); }
    };
    fetchSessions();
  }, [selectedExam]);

  // Compute analytics
  const totalStudents = sessions.length;
  const submitted = sessions.filter(s => s.status === 'submitted');
  const terminated = sessions.filter(s => s.status === 'terminated');
  const passed = submitted.filter(s => s.passed);
  const avgScore = submitted.length > 0
    ? (submitted.reduce((acc, s) => acc + (s.percentage || 0), 0) / submitted.length).toFixed(1)
    : 0;
  const avgViolations = totalStudents > 0
    ? (sessions.reduce((acc, s) => acc + (s.totalViolations || 0), 0) / totalStudents).toFixed(1)
    : 0;
  const totalViolations = sessions.reduce((acc, s) => acc + (s.totalViolations || 0), 0);

  // Violation breakdown
  const violationBreakdown = {};
  sessions.forEach(s => {
    (s.violations || []).forEach(v => {
      violationBreakdown[v.type] = (violationBreakdown[v.type] || 0) + 1;
    });
  });
  const sortedViolations = Object.entries(violationBreakdown).sort((a, b) => b[1] - a[1]);

  // Score distribution
  const scoreBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  submitted.forEach(s => {
    const p = s.percentage || 0;
    if (p <= 20) scoreBuckets['0-20']++;
    else if (p <= 40) scoreBuckets['21-40']++;
    else if (p <= 60) scoreBuckets['41-60']++;
    else if (p <= 80) scoreBuckets['61-80']++;
    else scoreBuckets['81-100']++;
  });
  const maxBucket = Math.max(...Object.values(scoreBuckets), 1);

  const violationTypeLabels = {
    tab_switch: 'Tab Switch',
    window_blur: 'Window Blur',
    fullscreen_exit: 'Fullscreen Exit',
    copy_attempt: 'Copy Attempt',
    paste_attempt: 'Paste Attempt',
    right_click: 'Right Click',
    screenshot_attempt: 'Screenshot',
    devtools_open: 'DevTools',
    external_app_detected: 'External App',
    keyboard_shortcut: 'Keyboard Shortcut',
    browser_resize: 'Browser Resize',
    idle_timeout: 'Idle Timeout',
    multiple_monitor: 'Multi Monitor',
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <div style={styles.titleRow}>
          <h1 style={styles.pageTitle}>📊 Exam Analytics</h1>
          <select
            value={selectedExam || ''}
            onChange={(e) => setSelectedExam(e.target.value)}
            style={styles.examSelect}
          >
            {exams.map(ex => (
              <option key={ex._id} value={ex._id}>{ex.title}</option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        <div style={styles.cardGrid}>
          {[
            { label: 'Total Students', value: totalStudents, color: 'var(--accent)' },
            { label: 'Submitted', value: submitted.length, color: 'var(--success)' },
            { label: 'Terminated', value: terminated.length, color: 'var(--danger)' },
            { label: 'Pass Rate', value: submitted.length > 0 ? `${((passed.length / submitted.length) * 100).toFixed(0)}%` : '—', color: 'var(--success)' },
            { label: 'Avg Score', value: `${avgScore}%`, color: 'var(--accent)' },
            { label: 'Total Violations', value: totalViolations, color: 'var(--warning)' },
            { label: 'Avg Violations', value: avgViolations, color: 'var(--warning)' },
            { label: 'Passed', value: passed.length, color: 'var(--success)' },
          ].map((card, i) => (
            <div key={i} style={styles.summaryCard}>
              <span style={styles.cardLabel}>{card.label}</span>
              <span style={{ ...styles.cardValue, color: card.color }}>{card.value}</span>
            </div>
          ))}
        </div>

        <div style={styles.twoCol}>
          {/* Score Distribution */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Score Distribution</h2>
            <div style={styles.barChart}>
              {Object.entries(scoreBuckets).map(([range, count]) => (
                <div key={range} style={styles.barItem}>
                  <span style={styles.barLabel}>{range}%</span>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${(count / maxBucket) * 100}%`,
                        background: count === Math.max(...Object.values(scoreBuckets))
                          ? 'var(--accent)' : 'var(--border)',
                      }}
                    />
                  </div>
                  <span style={styles.barCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Violation Breakdown */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Violation Breakdown</h2>
            {sortedViolations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                No violations recorded 🎉
              </p>
            ) : (
              <div style={styles.violationList}>
                {sortedViolations.map(([type, count]) => {
                  const maxV = sortedViolations[0][1];
                  return (
                    <div key={type} style={styles.violationRow}>
                      <span style={styles.violationType}>
                        {violationTypeLabels[type] || type}
                      </span>
                      <div style={styles.violationBar}>
                        <div style={{ ...styles.violationFill, width: `${(count / maxV) * 100}%` }} />
                      </div>
                      <span style={styles.violationCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Student Details Table */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Student Submissions</h2>
          {sessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No submissions yet.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>%</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Violations</th>
                    <th style={styles.th}>Submitted</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s._id} style={styles.tr}>
                      <td style={styles.td}>{s.userId?.name || '—'}</td>
                      <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {s.userId?.email || '—'}
                      </td>
                      <td style={styles.td}>{s.score || 0}</td>
                      <td style={{
                        ...styles.td,
                        fontWeight: 600,
                        color: s.passed ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {s.percentage || 0}%
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          background: s.status === 'submitted' ? 'rgba(16,185,129,0.1)' : s.status === 'terminated' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: s.status === 'submitted' ? 'var(--success)' : s.status === 'terminated' ? 'var(--danger)' : 'var(--warning)',
                        }}>
                          {s.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{
                        ...styles.td,
                        color: s.totalViolations > 0 ? 'var(--warning)' : 'var(--text-muted)',
                        fontWeight: s.totalViolations > 3 ? 700 : 400,
                      }}>
                        {s.totalViolations || 0}
                      </td>
                      <td style={{ ...styles.td, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                      </td>
                      <td style={styles.td}>
                        {s.violations?.length > 0 && (
                          <button
                            onClick={() => navigate(`/violations/${s._id}`)}
                            style={styles.viewViolBtn}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  pageTitle: { fontSize: '1.4rem', fontWeight: 700 },
  examSelect: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-display)', minWidth: '220px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
  summaryCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center' },
  cardLabel: { display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' },
  cardValue: { fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' },
  section: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' },
  barChart: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  barItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  barLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', width: '50px', textAlign: 'right', fontFamily: 'var(--font-mono)' },
  barTrack: { flex: 1, height: '20px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  barCount: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', width: '25px', fontFamily: 'var(--font-mono)' },
  violationList: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  violationRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  violationType: { fontSize: '0.72rem', color: 'var(--text-secondary)', width: '110px', flexShrink: 0 },
  violationBar: { flex: 1, height: '14px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' },
  violationFill: { height: '100%', borderRadius: '3px', background: 'var(--warning)' },
  violationCount: { fontSize: '0.7rem', fontWeight: 600, color: 'var(--warning)', width: '25px', textAlign: 'right', fontFamily: 'var(--font-mono)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' },
  viewViolBtn: { background: 'transparent', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-display)' },
};

export default Analytics;
