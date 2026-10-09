import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { FaSun, FaMoon, FaLock, FaShieldAlt, FaClock } from 'react-icons/fa';

function Home() {
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
      {/* Bright Soft Background Image Overlay */}
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
          <Link to="/about" className="navbar-nav-link" style={{ fontWeight: 600, color: isDark ? '#cbd5e1' : '#1e293b' }}>About</Link>
          <Link to="/features" className="navbar-nav-link" style={{ fontWeight: 600, color: isDark ? '#cbd5e1' : '#1e293b' }}>Features</Link>
          <button className="theme-toggle" onClick={toggleTheme} style={{ marginRight: '15px' }}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-outline-light btn-sm" style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1e293b', borderColor: isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1' }}>Login</Link>
            <Link to="/register" className="btn btn-accent btn-sm" style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 20px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              border: 'none'
            }}>Register</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 60px' }}>
        <div className="container text-center fade-in" style={{ maxWidth: '850px' }}>
          <h1 className="hero-title" style={{
            fontSize: '3.8rem',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '36px',
            color: isDark ? '#ffffff' : '#0f172a',
            letterSpacing: '-0.5px'
          }}>
            Secure Exam Paper Distribution & Management System
          </h1>
          <div className="hero-cta flex justify-center gap-4">
            <Link to="/register" className="btn btn-accent btn-lg" style={{
              fontWeight: 800,
              padding: '16px 42px',
              fontSize: '1.15rem',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0284c7 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -4px rgba(37, 99, 235, 0.45)',
              letterSpacing: '0.3px',
              border: 'none'
            }}>Get Started</Link>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-3 features-grid" style={{ marginTop: '80px', gap: '30px' }}>
            <div className="card-glass text-center p-6 hover-lift" style={{
              background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
              boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)'
            }}>
              <div style={{ fontSize: '2.2rem', color: '#2563eb', marginBottom: '12px' }}>
                <FaLock />
              </div>
              <h4 style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 700, fontSize: '18px', margin: 0, letterSpacing: '0.3px' }}>End-to-End Encryption</h4>
            </div>

            <div className="card-glass text-center p-6 hover-lift" style={{
              background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
              boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)'
            }}>
              <div style={{ fontSize: '2.2rem', color: '#059669', marginBottom: '12px' }}>
                <FaShieldAlt />
              </div>
              <h4 style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 700, fontSize: '18px', margin: 0, letterSpacing: '0.3px' }}>Anti-Leak Watermarking</h4>
            </div>

            <div className="card-glass text-center p-6 hover-lift" style={{
              background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
              boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)'
            }}>
              <div style={{ fontSize: '2.2rem', color: '#d97706', marginBottom: '12px' }}>
                <FaClock />
              </div>
              <h4 style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 700, fontSize: '18px', margin: 0, letterSpacing: '0.3px' }}>Scheduled Release</h4>
            </div>
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

export default Home;
