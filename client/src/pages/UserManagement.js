import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const UserManagement = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '', role: 'student', rollNumber: '', branch: '', section: '', year: '' });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, yearFilter, sectionFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      
      const { data } = await api.get(`/admin/users?${params.toString()}`);
      setUsers(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditMode(true);
      setFormData({
        id: userToEdit._id,
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        rollNumber: userToEdit.rollNumber || '',
        branch: userToEdit.branch || '',
        section: userToEdit.section || '',
        year: userToEdit.year || ''
      });
    } else {
      setEditMode(false);
      setFormData({ id: '', name: '', email: '', password: '', role: 'student', rollNumber: '', branch: '', section: '', year: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    if (e.submitter?.blur) e.submitter.blur();
    e.preventDefault();
    try {
      if (editMode) {
        const { data } = await api.put(`/admin/users/${formData.id}`, {
          name: formData.name,
          role: formData.role,
          rollNumber: formData.rollNumber,
          branch: formData.branch,
          section: formData.section,
          year: formData.year
        });
        setUsers(users.map(u => u._id === formData.id ? data.user : u));
        addToast('User updated successfully', 'success');
      } else {
        const { data } = await api.post('/admin/users', formData);
        setUsers([data.user, ...users]);
        addToast('User created successfully', 'success');
      }
      setShowModal(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save user', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (id === user._id) {
      return addToast('You cannot delete your own account', 'error');
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      addToast('User deleted successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/admin/users-template/sample', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user_upload_template_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download sample:', err);
      addToast('Failed to download sample file', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('role', roleFilter || 'student');

    setUploading(true);
    addToast('Uploading users...', 'info');

    try {
      const { data } = await api.post('/auth/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (data.results?.failed > 0) {
        addToast(`${data.results.success} success, ${data.results.failed} failed.`, 'warning');
      } else {
        addToast(data.message, 'success');
      }
      
      fetchUsers();
    } catch (err) {
      console.error('Upload failed:', err);
      addToast(err.response?.data?.error || 'Failed to upload users.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.subtitle}>Manage students, faculty, and administrators.</p>
          </div>
          <div style={styles.actionButtons}>
            <button style={styles.sampleBtn} onClick={handleDownloadSample}>📥 Sample File</button>
            <button style={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? '⌛ Uploading...' : '📁 Bulk Upload'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
            />
            <button style={styles.addBtn} onClick={() => handleOpenModal()}>➕ Add User</button>
          </div>
        </div>

        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            style={styles.searchInput}
          />
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>

          <select 
            value={yearFilter} 
            onChange={e => setYearFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">All Years</option>
            <option value="I">I Year</option>
            <option value="II">II Year</option>
            <option value="III">III Year</option>
            <option value="IV">IV Year</option>
          </select>

          <input
            type="text"
            placeholder="Section (e.g. A)"
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            style={{ ...styles.selectInput, width: '120px' }}
          />
        </div>

        {loading ? (
          <div style={styles.emptyBox}><p>Loading users...</p></div>
        ) : (
          <div style={styles.tableCard}>
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role/Details</th>
                    <th style={styles.th}>Registered</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={styles.emptyRow}>No users found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u._id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                        </td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              ...styles.roleBadge,
                              background: u.role === 'admin' ? 'rgba(220,38,38,0.1)' : u.role === 'teacher' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                              color: u.role === 'admin' ? '#dc2626' : u.role === 'teacher' ? '#3b82f6' : '#10b981'
                            }}>
                              {u.role}
                            </span>
                            {u.role === 'student' && u.rollNumber && (
                              <span style={styles.detailText}>
                                {u.rollNumber} • {u.year || 'N/A'} Yr • {u.branch} {u.section}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <div style={styles.actionRow}>
                            <button style={styles.editBtn} onClick={() => handleOpenModal(u)}>Edit</button>
                            <button 
                              style={u._id === user._id ? styles.delBtnDisabled : styles.delBtn} 
                              onClick={() => handleDelete(u._id)}
                              disabled={u._id === user._id}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="fade-in">
            <div style={styles.modalHeader}>
              <h3>{editMode ? 'Edit User' : 'Add New User'}</h3>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.formSpacing}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input 
                  type="text" 
                  style={styles.input} 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input 
                  type="email" 
                  style={styles.input} 
                  required 
                  disabled={editMode} // Disable email edit for simplicity and safety
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              {!editMode && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Password</label>
                  <input 
                    type="password" 
                    style={styles.input} 
                    required 
                    minLength={8}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select 
                  style={styles.input} 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'student' && (
                <div style={styles.formSpacingShort}>
                  <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Roll Number</label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        value={formData.rollNumber}
                        onChange={e => setFormData({...formData, rollNumber: e.target.value})}
                      />
                    </div>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Year</label>
                      <select 
                        style={styles.input} 
                        value={formData.year}
                        onChange={e => setFormData({...formData, year: e.target.value})}
                      >
                        <option value="">Select Year</option>
                        <option value="I">I Year</option>
                        <option value="II">II Year</option>
                        <option value="III">III Year</option>
                        <option value="IV">IV Year</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Branch</label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        value={formData.branch}
                        onChange={e => setFormData({...formData, branch: e.target.value})}
                      />
                    </div>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Section</label>
                      <input 
                        type="text" 
                        style={styles.input} 
                        value={formData.section}
                        onChange={e => setFormData({...formData, section: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div style={styles.modalFooter}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.9rem' },
  actionButtons: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  addBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  uploadBtn: { background: 'var(--success)', color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  sampleBtn: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  controls: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '250px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' },
  selectInput: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' },
  detailText: { fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 },
  emptyBox: { textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--text-muted)' },
  tableCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' },
  th: { padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.02)', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)' },
  td: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', verticalAlign: 'middle' },
  tr: { transition: 'background-color 0.2s' },
  emptyRow: { padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' },
  roleBadge: { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' },
  actionRow: { display: 'flex', gap: '0.5rem' },
  editBtn: { background: 'transparent', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 },
  delBtn: { background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 },
  delBtnDisabled: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'not-allowed', fontSize: '0.75rem', fontWeight: 600 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)', padding: '1rem' },
  modalContent: { background: 'var(--bg-card)', width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border)', overflow: 'hidden' },
  modalHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' },
  formSpacing: { padding: '1.5rem' },
  formSpacingShort: { marginTop: '1rem' },
  formRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  formGroupHalf: { flex: 1 },
  formGroup: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' },
  input: { width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 1rem', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
  cancelBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
};

export default UserManagement;
