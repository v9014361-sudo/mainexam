import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.text}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              style={styles.button}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '2rem',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '3rem',
    textAlign: 'center',
    maxWidth: '450px',
  },
  icon: { fontSize: '3rem', marginBottom: '1rem' },
  title: { fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' },
  text: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 },
  button: {
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    padding: '0.7rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
  },
};

export default ErrorBoundary;
