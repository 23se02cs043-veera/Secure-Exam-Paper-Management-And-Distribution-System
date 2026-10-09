import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { FaSun, FaMoon, FaArrowLeft, FaFilePdf, FaLock, FaClock, FaHistory, FaQrcode, FaExclamationCircle } from 'react-icons/fa';

function Features() {
  const { isDark, toggleTheme } = useTheme();

  const featList = [
    { icon: <FaLock />, title: 'Military-Grade Encryption', desc: 'Secure encryption using AES-256-GCM and ChaCha20-Poly1305 with distinct random keys for every file.' },
    { icon: <FaFilePdf />, title: 'Anti-Leak Watermarks', desc: 'Merges student names, IP addresses, emails, and timestamp details diagonally and into the footer of PDF copies.' },
    { icon: <FaClock />, title: 'APScheduler Engine', desc: 'Automatic background releases and automated lockouts upon expiry time reached.' },
    { icon: <FaHistory />, title: 'Immutable Audit Trail', desc: 'Tracks every view, download, login attempt, or panic lock in secure log sheets.' },
    { icon: <FaExclamationCircle />, title: 'Panic Lockdown Banner', desc: 'One-click emergency lock stops all paper downloads and views instantly.' },
    { icon: <FaQrcode />, title: 'Integrity QR Codes', desc: 'Embeds QR codes into release pages for quick document validity confirmations.' },
  ];

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
        <div className="container fade-in">
          <h2 className="text-center" style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '40px', color: isDark ? '#ffffff' : '#0f172a' }}>
            System Features
          </h2>
          <div className="grid grid-3 features-grid" style={{ gap: '30px' }}>
            {featList.map((item, idx) => (
              <div key={idx} className="card-glass p-6 hover-lift" style={{
                background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
                boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)'
              }}>
                <div style={{ fontSize: '2.2rem', color: '#2563eb', marginBottom: '15px' }}>{item.icon}</div>
                <h4 style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 700, fontSize: '18px', marginBottom: '10px' }}>{item.title}</h4>
                <p style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '14px', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
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

export default Features;
