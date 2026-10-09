import React from 'react';

function LoadingSpinner({ fullscreen = false, size = 'md', text = 'Loading...' }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';

  if (fullscreen) {
    return (
      <div className="loading-overlay">
        <div className="text-center">
          <div className={`spinner ${sizeClass}`} style={{ margin: '0 auto var(--sp-4)' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--fs-sm)' }}>{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ padding: 'var(--sp-8)' }}>
      <div className="text-center">
        <div className={`spinner ${sizeClass}`} style={{ margin: '0 auto var(--sp-3)' }} />
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
