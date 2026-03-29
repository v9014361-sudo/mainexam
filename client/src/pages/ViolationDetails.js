import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const ViolationDetails = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/proctor/violations/${sessionId}`);
        // Transform the response to match our expected format
        const sessionData = {
          _id: sessionId,
          userId: data.student,
          examId: data.exam,
          violations: data.violations || [],
          totalViolations: data.totalViolations || 0,
          status: data.status,
          startedAt: data.startedAt,
          submittedAt: data.submittedAt,
          terminatedAt: data.terminatedAt,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          focusLostCount: data.focusLostCount,
          isFlagged: data.isFlagged,
          browserFingerprint: data.browserFingerprint,
        };
        setSession(sessionData);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load session details');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  const violationTypeLabels = {
    tab_switch: 'Tab Switch',
    window_blur: 'Window Blur',
    fullscreen_exit: 'Fullscreen Exit',
    copy_attempt: 'Copy Attempt',
    paste_attempt: 'Paste Attempt',
    right_click: 'Right Click',
    screenshot_attempt: 'Screenshot Attempt',
    devtools_open: 'DevTools Opened',
    external_app_detected: 'External App Detected',
    keyboard_shortcut: 'Keyboard Shortcut',
    browser_resize: 'Browser Resize',
    idle_timeout: 'Idle Timeout',
    multiple_monitor: 'Multiple Monitors',
    screen_share_detected: 'Screen Share Detected',
    extension_detected: 'Extension Detected',
  };

  const severityColors = {
    low: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
    medium: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    high: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    critical: { bg: 'rgba(127,29,29,0.15)', color: '#991b1b' },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.content}>
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading violation details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.content}>
          <div style={styles.errorCard}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
              ⚠️ Error
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {error || 'Session not found'}
            </p>
            <button onClick={() => navigate('/analytics')} style={styles.backBtn}>
              ← Back to Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  const violations = session.violations || [];
  const violationsByType = {};
  violations.forEach(v => {
    if (!violationsByType[v.type]) {
      violationsByType[v.type] = [];
    }
    violationsByType[v.type].push(v);
  });

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <button onClick={() => navigate('/analytics')} style={styles.backBtn}>
          ← Back to Analytics
        </button>

        {/* Student Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Student</span>
              <span style={styles.infoValue}>{session.userId?.name || 'Unknown'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{session.userId?.email || '—'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Status</span>
              <span style={{
                ...styles.statusBadge,
                background: session.status === 'submitted' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: session.status === 'submitted' ? 'var(--success)' : 'var(--danger)',
              }}>
                {session.status?.toUpperCase()}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Total Violations</span>
              <span style={{ ...styles.infoValue, color: 'var(--warning)', fontWeight: 700 }}>
                {session.totalViolations || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Violations Summary */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Violation Summary</h2>
          {Object.keys(violationsByType).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No violations recorded 🎉
            </p>
          ) : (
            <div style={styles.summaryGrid}>
              {Object.entries(violationsByType).map(([type, items]) => (
                <div key={type} style={styles.summaryCard}>
                  <div style={styles.summaryIcon}>⚠️</div>
                  <div style={styles.summaryLabel}>
                    {violationTypeLabels[type] || type}
                  </div>
                  <div style={styles.summaryCount}>{items.length}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Violation Timeline */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🕐 Violation Timeline</h2>
          {violations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No violations to display
            </p>
          ) : (
            <div style={styles.timeline}>
              {violations
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((v, idx) => {
                  const severityStyle = severityColors[v.severity] || severityColors.medium;
                  return (
                    <div key={idx} style={styles.timelineItem}>
                      <div style={styles.timelineDot} />
                      <div style={styles.violationCard}>
                        <div style={styles.violationHeader}>
                          <div style={styles.violationTitle}>
                            <span style={styles.violationIcon}>⚠️</span>
                            <span style={styles.violationName}>
                              {violationTypeLabels[v.type] || v.type}
                            </span>
                          </div>
                          <span style={{
                            ...styles.severityBadge,
                            background: severityStyle.bg,
                            color: severityStyle.color,
                          }}>
                            {v.severity?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        {v.details && (
                          <p style={styles.violationDetails}>{v.details}</p>
                        )}
                        <div style={styles.violationTime}>
                          {new Date(v.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Session Metadata */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Session Information</h2>
          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Started At</span>
              <span style={styles.metadataValue}>
                {session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Submitted At</span>
              <span style={styles.metadataValue}>
                {session.submittedAt ? new Date(session.submittedAt).toLocaleString() : '—'}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>IP Address</span>
              <span style={styles.metadataValue}>{session.ipAddress || '—'}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Browser</span>
              <span style={styles.metadataValue}>
                {session.userAgent ? session.userAgent.split(' ')[0] : '—'}
              </span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Focus Lost Count</span>
              <span style={styles.metadataValue}>{session.focusLostCount || 0}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>Flagged</span>
              <span style={{
                ...styles.metadataValue,
                color: session.isFlagged ? 'var(--danger)' : 'var(--success)',
                fontWeight: 600,
              }}>
                {session.isFlagged ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  content: { maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  backBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-display)',
    marginBottom: '1.5rem',
    transition: 'all 0.2s',
  },
  infoCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  infoLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  infoValue: { fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  },
  summaryCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
    textAlign: 'center',
  },
  summaryIcon: { fontSize: '1.8rem', marginBottom: '0.5rem' },
  summaryLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.3rem',
  },
  summaryCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--warning)',
    fontFamily: 'var(--font-mono)',
  },
  timeline: { position: 'relative', paddingLeft: '2rem' },
  timelineItem: {
    position: 'relative',
    paddingBottom: '1.5rem',
    borderLeft: '2px solid var(--border)',
  },
  timelineDot: {
    position: 'absolute',
    left: '-6px',
    top: '8px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'var(--warning)',
    border: '2px solid var(--bg-card)',
  },
  violationCard: {
    marginLeft: '1.5rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
  },
  violationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  violationTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  violationIcon: { fontSize: '1.2rem' },
  violationName: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' },
  severityBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  violationDetails: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
    lineHeight: 1.5,
  },
  violationTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  metadataItem: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  metadataLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  metadataValue: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    wordBreak: 'break-word',
  },
  errorCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    textAlign: 'center',
    marginTop: '2rem',
  },
};

export default ViolationDetails;
