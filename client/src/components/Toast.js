import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={styles.container}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...styles[t.type],
            }}
            className="fade-in"
            onClick={() => removeToast(t.id)}
          >
            <span style={styles.icon}>
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'warning' && '⚠'}
              {t.type === 'info' && 'ℹ'}
            </span>
            <span style={styles.message}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const styles = {
  container: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxWidth: '400px',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-display)',
    animation: 'fadeIn 0.2s ease-out',
  },
  icon: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  message: { flex: 1, lineHeight: 1.4 },
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6ee7b7',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#fcd34d',
  },
  info: {
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#93c5fd',
  },
};
