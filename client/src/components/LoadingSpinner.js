import React from 'react';

const LoadingSpinner = ({ size = 40, text = 'Loading...' }) => {
  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.spinner,
          width: size,
          height: size,
          borderWidth: Math.max(2, size / 10),
        }}
      />
      {text && <p style={styles.text}>{text}</p>}
    </div>
  );
};

const FullPageLoader = ({ text = 'Loading...' }) => (
  <div style={styles.fullPage}>
    <LoadingSpinner size={48} text={text} />
  </div>
);

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '2rem',
  },
  spinner: {
    borderRadius: '50%',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  fullPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
};

export { LoadingSpinner, FullPageLoader };
export default LoadingSpinner;
