import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Search, Check, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../../utils/api';

const ExamStudents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/exam/${id}/enrollment`);
      setStudents(data.students || []);
      setIsRestricted(!data.isRestrictedOpenToAll);
      
      const enrolled = new Set();
      (data.students || []).forEach(s => {
        if (s.isEnrolled && !data.isRestrictedOpenToAll) enrolled.add(s._id);
        else if (data.isRestrictedOpenToAll) enrolled.add(s._id);
      });
      setSelectedIds(enrolled);
    } catch (err) {
      setError('Failed to load student data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectBatch = (currentFiltered) => {
    const newSelected = new Set(selectedIds);
    const allSelected = currentFiltered.length > 0 && currentFiltered.every(s => newSelected.has(s._id));
    
    currentFiltered.forEach(s => {
      if (allSelected) {
        newSelected.delete(s._id);
      } else {
        newSelected.add(s._id);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleSaveEnrollment = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/exam/${id}/enroll`, { studentIds: Array.from(selectedIds) });
      await fetchData(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update enrollment');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenToAll = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/exam/${id}/enroll`, { studentIds: [] }); 
      await fetchData();
    } catch (err) {
      setError('Failed to update. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const branches = [...new Set(students.map(s => s.branch).filter(Boolean))];
  const sections = [...new Set(students.map(s => s.section).filter(Boolean))];
  const statuses = ['Pending', 'In Progress', 'Attempted', 'Missed'];

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter ? s.branch === branchFilter : true;
    const matchesSection = sectionFilter ? s.section === sectionFilter : true;
    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    
    return matchesSearch && matchesBranch && matchesSection && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Attempted': return 'var(--success)';
      case 'In Progress': return 'var(--accent)';
      case 'Missed': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  const st = {
    wrap: { minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' },
    inner: { maxWidth: 1200, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' },
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' },
    btnBack: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
    btnDanger: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
    filtersRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
    filterInput: { flex: '1 1 200px', padding: '0.6rem 1rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-primary)' },
    checkbox: { width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' },
    statusBadge: (status) => ({ display: 'inline-block', padding: '0.2rem 0.6rem', background: `${getStatusColor(status)}20`, color: getStatusColor(status), borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 })
  };

  if (loading) return <div style={{...st.wrap, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>Loading data...</div>;

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s._id));

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <div style={st.header}>
          <div style={st.title}>
            <Users size={24} color="var(--accent)" /> Manage Exam Students
          </div>
          <button onClick={() => navigate('/dashboard')} style={st.btnBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>

        {error && <div style={{ background: 'var(--danger-glow)', color: 'var(--danger)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' }}>{error}</div>}

        <div style={st.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enrollment & Batches</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isRestricted 
                  ? `Currently restricted. ${selectedIds.size} students enrolled.` 
                  : "Currently Open To All Students. To restrict access, select specific students/batches and save."}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {isRestricted && (
                <button onClick={handleOpenToAll} style={st.btnDanger} disabled={saving}>
                  <AlertCircle size={16} /> Open To All
                </button>
              )}
              <button onClick={handleSaveEnrollment} style={st.btnPrimary} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Selected'}
              </button>
            </div>
          </div>

          <div style={st.filtersRow}>
            <div style={{ position: 'relative', flex: '2 1 300px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search name, roll num, email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...st.filterInput, paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>
            
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={st.filterInput}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={st.filterInput}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={st.filterInput}>
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={st.th}>
                    <input 
                      type="checkbox" 
                      style={st.checkbox} 
                      checked={isAllSelected}
                      onChange={() => handleSelectBatch(filteredStudents)}
                      title="Select/Deselect All Filtered"
                    />
                  </th>
                  <th style={st.th}>Student Setup (Roll - Name)</th>
                  <th style={st.th}>Batch (Branch / Sec)</th>
                  <th style={st.th}>Status</th>
                  <th style={st.th}>Enrolled?</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id}>
                    <td style={st.td}>
                      <input 
                        type="checkbox" 
                        style={st.checkbox}
                        checked={selectedIds.has(student._id)}
                        onChange={() => handleToggleStudent(student._id)}
                      />
                    </td>
                    <td style={st.td}>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{student.rollNumber || 'N/A'} - {student.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</div>
                    </td>
                    <td style={st.td}>
                      {student.branch || '--'} / {student.section || '--'}
                    </td>
                    <td style={st.td}>
                      <span style={st.statusBadge(student.status)}>{student.status}</span>
                    </td>
                    <td style={st.td}>
                      {student.isEnrolled 
                        ? <span style={{ color: 'var(--success)' }}><Check size={16} /></span>
                        : <span style={{ color: 'var(--text-muted)' }}>-</span>
                      }
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No students found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamStudents;
