import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, FileEdit, Trash2, Search, ArrowLeft, AlertTriangle, AlertCircle, CheckCircle, Flag, X } from 'lucide-react';
import api from '../utils/api';

const Results = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [marksModal, setMarksModal] = useState({ isOpen: false, session: null, newScore: '', reason: '', remarks: '' });
  const [logsModal, setLogsModal] = useState({ isOpen: false, session: null });

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line
  }, [id, user]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      // Fetch exam details first to get total points
      if (user.role === 'teacher' || user.role === 'admin') {
        const examRes = await api.get(`/exam/${id}`);
        setExam(examRes.data.exam);
      }
      
      const endpoint = user.role === 'teacher' || user.role === 'admin' ? `/exam/${id}/all-results` : `/exam/${id}/results`;
      const { data } = await api.get(endpoint);
      setResults(data.results);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleResetSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to completely reset this exam attempt for the student? They will be able to take it again.')) return;
    try {
      await api.delete(`/exam/${id}/session/${sessionId}`);
      alert('Exam session has been reset.');
      fetchResults();
    } catch (error) {
      alert(`Failed to reset exam session: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleToggleFlag = async (session) => {
    try {
      const { data } = await api.patch(`/exam/${id}/session/${session._id}/flag`, { isFlagged: !session.isFlagged });
      setResults(prev => prev.map(r => r._id === session._id ? { ...r, isFlagged: data.isFlagged } : r));
    } catch (error) {
      alert('Failed to update flag status');
    }
  };

  const handleSaveMarks = async (e) => {
    e.preventDefault();
    if (!marksModal.newScore || !marksModal.reason) return;
    try {
      const { data } = await api.patch(`/exam/${id}/session/${marksModal.session._id}/marks`, {
        newScore: marksModal.newScore,
        reason: marksModal.reason,
        remarks: marksModal.remarks
      });
      setResults(prev => prev.map(r => r._id === data.session._id ? data.session : r));
      setMarksModal({ isOpen: false, session: null, newScore: '', reason: '', remarks: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to edit marks');
    }
  };

  const openMarksModal = (session) => {
    setMarksModal({
      isOpen: true,
      session,
      newScore: session.score || 0,
      reason: '',
      remarks: session.remarks || ''
    });
  };

  const filteredResults = results.filter(r => 
    (r.userId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.userId?.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getViolationColor = (count) => {
    if (!count || count <= 1) return 'var(--success)';
    if (count <= 3) return '#eab308'; // yellow
    return 'var(--danger)'; // red
  };

  const st = {
    wrap: { minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' },
    inner: { maxWidth: 1200, margin: '0 auto' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' },
    backBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem' },
    th: { textAlign: 'left', padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '1rem', background: 'var(--bg-card)', fontSize: '0.85rem', verticalAlign: 'middle' },
    tdFirst: { borderRadius: '8px 0 0 8px', borderLeft: '4px solid transparent' },
    tdLast: { borderRadius: '0 8px 8px 0' },
    flaggedRow: { borderLeftColor: 'var(--danger)' },
    passed: { color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' },
    failed: { color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' },
    vBadge: (count) => ({ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: 20, background: `${getViolationColor(count)}20`, color: getViolationColor(count), fontSize: '0.75rem', fontWeight: 700 }),
    actionGroup: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    actionBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' },
    searchBar: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: 8, width: 300 },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    stat: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', zIndex: 100 },
    modalContent: { background: 'var(--bg-card)', width: '100%', maxWidth: 500, borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' },
    input: { padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem' },
    historyBox: { background: 'var(--bg-primary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginTop: '1.5rem' },
  };

  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const passCount = results.filter(r => r.passed).length;
  const avgScore = results.length ? (results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(1) : 0;
  const avgViolations = results.length ? (results.reduce((s, r) => s + (r.totalViolations || 0), 0) / results.length).toFixed(1) : 0;

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <div style={st.hdr}>
          <div style={st.title}>
            <ShieldAlert size={28} className="text-blue" />
            <span>Advanced Results Dashboard</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {isTeacher && (
              <div style={st.searchBar}>
                <Search size={16} className="text-muted" />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
                />
              </div>
            )}
            <button onClick={() => navigate('/dashboard')} style={st.backBtn}><ArrowLeft size={16} /> Back</button>
          </div>
        </div>

        {!loading && results.length > 0 && isTeacher && (
          <div style={st.stats}>
            <div style={st.stat}><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{results.length}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Attempts</div></div>
            <div style={st.stat}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{passCount}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passed</div></div>
            <div style={st.stat}><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{avgScore}%</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Score</div></div>
            <div style={st.stat}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: avgViolations > 2 ? 'var(--danger)' : 'var(--text-primary)' }}>{avgViolations}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Violations</div></div>
          </div>
        )}

        {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading results...</div> : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 12, border: '1px dashed var(--border)' }}>No results found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={st.table}>
              <thead>
                <tr>
                  {isTeacher && <th style={st.th}>Student</th>}
                  <th style={st.th}>Marks</th>
                  <th style={st.th}>Percentage</th>
                  <th style={st.th}>Status</th>
                  <th style={st.th}>Violations</th>
                  {isTeacher && <th style={st.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r, i) => {
                  const maxMarks = exam ? exam.questions.reduce((sum, q) => sum + (q.points || 1), 0) : '?';
                  const rowStyles = { ...st.tdFirst, ...(r.isFlagged ? st.flaggedRow : {}) };
                  
                  return (
                    <tr key={r._id} style={{ background: r.isFlagged ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      {isTeacher && (
                        <td style={{ ...st.td, ...rowStyles }}>
                          <div style={{ fontWeight: 600 }}>{r.userId?.name || 'Unknown'} {r.isFlagged && <span title="Flagged"><Flag size={14} color="var(--danger)" style={{ marginLeft: 4 }} /></span>}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.userId?.rollNumber || 'No ID'}</div>
                        </td>
                      )}
                      
                      <td style={{ ...st.td, ...(!isTeacher ? rowStyles : {}), fontFamily: 'var(--font-mono)' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {r.score !== null && r.score !== undefined ? r.score : 0}
                        </span> / {maxMarks}
                      </td>
                      
                      <td style={{ ...st.td, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {r.percentage !== null && r.percentage !== undefined ? r.percentage.toFixed(1) : '0.0'}%
                      </td>
                      
                      <td style={st.td}>
                        {r.passed ? (
                          <span style={st.passed}><CheckCircle size={14} /> Passed</span>
                        ) : (
                          <span style={st.failed}><AlertCircle size={14} /> Failed</span>
                        )}
                        {r.status === 'terminated' && <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 4 }}>Terminated</div>}
                      </td>
                      
                      <td style={st.td}>
                        <span style={st.vBadge(r.totalViolations || 0)}>
                          <AlertTriangle size={14} /> {r.totalViolations || 0}
                        </span>
                      </td>
                      
                      {isTeacher && (
                        <td style={{ ...st.td, ...st.tdLast }}>
                          <div style={st.actionGroup}>
                            <button onClick={() => openMarksModal(r)} style={st.actionBtn} title="Edit Marks & Remarks">
                              <FileEdit size={14} className="text-blue" /> Edit
                            </button>
                            
                            <button onClick={() => setLogsModal({ isOpen: true, session: r })} style={st.actionBtn} title="View Violation Logs">
                              <ShieldAlert size={14} style={{ color: getViolationColor(r.totalViolations) }} /> Logs
                            </button>
                            
                            <button onClick={() => handleToggleFlag(r)} style={{ ...st.actionBtn, background: r.isFlagged ? 'var(--danger)' : 'transparent', color: r.isFlagged ? '#fff' : 'var(--text-primary)', borderColor: r.isFlagged ? 'var(--danger)' : 'var(--border)' }} title={r.isFlagged ? "Unflag Student" : "Flag as Suspicious"}>
                              <Flag size={14} /> {r.isFlagged ? 'Flagged' : 'Flag'}
                            </button>
                            
                            <button onClick={() => handleResetSession(r._id)} style={{ ...st.actionBtn, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }} title="Reset Attempt">
                              <Trash2 size={14} /> Reset
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Marks Modal */}
        {marksModal.isOpen && marksModal.session && (
          <div style={st.modalOverlay}>
            <div style={st.modalContent}>
              <div style={st.modalTitle}>
                <span>Edit Marks: {marksModal.session.userId?.name}</span>
                <button onClick={() => setMarksModal({ isOpen: false })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSaveMarks}>
                <div style={st.inputGroup}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>New Score *</label>
                  <input type="number" step="0.5" required style={st.input} value={marksModal.newScore} onChange={(e) => setMarksModal(prev => ({ ...prev, newScore: e.target.value }))} />
                </div>
                
                <div style={st.inputGroup}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Reason for Change *</label>
                  <input type="text" required placeholder="e.g. Granted grace marks for typo" style={st.input} value={marksModal.reason} onChange={(e) => setMarksModal(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
                
                <div style={st.inputGroup}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Remarks (Shown to Student - Optional)</label>
                  <textarea rows="3" style={st.input} value={marksModal.remarks} onChange={(e) => setMarksModal(prev => ({ ...prev, remarks: e.target.value }))} placeholder="Feedback..." />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setMarksModal({ isOpen: false })} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" style={{ padding: '0.6rem 1rem', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
                </div>
              </form>

              {marksModal.session.editHistory && marksModal.session.editHistory.length > 0 && (
                <div style={st.historyBox}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Edit History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {marksModal.session.editHistory.map((h, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', paddingBottom: '0.8rem', borderBottom: idx !== marksModal.session.editHistory.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{new Date(h.timestamp).toLocaleString()}</div>
                        <div>Changed score: <strong style={{ color: 'var(--danger)' }}>{h.oldScore}</strong> &rarr; <strong style={{ color: 'var(--success)' }}>{h.newScore}</strong></div>
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>"{h.reason}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Violations Log Modal */}
        {logsModal.isOpen && logsModal.session && (
          <div style={st.modalOverlay}>
            <div style={st.modalContent}>
              <div style={st.modalTitle}>
                <span>Violation Logs: {logsModal.session.userId?.name}</span>
                <button onClick={() => setLogsModal({ isOpen: false })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
              </div>
              
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Recorded Violations:</span>
                <span style={st.vBadge(logsModal.session.totalViolations || 0)}>{logsModal.session.totalViolations || 0}</span>
              </div>

              {(logsModal.session.violations || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(logsModal.session.violations).map((v, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: `4px solid ${v.severity === 'high' ? 'var(--danger)' : v.severity === 'medium' ? '#eab308' : 'var(--text-muted)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{v.type.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(v.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {v.details && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.details}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No violations recorded for this session.
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={() => setLogsModal({ isOpen: false })} style={{ padding: '0.6rem 1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Results;
