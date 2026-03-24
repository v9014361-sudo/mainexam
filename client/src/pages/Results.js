import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Results = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const endpoint = user.role === 'teacher' ? `/exam/${id}/all-results` : `/exam/${id}/results`;
        const { data } = await api.get(endpoint);
        setResults(data.results);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id, user]);

  const st = {
    wrap: { minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' },
    inner: { maxWidth: 900, margin: '0 auto' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700 },
    backBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem' },
    th: { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
    td: { padding: '0.85rem 1rem', background: 'var(--bg-card)', fontSize: '0.88rem' },
    tdFirst: { borderRadius: '8px 0 0 8px' },
    tdLast: { borderRadius: '0 8px 8px 0' },
    passed: { color: 'var(--success)', fontWeight: 600 },
    failed: { color: 'var(--danger)', fontWeight: 600 },
    vCount: { fontFamily: 'var(--font-mono)', fontSize: '0.8rem' },
    empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
    stat: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' },
    statVal: { fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' },
    statLbl: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' },
  };

  const passCount = results.filter(r => r.passed).length;
  const avgScore = results.length ? (results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(1) : 0;
  const avgViolations = results.length ? (results.reduce((s, r) => s + (r.totalViolations || 0), 0) / results.length).toFixed(1) : 0;

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <div style={st.hdr}>
          <h1 style={st.title}>📊 Exam Results</h1>
          <button onClick={() => navigate('/dashboard')} style={st.backBtn}>← Dashboard</button>
        </div>

        {!loading && results.length > 0 && (
          <div style={st.stats}>
            <div style={st.stat}><div style={st.statVal}>{results.length}</div><div style={st.statLbl}>Total Attempts</div></div>
            <div style={st.stat}><div style={{ ...st.statVal, color: 'var(--success)' }}>{passCount}</div><div style={st.statLbl}>Passed</div></div>
            <div style={st.stat}><div style={st.statVal}>{avgScore}%</div><div style={st.statLbl}>Average Score</div></div>
            <div style={st.stat}><div style={{ ...st.statVal, color: avgViolations > 2 ? 'var(--danger)' : 'var(--text-primary)' }}>{avgViolations}</div><div style={st.statLbl}>Avg Violations</div></div>
          </div>
        )}

        {loading ? <div style={st.empty}>Loading results...</div> : results.length === 0 ? (
          <div style={st.empty}>No results yet.</div>
        ) : (
          <table style={st.table}>
            <thead>
              <tr>
                {user.role === 'teacher' && <th style={st.th}>Student</th>}
                <th style={st.th}>Score</th>
                <th style={st.th}>Percentage</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Violations</th>
                <th style={st.th}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r._id} className="fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                  {user.role === 'teacher' && <td style={{ ...st.td, ...st.tdFirst }}>{r.userId?.name || 'Unknown'}</td>}
                  <td style={{ ...st.td, ...(user.role !== 'teacher' ? st.tdFirst : {}), fontFamily: 'var(--font-mono)' }}>
                    {r.score}/{r.answers?.length ? r.answers.reduce((s, a) => s + (a.points || 0), 0) + (r.score || 0) : '?'}
                  </td>
                  <td style={{ ...st.td, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.percentage?.toFixed(1)}%</td>
                  <td style={st.td}>
                    <span style={r.passed ? st.passed : st.failed}>
                      {r.status === 'terminated' ? '🚫 Terminated' : r.passed ? '✓ Passed' : '✕ Failed'}
                    </span>
                  </td>
                  <td style={st.td}>
                    <span style={{ ...st.vCount, color: r.totalViolations > 3 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      ⚠ {r.totalViolations || 0}
                    </span>
                  </td>
                  <td style={{ ...st.td, ...st.tdLast, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : r.terminatedAt ? new Date(r.terminatedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Results;
