import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Calendar, Users, Eye, Edit, Trash2, Shield } from 'lucide-react';
import api from '../../utils/api';

const ManageExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data } = await api.get('/exam');
      setExams(data.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (id) => {
    try {
      if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
      await api.delete(`/exam/${id}`);
      setExams(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      console.error('Failed to delete exam:', err);
      alert('Failed to delete exam');
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const st = {
    wrap: { padding: '2rem', animation: 'fadeIn 0.4s ease-out' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' },
    actions: { display: 'flex', gap: '1rem' },
    search: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' },
    input: { background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' },
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
    status: (active) => ({ 
      background: active ? 'rgba(52, 211, 153, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
      color: active ? '#059669' : '#64748b', 
      padding: '0.25rem 0.6rem', 
      borderRadius: '999px', 
      fontSize: '0.75rem', 
      fontWeight: 700 
    }),
    meta: { display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }
  };

  return (
    <div style={st.wrap}>
      <header style={st.hdr}>
        <div style={st.title}>
          <FileText size={28} className="text-blue" />
          <span>Manage Exams</span>
        </div>
        <div style={st.actions}>
          <div style={st.search}>
            <Search size={18} className="text-muted" />
            <input 
              style={st.input} 
              placeholder="Search exams..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="primary-btn" onClick={() => navigate('/exam/create')} style={{ borderRadius: '10px', height: '40px', padding: '0 1.25rem' }}>
            <Plus size={18} />
            <span>Create Exam</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading exams...</div>
      ) : filteredExams.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20, padding: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No exams found. Start by creating one!</p>
        </div>
      ) : (
        <div style={st.grid}>
          {filteredExams.map(e => (
            <div key={e._id} style={st.card} className="exam-card-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{e.title}</h3>
                <span style={st.status(e.isPublished)}>{e.isPublished ? 'Published' : 'Draft'}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{e.description || 'No description provided.'}</p>
              
              <div style={st.meta}>
                <div style={st.metaItem} title="Total Submissions"><Users size={14} /> {e.submissionCount || 0} Subm.</div>
                <div style={st.metaItem} title="Average Score"><BarChart3 size={14} /> {e.avgScore || 0}% Avg.</div>
                <div style={st.metaItem} title="Date Created"><Calendar size={14} /> {new Date(e.createdAt).toLocaleDateString()}</div>
              </div>

              <div style={st.footer}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="nav-icon-btn" title="View Results" onClick={() => navigate(`/results/${e._id}`)}><Eye size={16} /></button>
                  <button className="nav-icon-btn" title="Edit" onClick={() => navigate(`/exam/${e._id}/edit`)}><Edit size={16} /></button>
                </div>
                <button 
                  className="nav-icon-btn" 
                  title="Delete" 
                  style={{ color: 'var(--danger)' }}
                  onClick={() => deleteExam(e._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageExams;
