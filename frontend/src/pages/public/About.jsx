import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { FaSun, FaMoon, FaArrowLeft } from 'react-icons/fa';

function About() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)',
      color: isDark ? '#f8fafc' : '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Background Image Overlay (Matching Home Page) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/images/home_bg.png)',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        opacity: isDark ? 0.55 : 0.65,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Public Header */}
      <header className="navbar-public" style={{
        position: 'relative',
        zIndex: 1,
        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        backdropFilter: 'blur(12px)'
      }}>
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon" style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #059669 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
          }}>SE</div>
          <span className="navbar-brand-text" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            Secure<span className="navbar-brand-accent" style={{ color: '#2563eb', fontWeight: 800 }}>Exam</span>
          </span>
        </Link>
        <div className="navbar-actions">
          <Link to="/" className="navbar-nav-link" style={{ fontWeight: 600, color: isDark ? '#cbd5e1' : '#1e293b' }}>
            <FaArrowLeft style={{ marginRight: '6px' }} /> Back Home
          </Link>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '100px 20px 60px' }}>
        <div className="container fade-in" style={{ maxWidth: '850px' }}>
          <h2 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '24px', color: isDark ? '#ffffff' : '#0f172a' }}>
            About the SecureExam Platform
          </h2>
          <div className="card-glass p-8" style={{
            background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            borderRadius: '20px',
            fontSize: '1.05rem',
            lineHeight: '1.8',
            color: isDark ? '#e2e8f0' : '#334155'
          }}>
            <p>
              The <strong>Secure Question Paper Distribution & Management System</strong> is designed to mitigate unauthorized access, transportation leakages, and security risks in academic and institutional management.
            </p>
            <p style={{ marginTop: '20px' }}>
              Built as a robust SaaS platform, the system implements a strict multi-role flow:
            </p>
            <ul style={{ paddingLeft: '24px', marginTop: '10px' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Teaching Staff:</strong> Upload papers securely with instant AES-256-GCM / ChaCha20 encryption.</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Exam Coordinators:</strong> Schedule automated countdown releases and authorize manual lockdowns.</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Students:</strong> Access examinations dynamically during authorized windows with dynamic watermarking.</li>
            </ul>
            <p style={{ marginTop: '20px' }}>
              All interactions are permanently stored in an immutable audit log, ensuring complete transparency and compliance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '30px',
        textAlign: 'center',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        fontSize: '13px',
        color: isDark ? '#cbd5e1' : '#475569',
        fontWeight: 500
      }}>
        © {new Date().getFullYear()} SecureExam System. All rights reserved. University Examination Cell.
      </footer>
    </div>
  );
}

export default About;
