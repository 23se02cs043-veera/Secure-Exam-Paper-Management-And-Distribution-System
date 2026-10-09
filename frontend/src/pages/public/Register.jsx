import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE } from '../../api/client';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMobileAlt, FaShieldAlt, FaEye, FaEyeSlash, FaIdCard, FaGraduationCap } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft, FaYahoo } from 'react-icons/fa';

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

function Register() {
  const { register } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '', password: '', confirm_password: '',
    full_name: '', phone: '', enrollment_number: '', course: '', role: 'student',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState({ score: 0, feedback: [] });
  const [error, setError] = useState('');

  const handlePasswordChange = (val) => {
    setFormData(prev => ({ ...prev, password: val }));
    let score = 0;
    const feedback = [];
    if (val.length >= 8) score++; else feedback.push('8+ chars');
    if (/[A-Z]/.test(val)) score++; else feedback.push('uppercase');
    if (/[a-z]/.test(val)) score++; else feedback.push('lowercase');
    if (/\d/.test(val)) score++; else feedback.push('number');
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(val)) score++; else feedback.push('symbol');
    setStrength({ score, feedback });
  };

  const handleOAuth = (provider) => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}?action=signup`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (strength.score < 3) {
      setError('Please use a stronger password');
      return;
    }
    const res = await register(formData);
    if (res.success) navigate('/login');
    else setError(res.error);
  };

  // Dynamic Theme Styles
  const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    background: isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    position: 'relative',
    overflow: 'hidden',
    color: isDark ? '#ffffff' : '#0f172a'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '480px',
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

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: isDark ? '#ffffff' : '#0f172a' }}>Create Account</h1>
        <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '14px', margin: '0 0 24px', fontWeight: 500 }}>Join the secure exam management platform</p>

        {/* OAuth */}
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
          <span style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '12px', fontWeight: 500 }}>or sign up with email</span>
          <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }} />
        </div>

        {/* Form */}
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
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Full Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaUser style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                autoComplete="off"
                placeholder="Full Name"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaEnvelope style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                autoComplete="off"
                placeholder="Email Address"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Phone Number</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaMobileAlt style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '15px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                autoComplete="off"
                placeholder="Phone Number"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              style={{
                ...inputStyle,
                paddingLeft: '14px'
              }}
            >
              <option value="student" style={{ color: '#0f172a' }}>Student</option>
              <option value="staff" style={{ color: '#0f172a' }}>Teaching Staff</option>
              <option value="coordinator" style={{ color: '#0f172a' }}>Exam Coordinator</option>
              <option value="super_admin" style={{ color: '#0f172a' }}>Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={formData.password}
                onChange={e => handlePasswordChange(e.target.value)}
                autoComplete="new-password"
                placeholder="Password"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b', cursor: 'pointer', padding: '4px', zIndex: 2
                }}
              >
                {showPass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formData.password && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: isDark ? '#cbd5e1' : '#475569' }}>
                  <span>Password strength:</span>
                  <span style={{ color: strengthColor[strength.score], fontWeight: 700 }}>
                    {strengthLabel[strength.score]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '13px', fontWeight: 600 }}>Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FaLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', fontSize: '14px', zIndex: 2, pointerEvents: 'none' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                autoComplete="new-password"
                placeholder="Confirm Password"
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b', cursor: 'pointer', padding: '4px', zIndex: 2
                }}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '8px',
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
            Create Account
          </button>
        </form>

        <p style={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '13px', textAlign: 'center', marginTop: '20px', fontWeight: 500 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
