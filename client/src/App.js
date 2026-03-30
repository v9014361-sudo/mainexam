import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { FullPageLoader } from './components/LoadingSpinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExamPreview from './pages/ExamPreview';
import ExamTake from './pages/ExamTake';
import CreateExam from './pages/CreateExam';
import Results from './pages/Results';
import MyResults from './pages/MyResults';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import AdminDashboard from './pages/AdminDashboard';
import LiveMonitor from './pages/Admin/LiveMonitor';
import AuditLogs from './pages/Admin/AuditLogs';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageExams from './pages/Admin/ManageExams';
import Settings from './pages/Admin/Settings';
import WorkflowAutomation from './pages/WorkflowAutomation';
import ExamStudents from './pages/Admin/ExamStudents';
import ViolationDetails from './pages/ViolationDetails';

const ResultsListFallback = () => (
  <div style={{ padding: '2rem' }}>
    <h2>Exam Results</h2>
    <p className="text-muted">Select an exam from the dashboard or sidebar to view its detailed results.</p>
  </div>
);
import './styles/globals.css';

const isMobileDevice = () => {
  const ua = navigator.userAgent || '';
  const hasDesktopOS = /Windows NT|Macintosh|X11|Linux x86_64/i.test(ua);
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Mobile/i.test(ua);
  const touchOnlyDevice = window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = window.innerWidth <= 768;
  return !hasDesktopOS && (mobileUA || (touchOnlyDevice && narrowViewport));
};

const MobileBlockedScreen = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      background:
        'radial-gradient(circle at 20% 10%, rgba(37,99,235,0.18), transparent 36%), radial-gradient(circle at 80% 90%, rgba(14,165,233,0.2), transparent 32%), linear-gradient(160deg, #eff6ff 0%, #f8fafc 55%, #f1f5f9 100%)',
    }}
  >
    <div
      className="fade-in"
      style={{
        maxWidth: '620px',
        width: '100%',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.35)',
        borderRadius: '18px',
        padding: '1.75rem',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(15,23,42,0.12)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(37,99,235,0.12)',
            color: 'var(--accent)',
            fontWeight: 700,
          }}
        >
          <span>🔒</span>
          <span>SecureExam</span>
        </div>
      </div>

      <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: '0.85rem', animation: 'floaty 2.6s ease-in-out infinite' }}>🖥️</div>

      <h1 style={{ fontSize: '1.7rem', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
        Unable to Open on Mobile
      </h1>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 1rem' }}>
        Please access the examination portal using a Desktop or Laptop for security reasons.
      </p>
      <div
        style={{
          display: 'inline-flex',
          gap: '0.5rem',
          alignItems: 'center',
          padding: '0.5rem 0.9rem',
          borderRadius: '10px',
          background: 'rgba(37,99,235,0.08)',
          color: 'var(--accent)',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <span>ℹ️</span>
        <span>Device verification active</span>
      </div>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader text="Authenticating..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  if (user?.role === 'student' && isMobileDevice()) return <MobileBlockedScreen />;
  return children;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Redirector to handle role-based dashboard landing
const AuthRedirector = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader text="Verifying session..." />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Dashboard />;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

              {/* Shared Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/monitor" element={
                <ProtectedRoute roles={['admin']}><LiveMonitor /></ProtectedRoute>
              } />
              <Route path="/admin/audit" element={
                <ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>
              } />
              <Route path="/admin/students" element={
                <ProtectedRoute roles={['admin']}><ManageUsers role="student" /></ProtectedRoute>
              } />
              <Route path="/admin/faculty" element={
                <ProtectedRoute roles={['admin']}><ManageUsers role="teacher" /></ProtectedRoute>
              } />
              <Route path="/admin/results" element={
                <ProtectedRoute roles={['admin']}><ResultsListFallback /></ProtectedRoute>
              } />
               <Route path="/admin/exams" element={
                <ProtectedRoute roles={['admin', 'teacher']}><ManageExams /></ProtectedRoute>
              } />
              <Route path="/exam/:id/students" element={
                <ProtectedRoute roles={['admin', 'teacher']}><ExamStudents /></ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />

              {/* Student Routes */}
              <Route path="/exam/:id/preview" element={
                <ProtectedRoute roles={['student']}><ExamPreview /></ProtectedRoute>
              } />
              <Route path="/exam/:id/take" element={
                <ProtectedRoute roles={['student']}><ExamTake /></ProtectedRoute>
              } />
              <Route path="/my-results" element={
                <ProtectedRoute roles={['student']}><MyResults /></ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>
              } />
              <Route path="/admin/automation" element={
                <ProtectedRoute roles={['admin']}><WorkflowAutomation /></ProtectedRoute>
              } />
              {/* Teacher Routes */}
              <Route path="/exam/create" element={
                <ProtectedRoute roles={['teacher']}><CreateExam /></ProtectedRoute>
              } />
              <Route path="/exam/:id/edit" element={
                <ProtectedRoute roles={['teacher']}><CreateExam /></ProtectedRoute>
              } />
              <Route path="/results/:id" element={
                <ProtectedRoute roles={['teacher', 'admin']}><Results /></ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute roles={['teacher', 'admin']}><Analytics /></ProtectedRoute>
              } />
              <Route path="/violations/:sessionId" element={
                <ProtectedRoute roles={['teacher', 'admin']}><ViolationDetails /></ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={
                <div style={{
                  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)',
                }}>
                  <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-muted)' }}>404</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Page not found</p>
                  <a href="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                    ← Back to Dashboard
                  </a>
                </div>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
