import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE } from '../../api/client';
import { usersAPI } from '../../api/users';
import client from '../../api/client';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaUnlock, FaEye, FaEyeSlash, FaShieldAlt, FaClock, FaBan, FaUserShield } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft, FaYahoo } from 'react-icons/fa';

function Login() {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [panicActive, setPanicActive] = useState(false);
  const [panicDetails, setPanicDetails] = useState(null);
  const [adminLiftPassword, setAdminLiftPassword] = useState('');
  const [showLiftForm, setShowLiftForm] = useState(false);
  const [lifting, setLifting] = useState(false);

  const checkPanicLock = async () => {
    try {
      const res = await usersAPI.panicLockStatus();
      setPanicActive(res.data.active);
      setPanicDetails(res.data.lock);
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    checkPanicLock();
    const interval = setInterval(checkPanicLock, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminLiftLockdown = async (e) => {
    e.preventDefault();
    if (!adminLiftPassword) {
      toast.error('Administrator password is required to lift panic lockdown');
      return;
    }
    setLifting(true);
    try {
      await client.post('/users/panic-lock/deactivate', {
        email: 'admin@university.edu',
        password: adminLiftPassword
      });

      toast.success('🔓 System Panic Lockdown deactivated! All portals & logins restored.');
      setPanicActive(false);
      setPanicDetails(null);
      setShowLiftForm(false);
      setAdminLiftPassword('');
      await checkPanicLock();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid administrator password or failed to lift lock');
    } finally {
      setLifting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userStr = params.get('user');

    if (accessToken && refreshToken && userStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        window.location.href = '/dashboard';
      } catch (err) {
        setError('OAuth authentication callback processing failed.');
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      const role = result.user.role;
      const routes = {
        super_admin: '/admin/dashboard',
        staff: '/staff/dashboard',
        coordinator: '/coordinator/dashboard',
        student: '/student/dashboard',
      };
      navigate(routes[role] || '/admin/dashboard', { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}`;
  };

  const fillDemo = (email, pass) => {
    setFormData({ email, password: pass });
    setError('');
  };

  // Dynamic Theme Styles
  const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    position: 'relative',
    overflow: 'hidden',
    color: isDark ? '#ffffff' : '#0f172a'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '460px',
    background: isDark ? 'rgba(15, 23, 42, 0.90)' : '#ffffff',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '36px',
    boxShadow: isDark
      ? '0 20px 50px rgba(0,0,0,0.5)'
      : '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
    backdropFilter: 'blur(16px)',
    zIndex: 1
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 40px',
    background: isDark ? 'rgba(255,255,255,0.07)' : '#ffffff',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
    borderRadius: '10px',
    color: isDark ? '#ffffff' : '#0f172a',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const oauthBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '11px 14px',
    borderRadius: '10px',
    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #e2e8f0',
    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    color: isDark ? '#ffffff' : '#1e293b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.04)'
  };

  if (panicActive) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#030712',
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(220, 38, 38, 0.22), transparent 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflowY: 'auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '3px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.6)',
            marginBottom: '24px',
          }}
        >
          <FaLock style={{ fontSize: '56px', color: '#ef4444' }} />
        </div>

        <h1
          style={{
            fontSize: '30px',
            fontWeight: 900,
            color: '#f87171',
            letterSpacing: '1.5px',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          🚨 SYSTEM PANIC LOCKDOWN ACTIVATED 🔒
        </h1>

        <p style={{ fontSize: '15px', color: '#9ca3af', fontWeight: 600, marginBottom: '28px', maxWidth: '620px' }}>
          CRITICAL SECURITY OVERRIDE: ENTIRE SYSTEM IS LOCKED ACROSS ALL LOGINS (STUDENT, STAFF, COORDINATOR, ADMIN).
        </p>

        <div
          style={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            padding: '28px 32px',
            maxWidth: '680px',
            width: '100%',
            textAlign: 'left',
            boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.35)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(239,68,68,0.3)', paddingBottom: '14px' }}>
            <span className="badge badge-danger" style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaBan /> 🔒 SYSTEM-WIDE FULL LOCKOUT IN EFFECT
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaClock /> {panicDetails?.created_at ? new Date(panicDetails.created_at).toLocaleString() : 'Just now'}
            </span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Affected Logins & Portals
            </label>
            <div style={{ fontSize: '14px', color: '#fca5a5', fontWeight: 600, marginTop: '4px' }}>
              🛑 Student Portal • Teaching Staff Portal • Exam Coordinator Portal • Administrator Console
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Emergency Lockdown Reason
            </label>
            <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 700, marginTop: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              {panicDetails?.reason || 'Emergency system lockdown initiated by System Administrator due to potential security anomaly.'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Security Directive
            </label>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
              All authentication attempts, portal logins, and API access are suspended until System Panic Lockdown is deactivated by System Administrator.
            </div>
          </div>
        </div>

        {/* Admin Emergency Override Form on Login Page */}
        <div style={{ background: 'rgba(30, 41, 59, 0.95)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px 28px', maxWidth: '680px', width: '100%', marginBottom: '20px' }}>
          {!showLiftForm ? (
            <button
              className="btn btn-success btn-full"
              style={{ fontSize: '14px', fontWeight: 700, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setShowLiftForm(true)}
            >
              <FaUnlock /> 🔓 Administrator Emergency Lift Lockdown
            </button>
          ) : (
            <form onSubmit={handleAdminLiftLockdown} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaUserShield /> Authenticate Administrator Password to Lift Lockdown
              </div>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Administrator Password"
                value={adminLiftPassword}
                onChange={(e) => setAdminLiftPassword(e.target.value)}
                style={{ background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', border: '1px solid #0284c7' }}
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-success" style={{ flex: 1, fontWeight: 700 }} disabled={lifting}>
                  <FaUnlock /> {lifting ? 'Lifting Lockdown...' : 'Lift Lockdown & Restore Systems'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLiftForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Please contact the System Administrator to lift this panic lockdown.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Subtle Light Background Overlay */}
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
        opacity: isDark ? 0.15 : 0.08,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #059669 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
          }}>
            <FaShieldAlt size={20} />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', letterSpacing: '-0.5px' }}>
            Secure<span style={{ color: '#2563eb' }}>Exam</span>
          </span>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: isDark ? '#ffffff' : '#0f172a' }}>Welcome Back</h1>
        <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '14px', margin: '0 0 24px', fontWeight: 500 }}>Sign in to your secure dashboard</p>

        {/* OAuth Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => handleOAuth('google')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '11px 14px', borderRadius: '10px',
              border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              color: isDark ? '#ffffff' : '#0f172a',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.05)'
            }}
            title="Continue with Google"
          >
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => handleOAuth('microsoft')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '11px 14px', borderRadius: '10px',
              border: isDark ? '1px solid rgba(0, 164, 239, 0.3)' : '1px solid #bae6fd',
              background: isDark ? 'rgba(0, 164, 239, 0.08)' : '#f0f9ff',
              color: isDark ? '#ffffff' : '#0369a1',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0, 164, 239, 0.1)'
            }}
            title="Continue with Microsoft"
          >
            <FaMicrosoft size={20} color="#00a4ef" />
            <span>Continue with Microsoft</span>
          </button>
          <button
            onClick={() => handleOAuth('yahoo')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '11px 14px', borderRadius: '10px',
              border: isDark ? '1px solid rgba(123, 0, 153, 0.3)' : '1px solid #e9d5ff',
              background: isDark ? 'rgba(123, 0, 153, 0.1)' : '#faf5ff',
              color: isDark ? '#ffffff' : '#6b21a8',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(123, 0, 153, 0.1)'
            }}
            title="Continue with Yahoo"
          >
            <FaYahoo size={20} color="#7B0099" />
            <span>Continue with Yahoo</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }} />
          <span style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '12px', fontWeight: 500 }}>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: isDark ? '#fca5a5' : '#dc2626',
              fontSize: '13px',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaEnvelope style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="off"
                placeholder="Email Address"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Password"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', background: 'none', border: 'none',
                  color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b', cursor: 'pointer', padding: '4px'
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-4px' }}>
            <Link to="/forgot-password" style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            style={{
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)'
            }}
          >
            Sign In
          </button>
        </form>

        <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '13px', textAlign: 'center', marginTop: '20px', fontWeight: 500 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
            Register
          </Link>
        </p>

        {/* Demo Login Shortcuts */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: isDark ? 'rgba(245,197,24,0.06)' : '#f0f9ff',
          border: isDark ? '1px solid rgba(245,197,24,0.2)' : '1px solid #bae6fd',
          borderRadius: '12px'
        }}>
          <p style={{ color: isDark ? '#fbbf24' : '#0369a1', fontSize: '12px', margin: '0 0 10px', fontWeight: 700 }}>
            ⚡ QUICK DEMO LOGINS:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillDemo('admin@university.edu', 'TestPass123!')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('coordinator@university.edu', 'TestPass123!')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📋 Exam Coordinator
            </button>
            <button
              type="button"
              onClick={() => fillDemo('staff@university.edu', 'TestPass123!')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👩‍🏫 Teaching Staff
            </button>
            <button
              type="button"
              onClick={() => fillDemo('student@university.edu', 'TestPass123!')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🧑‍🎓 Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
