import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-hero)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
      <FaExclamationTriangle style={{ fontSize: '4.5rem', color: 'var(--color-accent)', marginBottom: '20px' }} className="float" />
      <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>404 - Page Not Found</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '500px', marginTop: '10px', fontSize: '1.1rem' }}>
        The page you are trying to access does not exist or has been moved. Check the URL and try again.
      </p>
      <Link to="/" className="btn btn-accent btn-lg" style={{ marginTop: '30px' }}>
        Return to Portal
      </Link>
    </div>
  );
}

export default NotFound;
