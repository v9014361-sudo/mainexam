import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, MiniMap, 
  applyEdgeChanges, applyNodeChanges, Panel 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { 
  Play, Save, History, Plus, X, Trash2, 
  Zap, Settings, Activity, ArrowRight 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { useToast } from '../components/Toast';

const initialNodes = [
  { 
    id: 'trigger-1', 
    type: 'input', 
    data: { label: '🚀 Trigger: Exam Submitted' }, 
    position: { x: 250, y: 5 },
    style: { background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges = [];

const WorkflowAutomation = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState('builder'); // builder | history
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const { data: history } = useQuery({
    queryKey: ['workflowHistory'],
    queryFn: async () => {
      const { data } = await api.get('/admin/workflows/history');
      return data;
    },
    enabled: view === 'history'
  });

  const addActionNode = () => {
    const newNode = {
      id: `action-${uuidv4()}`,
      data: { label: '⚡ Action: Send Notification' },
      position: { x: Math.random() * 400, y: Math.random() * 400 + 100 },
      style: { background: '#f0fdf4', border: '2px solid #10b981', borderRadius: '8px', padding: '10px' }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // For demo, we'll save a simplified rule based on the first connection
      const triggerNode = nodes.find(n => n.id.startsWith('trigger'));
      const edge = edges.find(e => e.source === triggerNode?.id);
      const targetNode = nodes.find(n => n.id === edge?.target);

      if (!targetNode) {
        addToast('Please connect a trigger to an action', 'error');
        return;
      }

      await api.post('/admin/workflows', {
        name: 'Auto Notification on Submission',
        trigger: 'exam_submitted',
        condition: { field: 'percentage', operator: 'lt', value: 40 },
        action: { type: 'send_notification', params: { message: 'Alert: Low Score Detected' } },
        isEnabled: true
      });
      
      addToast('Workflow saved and activated!', 'success');
    } catch (err) {
      addToast('Failed to save workflow', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Workflow Automation</h1>
            <p style={styles.subtitle}>Automate administrative tasks with visual rule chains.</p>
          </div>
          <div style={styles.headerActions}>
            <button 
              style={{ ...styles.viewBtn, ...(view === 'builder' ? styles.viewBtnActive : {}) }}
              onClick={() => setView('builder')}
            >
              <Zap size={18} /> Builder
            </button>
            <button 
              style={{ ...styles.viewBtn, ...(view === 'history' ? styles.viewBtnActive : {}) }}
              onClick={() => setView('history')}
            >
              <History size={18} /> Execution Logs
            </button>
          </div>
        </header>

        {view === 'builder' ? (
          <div style={styles.builderArea}>
            <div style={styles.canvasWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
              >
                <Background color="var(--border)" gap={20} />
                <Controls />
                <MiniMap style={{ borderRadius: '12px', background: 'var(--bg-card)' }} />
                <Panel position="top-right" style={styles.panel}>
                  <button onClick={addActionNode} style={styles.panelBtn}>
                    <Plus size={16} /> Add Action Node
                  </button>
                  <button 
                    onClick={handleSave} 
                    style={styles.saveBtn}
                    disabled={isSaving}
                  >
                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Workflow'}
                  </button>
                </Panel>
              </ReactFlow>
            </div>
            
            <aside style={styles.sidebar}>
              <h3 style={styles.sidebarTitle}>Properties</h3>
              <div style={styles.propGroup}>
                <label style={styles.label}>Select Trigger</label>
                <select style={styles.select}>
                  <option>On Exam Submission</option>
                  <option>On New User Registration</option>
                </select>
              </div>
              <div style={styles.propGroup}>
                <label style={styles.label}>Conditions (IF)</label>
                <div style={styles.conditionRow}>
                   <span>Score</span>
                   <select style={styles.miniSelect}><option>&lt;</option></select>
                   <input type="number" defaultValue={40} style={styles.miniInput}/>
                </div>
              </div>
              <div style={styles.propGroup}>
                <label style={styles.label}>Actions (THEN)</label>
                <div style={styles.actionItem}>
                   <Activity size={14} /> Send System Notification
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div style={styles.historyTable}>
             <table style={styles.table}>
               <thead>
                 <tr>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Workflow</th>
                    <th style={styles.th}>Trigger Event</th>
                    <th style={styles.th}>Action Taken</th>
                    <th style={styles.th}>Status</th>
                 </tr>
               </thead>
               <tbody>
                 {history?.length > 0 ? history.map((log) => (
                   <tr key={log._id} style={styles.tr}>
                      <td style={styles.td}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={styles.td}>{log.workflowId?.name || 'Deleted Workflow'}</td>
                      <td style={styles.td}>{log.triggerEvent}</td>
                      <td style={styles.td}>{log.actionTaken}</td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge}>success</span>
                      </td>
                   </tr>
                 )) : (
                   <tr><td colSpan="5" style={styles.empty}>No automation logs found yet.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Styles ---

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  title: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.95rem' },
  headerActions: { display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--border)' },
  viewBtn: { border: 'none', background: 'transparent', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  viewBtnActive: { background: 'var(--bg-primary)', color: 'var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },

  builderArea: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', height: '650px' },
  canvasWrapper: { background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' },
  panel: { padding: '1rem', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: '12px', display: 'flex', gap: '0.75rem', border: '1px solid var(--border)' },
  panelBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' },
  saveBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' },
  
  sidebar: { background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' },
  sidebarTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' },
  propGroup: { marginBottom: '1.5rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' },
  select: { width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' },
  conditionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' },
  miniSelect: { padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)' },
  miniInput: { width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' },
  actionItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', color: '#10b981', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 },

  historyTable: { background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' },
  th: { padding: '1rem', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', fontWeight: 600 },
  td: { padding: '1rem', borderBottom: '1px solid var(--border)' },
  tr: { transition: 'background 0.2s' },
  statusBadge: { background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' },
  empty: { textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }
};

export default WorkflowAutomation;
