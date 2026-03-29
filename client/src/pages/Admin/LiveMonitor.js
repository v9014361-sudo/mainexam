import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const LiveMonitor = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const wsRef = useRef(null);

  // 1. Fetch exams created by this teacher
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const endpoint = user.role === 'admin' ? '/exam' : '/exam/my-exams';
        const { data } = await api.get(endpoint);
        setExams(data.exams || []);
      } catch (err) {
        console.error('Failed to fetch exams', err);
      }
    };
    fetchExams();
  }, [user.role]);

  // 2. Fetch active sessions for the selected exam
  useEffect(() => {
    if (!selectedExam) {
      setActiveSessions([]);
      setEvents([]);
      return;
    }
    const fetchActiveSessions = async () => {
      try {
        const { data } = await api.get(`/exam/${selectedExam}/all-results`);
        // Filter only those in progress or started
        const active = data.results.filter(s => s.status === 'started' || s.status === 'in_progress');
        setActiveSessions(active);
      } catch (err) {
        console.error('Failed to load sessions', err);
      }
    };
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000); // Polling every 15s to update students joining
    return () => clearInterval(interval);
  }, [selectedExam]);

  // 3. Setup WebSocket
  useEffect(() => {
    if (!selectedExam) return;

    const connectWs = () => {
      // Build WS URL dynamically from current window host to support multiple environments
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const wsOrigin = apiUrl.replace('http', 'ws').replace('/api', '');
      const wsUrl = `${wsOrigin}/ws/proctor`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('Connected • Subscribing...');
        // Backend reads HttpOnly cookie natively. We just need to subscribe.
        ws.send(JSON.stringify({ type: 'teacher:subscribe', examId: selectedExam }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'subscribed') {
          setConnectionStatus('📡 Monitoring Live');
          addEvent(`System: Successfully connected to exam live stream.`);
        } 
        else if (msg.type === 'violation:live') {
          addEvent(`🚨 Violation [${msg.studentName || 'Student'}]: ${msg.violationType} (${msg.severity})`);
          updateSessionViolation(msg.sessionId, msg.totalViolations);
        }
        else if (msg.type === 'status:update') {
          addEvent(`ℹ️ Status Update [${msg.studentName || 'Student'}]: ${msg.status}`);
          if (msg.status === 'terminated' || msg.status === 'submitted') {
            // Optimistically remove from active list if they finished or were terminated
            setActiveSessions(prev => prev.filter(s => s._id !== msg.sessionId));
          }
        }
        else if (msg.type === 'error') {
          console.error('WS Error:', msg.message);
          if (msg.message === 'Authentication required' || msg.message === 'Authenticate first') {
            setConnectionStatus('Auth Failed (Refresh needed)');
          } else {
            addEvent(`⚠️ Error: ${msg.message}`);
          }
        }
      };

      ws.onclose = () => {
        if (connectionStatus !== 'Auth Failed (Refresh needed)') {
           setConnectionStatus('Disconnected (Reconnecting...)');
           setTimeout(connectWs, 5000);
        }
      };
      
      return ws;
    };

    let wsInstance = connectWs();
    return () => {
      if (wsInstance) wsInstance.close();
    };
    // eslint-disable-next-line
  }, [selectedExam]);

  const addEvent = (text) => {
    setEvents(prev => {
      const ts = new Date().toLocaleTimeString();
      return [{ id: Date.now() + Math.random(), text: `${ts} - ${text}` }, ...prev].slice(0, 50);
    });
  };

  const updateSessionViolation = (sessionId, count) => {
    setActiveSessions(prev => 
      prev.map(s => s._id === sessionId ? { ...s, totalViolations: count || (s.totalViolations + 1) } : s)
    );
  };

  // 4. Proctor Actions
  const handleWarn = (sessionId) => {
    const msg = window.prompt('Enter warning message:');
    if (!msg) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'teacher:warn', sessionId, message: msg }));
      addEvent(`⚠️ Sent warning to session ${sessionId.substring(0, 6)}`);
    } else {
      alert('WebSocket not connected');
    }
  };

  const handleTerminate = (sessionId) => {
    const reason = window.prompt('Reason for exam termination (e.g. cheating):');
    if (!reason) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'teacher:terminate', sessionId, reason }));
      addEvent(`🚫 Requested termination for session ${sessionId.substring(0, 6)}`);
      // Optimistically remove from view
      setActiveSessions(prev => prev.filter(s => s._id !== sessionId));
    } else {
      alert('WebSocket not connected');
    }
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Live Exam Monitor</h1>
          <p style={styles.subtitle}>Real-time monitoring of active student sessions and violations.</p>
        </div>
        
        <div style={styles.controls}>
          <select 
            style={styles.select}
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option value="">-- Select an Exam to Monitor --</option>
            {exams.map(ex => (
              <option key={ex._id} value={ex._id}>{ex.title}</option>
            ))}
          </select>
          {selectedExam && (
            <div style={{ ...styles.statusBadge, color: connectionStatus.includes('Connected') || connectionStatus.includes('Monitoring') ? 'var(--success)' : (connectionStatus.includes('Auth') || connectionStatus.includes('Disconnected') ? 'var(--danger)' : '#faad14') }}>
              {connectionStatus}
            </div>
          )}
        </div>

        <div style={styles.grid}>
          {/* Active Students Area */}
          <div style={styles.sessionsPanel}>
            <h3 style={styles.panelTitle}>Active Sessions ({activeSessions.length})</h3>
            
            {!selectedExam ? (
              <div style={styles.emptyBox}>Please select an exam to monitor.</div>
            ) : activeSessions.length === 0 ? (
              <div style={styles.emptyBox}>No active sessions currently found for this exam.</div>
            ) : (
              <div style={styles.cards}>
                 {activeSessions.map((session) => (
                    <div key={session._id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h4 style={styles.studentName}>{session.userId?.name || 'Unknown Student'}</h4>
                        <span style={styles.timeStarted}>
                          Started: {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div style={styles.cardBody}>
                         <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                           <p style={{margin: '0 0 0.4rem 0'}}><strong>Email:</strong> {session.userId?.email || 'N/A'}</p>
                           <p style={{margin: 0}}><strong>IP:</strong> {session.ipAddress || 'unknown'}</p>
                         </div>
                         <div style={{...styles.violationBadge, background: ((session.totalViolations || 0) > 3 ? '#ff4d4f' : (session.totalViolations || 0) > 0 ? '#faad14' : 'transparent'), color: ((session.totalViolations || 0) > 0 ? '#1f1f1f' : 'var(--text-primary)')}}>
                           Violations: {session.totalViolations || 0}
                         </div>
                      </div>

                      <div style={styles.cardActions}>
                        <button onClick={() => handleWarn(session._id)} style={styles.warnBtn}>Warn Student</button>
                        <button onClick={() => handleTerminate(session._id)} style={styles.termBtn}>Terminate</button>
                      </div>
                    </div>
                 ))}
              </div>
            )}
          </div>

          {/* Live Activity Log */}
          <div style={styles.eventLogPanel}>
            <h3 style={styles.panelTitle}>Live Feed</h3>
            <div style={styles.liveFeed}>
              {events.length === 0 && <p style={{color: 'var(--text-muted)'}}>Waiting for events...</p>}
              {events.map((ev) => (
                <div key={ev.id} style={styles.eventItem}>
                  {ev.text}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' },
  controls: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  select: { padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem', minWidth: '350px', fontWeight: 'bold' },
  statusBadge: { padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, transition: 'color 0.3s' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' },
  sessionsPanel: { background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.5rem', minHeight: '500px' },
  eventLogPanel: { background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.5rem', maxHeight: '600px', display: 'flex', flexDirection: 'column' },
  liveFeed: { flex: 1, overflowY: 'auto', background: '#1e1e1e', color: '#00ff00', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem' },
  eventItem: { marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem', lineHeight: '1.4' },
  panelTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' },
  emptyBox: { textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card: { border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' },
  studentName: { margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  timeStarted: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  cardBody: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  violationBadge: { fontWeight: 'bold', border: '1px solid var(--border)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-primary)' },
  cardActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' },
  warnBtn: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' },
  termBtn: { background: '#ff4d4f', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' },
};

export default LiveMonitor;
