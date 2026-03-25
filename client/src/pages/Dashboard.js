import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    const fetchExams = async () => {
      try {
        const endpoint = user.role === 'teacher' ? '/exam/my-exams' : '/exam/available';
        const { data } = await api.get(endpoint);
        setExams(data.exams);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchExams();
  }, [user]);

  const togglePublish = async (id) => {
    try {
      const { data } = await api.patch(`/exam/${id}/publish`);
      setExams(prev => prev.map(e => e._id === id ? { ...e, isPublished: data.exam.isPublished } : e));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExam = async (id) => {
    try {
      const confirmDelete = window.confirm('Delete this exam? This will also remove related exam attempts.');
      if (!confirmDelete) return;
      await api.delete(`/exam/${id}`);
      setExams(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      console.error(err);
      window.alert(err.response?.data?.error || 'Failed to delete exam');
    }
  };

  const filteredExams = exams.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const hasControlPanel = isTeacher || isAdmin;
  const teacherDesktop = hasControlPanel && !isMobile;

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={{ ...styles.main, ...(isMobile ? styles.mainMobile : {}) }}>
        <div style={teacherDesktop ? styles.teacherShell : undefined}>
          {teacherDesktop && (
            <aside style={styles.teacherSidebar} className="slide-in">
              <h4 style={styles.sideHead}>{isAdmin ? 'Admin Panel' : 'Teacher Panel'}</h4>
              <button style={styles.sideBtnActive} onClick={() => navigate('/dashboard')}>📋 Dashboard</button>
              {isAdmin && <button style={styles.sideBtn} onClick={() => navigate('/admin/users')}>👥 User Management</button>}
              <button style={styles.sideBtn} onClick={() => navigate('/exam/create')}>➕ Create Exam</button>
              <button style={styles.sideBtn} onClick={() => navigate('/analytics')}>📊 Analytics</button>
              <button style={styles.sideBtn} onClick={() => navigate('/profile')}>👤 Profile</button>
            </aside>
          )}

          <section style={teacherDesktop ? styles.teacherMain : undefined}>
            <div style={{ ...styles.banner, ...(isMobile ? styles.bannerMobile : {}) }}>
              <div>
                <h2 style={{ ...styles.bannerTitle, ...(isMobile ? styles.bannerTitleMobile : {}) }}>
                  {isTeacher ? 'Exam Management' : isAdmin ? 'Admin Control Center' : 'Available Exams'}
                </h2>
                <p style={styles.bannerSub}>
                  {isAdmin ? 'Welcome Admin' : isTeacher ? 'Welcome Teacher' : 'Welcome Student'} • {isTeacher || isAdmin
                    ? `You have ${exams.length} exam${exams.length !== 1 ? 's' : ''} created.`
                    : `${exams.length} exam${exams.length !== 1 ? 's' : ''} available to take.`}
                </p>
              </div>
              <div style={{ ...styles.bannerActions, ...(isMobile ? styles.bannerActionsMobile : {}) }}>
                <input
                  type="text"
                  placeholder="Search exams..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...styles.searchInput, ...(isMobile ? styles.searchInputMobile : {}) }}
                />
                {user?.role === 'teacher' && (
                  <button onClick={() => navigate('/exam/create')} style={{ ...styles.createBtn, ...(isMobile ? styles.createBtnMobile : {}) }}>
                    + Create Exam
                  </button>
                )}
              </div>
            </div>

            {isTeacher && isMobile && (
              <div style={styles.teacherMobilePanel} className="fade-in">
                <h4 style={styles.teacherMobileTitle}>Teacher Panel</h4>
                <div style={styles.teacherMobileGrid}>
                  <button style={styles.teacherMobileBtnActive} onClick={() => navigate('/dashboard')}>Dashboard</button>
                  <button style={styles.teacherMobileBtn} onClick={() => navigate('/exam/create')}>Create Exam</button>
                  <button style={styles.teacherMobileBtn} onClick={() => navigate('/analytics')}>Analytics</button>
                  <button style={styles.teacherMobileBtn} onClick={() => navigate('/profile')}>Profile</button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={styles.emptyBox}>
                <div style={styles.loadingDot} />
                <p>Loading exams...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>{search ? 'Search' : 'Exam'}</div>
                <p style={styles.emptyText}>
                  {search
                    ? `No exams matching "${search}"`
                    : user?.role === 'teacher'
                      ? 'No exams created yet. Click "Create Exam" to get started!'
                      : 'No exams available at the moment.'}
                </p>
              </div>
            ) : (
              <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
            {filteredExams.map((exam) => {
              const attemptCount = exam.attemptCount || 0;
              const maxAttempts = exam.settings?.maxAttempts || 1;
              const hasAttempted = !!exam.hasAttempted;
              const attemptsExhausted = attemptCount >= maxAttempts;
              const examDate = exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : 'N/A';

              return (
                <div key={exam._id} style={{ ...styles.examCard, ...(isMobile ? styles.examCardMobile : {}) }} className="fade-in exam-card-lift">
                  {user?.role === 'teacher' && (
                    <div
                      style={{
                        ...styles.statusDot,
                        background: exam.isPublished ? 'var(--success)' : 'var(--text-muted)',
                      }}
                      title={exam.isPublished ? 'Published' : 'Draft'}
                    />
                  )}

                  <div style={{ ...styles.cardTop, ...(isMobile ? styles.cardTopMobile : {}) }}>
                    <h3 style={{ ...styles.examTitle, ...(isMobile ? styles.examTitleMobile : {}) }}>{exam.title}</h3>
                    {exam.settings?.requireFullscreen && <span style={styles.secureBadge}>Proctored</span>}
                  </div>

                  <p style={styles.examDesc}>
                    {exam.description ? (exam.description.length > 100 ? `${exam.description.slice(0, 100)}...` : exam.description) : 'No description'}
                  </p>

                  <div style={{ ...styles.metaRow, ...(isMobile ? styles.metaRowMobile : {}) }}>
                    <span style={styles.meta}>{examDate}</span>
                    <span style={styles.meta}>{exam.duration} min</span>
                    <span style={styles.meta}>{exam.questions?.length || '?'} Q</span>
                    <span style={styles.meta}>{exam.passingScore || 40}%</span>
                  </div>

                  <div style={styles.tagRow}>
                    {exam.settings?.encryptQuestions && <span style={{ ...styles.tag, ...(isMobile ? styles.tagMobile : {}) }}>E2E Encrypted</span>}
                    {exam.settings?.detectTabSwitch && <span style={{ ...styles.tag, ...(isMobile ? styles.tagMobile : {}) }}>Tab Detection</span>}
                    {exam.settings?.blockExternalApps && <span style={{ ...styles.tag, ...(isMobile ? styles.tagMobile : {}) }}>App Blocking</span>}
                    {exam.settings?.autoSubmitOnViolation && <span style={{ ...styles.tag, ...(isMobile ? styles.tagMobile : {}) }}>Auto-Terminate</span>}
                  </div>

                  {user?.role === 'teacher' && !exam.isPublished && (
                    <div style={styles.draftBanner}>DRAFT - Not visible to students</div>
                  )}

                  {user?.role === 'student' && hasAttempted && (
                    <div style={styles.attemptedBanner}>Already Attempted ({attemptCount}/{maxAttempts})</div>
                  )}

                  <div style={{
                    ...styles.cardActions,
                    ...(isMobile ? styles.cardActionsMobile : {}),
                    ...(isMobile && isTeacher ? styles.cardActionsTeacherMobile : {}),
                  }}>
                    {user?.role === 'student' ? (
                      <>
                        <button onClick={() => navigate(`/exam/${exam._id}/preview`)} style={{ ...styles.previewBtn, ...(isMobile ? styles.actionBtnMobile : {}) }}>Details</button>
                        <button
                          onClick={() => navigate(`/exam/${exam._id}/take`)}
                          style={{
                            ...(attemptsExhausted ? styles.takeBtnDisabled : styles.takeBtn),
                            ...(isMobile ? styles.actionBtnMobile : {}),
                          }}
                          disabled={attemptsExhausted}
                        >
                          {attemptsExhausted ? 'Already Attempted' : hasAttempted ? 'Retake Exam ->' : 'Start Exam ->'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => navigate(`/exam/${exam._id}/edit`)} style={{ ...styles.editBtn, ...(isMobile ? styles.actionBtnMobile : {}) }}>Edit</button>
                        <button onClick={() => togglePublish(exam._id)} style={{ ...(exam.isPublished ? styles.unpubBtn : styles.pubBtn), ...(isMobile ? styles.actionBtnMobile : {}) }}>
                          {exam.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => navigate(`/results/${exam._id}`)} style={{ ...styles.viewBtn, ...(isMobile ? styles.actionBtnMobile : {}) }}>Results</button>
                        <button onClick={() => deleteExam(exam._id)} style={{ ...styles.deleteBtn, ...(isMobile ? styles.actionBtnMobile : {}) }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem 3rem' },
  mainMobile: { padding: '0.85rem 0.85rem 1.5rem' },
  teacherShell: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', alignItems: 'start' },
  teacherSidebar: {
    position: 'sticky',
    top: 78,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '0.9rem',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  sideHead: { fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.35rem' },
  sideBtn: {
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    padding: '0.56rem 0.65rem',
    borderRadius: 10,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '0.84rem',
  },
  sideBtnActive: {
    border: '1px solid rgba(37,99,235,0.3)',
    background: 'var(--accent-glow)',
    color: 'var(--accent)',
    padding: '0.56rem 0.65rem',
    borderRadius: 10,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '0.84rem',
  },
  teacherMain: { minWidth: 0 },
  teacherMobilePanel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '0.8rem',
    marginBottom: '0.85rem',
    boxShadow: 'var(--shadow)',
  },
  teacherMobileTitle: {
    fontSize: '0.74rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--text-muted)',
    marginBottom: '0.55rem',
  },
  teacherMobileGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.45rem',
  },
  teacherMobileBtn: {
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    padding: '0.55rem 0.6rem',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  teacherMobileBtnActive: {
    border: '1px solid rgba(37,99,235,0.3)',
    background: 'var(--accent-glow)',
    color: 'var(--accent)',
    padding: '0.55rem 0.6rem',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  banner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  bannerMobile: { alignItems: 'stretch', marginBottom: '1rem', gap: '0.75rem' },
  bannerTitle: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  bannerTitleMobile: { fontSize: '1.25rem', lineHeight: 1.2 },
  bannerSub: { color: 'var(--text-secondary)', fontSize: '0.85rem' },
  bannerActions: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  bannerActionsMobile: { width: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' },
  searchInput: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-display)', width: '220px', outline: 'none' },
  searchInputMobile: { width: '100%', fontSize: '0.9rem', padding: '0.7rem 0.85rem' },
  createBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', fontSize: '0.85rem' },
  createBtnMobile: { width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem' },
  emptyBox: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4rem 2rem', textAlign: 'center' },
  loadingDot: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    margin: '0 auto 0.85rem',
    animation: 'spin 0.8s linear infinite',
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  emptyText: { color: 'var(--text-secondary)', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' },
  gridMobile: { gridTemplateColumns: '1fr', gap: '0.85rem' },
  examCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden' },
  examCardMobile: { padding: '1rem', borderRadius: '12px', boxShadow: '0 6px 18px rgba(2, 6, 23, 0.08)' },
  statusDot: { position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' },
  cardTopMobile: { gap: '0.35rem', marginBottom: '0.35rem' },
  examTitle: { fontSize: '1.1rem', fontWeight: 600, flex: 1 },
  examTitleMobile: { fontSize: '1.2rem', fontWeight: 700 },
  secureBadge: { fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', whiteSpace: 'nowrap', fontWeight: 600 },
  examDesc: { color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 },
  metaRow: { display: 'flex', gap: '1rem', marginBottom: '0.6rem' },
  metaRowMobile: { gap: '0.75rem', marginBottom: '0.7rem' },
  meta: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  tagRow: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' },
  tagMobile: { fontSize: '0.62rem', padding: '0.2rem 0.45rem' },
  tag: { fontSize: '0.6rem', padding: '0.15rem 0.45rem', borderRadius: '20px', background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
  draftBanner: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--warning)', fontSize: '0.7rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', textAlign: 'center' },
  attemptedBanner: { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', textAlign: 'center' },
  cardActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  cardActionsMobile: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  cardActionsTeacherMobile: { gridTemplateColumns: '1fr 1fr' },
  actionBtnMobile: { width: '100%', padding: '0.65rem 0.7rem', fontSize: '0.82rem', textAlign: 'center' },
  previewBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem' },
  takeBtn: { flex: 1, background: 'var(--accent)', color: 'white', border: 'none', padding: '0.55rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.85rem' },
  takeBtnDisabled: { flex: 1, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.55rem', borderRadius: 'var(--radius-sm)', cursor: 'not-allowed', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.85rem' },
  editBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem' },
  pubBtn: { flex: 1, background: 'var(--success)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 500 },
  unpubBtn: { flex: 1, background: 'transparent', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem' },
  viewBtn: { background: 'transparent', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem' },
  deleteBtn: { background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem' },
};

export default Dashboard;

