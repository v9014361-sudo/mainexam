import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, UserPlus, Search, Mail, Shield, Trash2, Edit, FileUp, Download, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ManageUsers = ({ role }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNumber: '',
    branch: '',
    section: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    try {
      // Assuming we have an endpoint for this, or we can filter in the backend
      const { data } = await api.get(`/auth/users?role=${role}`);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDownloadSample = () => {
    const headers = ['Roll Number', 'Name', 'Email', 'Password', 'Branch', 'Section', 'Role'];
    const sampleData = [
      ['21XX1A0501', 'John Doe', 'john@example.com', 'Student@123', 'CSE', 'A', 'student'],
      ['T001', 'Jane Smith', 'jane.prof@example.com', 'SecurePass!456', 'ECE', 'B', 'teacher']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${role}_sample_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('role', role);

    setUploading(true);
    const toastId = toast.loading('Uploading users...');

    try {
      const { data } = await api.post('/auth/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (data.results?.failed > 0) {
        toast.success(`${data.results.success} success, ${data.results.failed} failed.`, { id: toastId, duration: 6000 });
        console.warn('Bulk upload errors:', data.results.errors);
      } else {
        toast.success(data.message, { id: toastId, duration: 5000 });
      }
      
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.error || 'Failed to upload users.', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Creating user...');
    try {
      await api.post('/auth/users', { ...formData, role });
      toast.success('User created successfully', { id: toastId });
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', rollNumber: '', branch: '', section: '' });
      fetchUsers();
    } catch (err) {
      console.error('Add user failed:', err);
      const errorMsg = err.response?.data?.error || (err.response?.data?.errors ? err.response.data.errors[0].msg : 'Failed to create user');
      toast.error(errorMsg, { id: toastId });
    }
  };

  const st = {
    wrap: { padding: '2rem', animation: 'fadeIn 0.4s ease-out' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' },
    actions: { display: 'flex', gap: '1rem' },
    search: { 
      background: 'var(--bg-card)', 
      border: '1px solid var(--border)', 
      borderRadius: '10px', 
      padding: '0.5rem 1rem', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      width: '300px'
    },
    input: { background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
    card: { 
      background: 'var(--bg-card)', 
      border: '1px solid var(--border)', 
      borderRadius: '16px', 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
    },
    avatar: { width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' },
    uInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
    uDetails: { display: 'flex', flexDirection: 'column' },
    uName: { fontWeight: 600, fontSize: '1rem' },
    uEmail: { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' },
    stats: { display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' },
    stat: { flex: 1, textAlign: 'center' },
    statVal: { fontWeight: 700, fontSize: '1rem' },
    statLbl: { fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }
  };

  return (
    <div style={st.wrap}>
      <header style={st.hdr}>
        <div style={st.title}>
          {role === 'student' ? <Users size={28} className="text-blue" /> : <Shield size={28} className="text-purple" />}
          <span>Manage {role === 'student' ? 'Students' : 'Faculty'}</span>
        </div>
        <div style={st.actions}>
          <div style={st.search}>
            <Search size={18} className="text-muted" />
            <input 
              style={st.input} 
              placeholder={`Search ${role}s...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="secondary-btn" 
            style={{ borderRadius: '10px', height: '40px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleDownloadSample}
          >
            <Download size={18} />
            <span>Sample File</span>
          </button>
          <button 
            className="secondary-btn" 
            style={{ borderRadius: '10px', height: '40px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <FileUp size={18} />
            <span>Upload Excel</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            style={{ display: 'none' }} 
          />
          <button 
            className="primary-btn" 
            style={{ borderRadius: '10px', height: '40px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={18} />
            <span>Add {role === 'student' ? 'Student' : 'Faculty'}</span>
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading records...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 20, padding: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No {role}s found matching your search.</p>
        </div>
      ) : (
        <div style={st.grid}>
          {filteredUsers.map(u => (
            <div key={u._id} style={st.card} className="exam-card-lift">
              <div style={st.uInfo}>
                <div style={st.avatar}>{u.name.charAt(0)}</div>
                <div style={st.uDetails}>
                  <div style={st.uName}>{u.name}</div>
                  <div style={st.uEmail}><Mail size={12} /> {u.email}</div>
                  {u.role === 'student' && u.rollNumber && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: '2px' }}>
                      {u.rollNumber} • {u.branch} {u.section}
                    </div>
                  )}
                </div>
              </div>
              <div style={st.stats}>
                <div style={st.stat}>
                  <div style={st.statVal}>{u.stats?.count || 0}</div>
                  <div style={st.statLbl}>{role === 'student' ? 'Exams Taken' : 'Exams Created'}</div>
                </div>
                <div style={st.stat}>
                  <div style={{ ...st.statVal, color: 'var(--success)' }}>
                    {u.role === 'student' ? `${u.stats?.avg || 0}%` : (u.stats?.rating || '9.0')}
                  </div>
                  <div style={st.statLbl}>{role === 'student' ? 'Avg Score' : 'Rating'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto' }}>
                <button className="nav-icon-btn" title="Edit"><Edit size={16} /></button>
                <button className="nav-icon-btn" title="Delete" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', zIndex: 1100
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '2rem', borderRadius: '20px', width: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'fadeIn 0.3s ease-out'
          }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus className="text-accent" />
              Add New {role === 'student' ? 'Student' : 'Faculty'}
            </h2>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</label>
                  <input
                    required
                    style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem' }}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
                  <input
                    required
                    type="email"
                    style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem' }}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
                  <input
                    required
                    type="password"
                    style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem', width: '100%' }}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role</label>
                  <select
                    style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem', width: '100%', height: '38px' }}
                    value={formData.role || role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {(formData.role === 'student' || (!formData.role && role === 'student')) && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Roll Number</label>
                    <input
                      style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem' }}
                      value={formData.rollNumber}
                      onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Branch</label>
                      <input
                        style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem' }}
                        value={formData.branch}
                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Section</label>
                      <input
                        style={{ ...st.input, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem' }}
                        value={formData.section}
                        onChange={e => setFormData({ ...formData, section: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ flex: 1, padding: '0.75rem' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ flex: 2, padding: '0.75rem' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
