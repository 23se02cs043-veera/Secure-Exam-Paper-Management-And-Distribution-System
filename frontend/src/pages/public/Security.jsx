import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { FaSun, FaMoon, FaArrowLeft, FaUserShield, FaKey, FaShieldAlt } from 'react-icons/fa';

function Security() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-hero)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <header className="navbar-public">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">SE</div>
          <span className="navbar-brand-text">Secure<span className="navbar-brand-accent">Exam</span></span>
        </Link>
        <div className="navbar-actions">
          <Link to="/" className="navbar-nav-link"><FaArrowLeft /> Back Home</Link>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '120px 20px 60px' }}>
        <div className="container fade-in" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '20px', color: 'var(--color-accent)' }}>
            Security Compliance & Protocol
          </h2>
          <div className="card-glass p-8" style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
            <p>
              We implement comprehensive physical, software, and transport controls to secure intellectual properties and question documents.
            </p>
            <h4 style={{ color: 'white', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaKey className="text-accent" /> Cryptographic Algorithms
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              All exam papers are stored as encrypted blobs inside private server spaces. Key generation is cryptographically random and stored strictly in a protected database. Support is available for AES-256-GCM, AES-256-CBC, and ChaCha20-Poly1305.
            </p>
            <h4 style={{ color: 'white', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaShieldAlt className="text-accent" /> Tampering Prevention
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              A unique SHA-256 integrity digest is calculated for every document immediately upon upload. Background check-ups poll document hash matches to alert administrators instantly of database tampering.
            </p>
            <h4 style={{ color: 'white', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaUserShield className="text-accent" /> User Verification
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              We enforce strong password patterns, lockout timers (30-minute block on 5 failed trials), and browser JWT token blacklisting to secure credentials.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Security;
