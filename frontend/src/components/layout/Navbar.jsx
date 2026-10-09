import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaSun, FaMoon, FaBars, FaSignOutAlt, FaUser } from 'react-icons/fa';

function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <nav className="navbar">
      <button className="navbar-mobile-toggle" onClick={onToggleSidebar}>
        <FaBars />
      </button>

      <div className="navbar-page-title d-none d-md-block">
        SecureExam Platform
      </div>

      <div className="navbar-actions">
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
          {isDark ? <FaSun /> : <FaMoon />}
        </button>

        {/* User Menu */}
        <div className="dropdown" style={{ position: 'relative' }}>
          <button
            className="navbar-notification-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Profile"
          >
            <FaUser />
          </button>
          {showProfileMenu && (
            <div className="dropdown-menu show" style={{ right: 0, top: '100%' }}>
              <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--color-border)' }}>
                <div className="font-semibold text-primary" style={{ fontSize: '14px' }}>{user?.full_name}</div>
                <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{user?.email}</div>
                {user?.enrollment_number && (
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                    ID: {user.enrollment_number}
                  </div>
                )}
                {user?.course && (
                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Course: {user.course}
                  </div>
                )}
              </div>
              <button
                className="dropdown-item danger"
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
              >
                <FaSignOutAlt /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
