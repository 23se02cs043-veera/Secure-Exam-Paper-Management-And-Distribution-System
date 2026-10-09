import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaTh,
  FaUpload,
  FaFileAlt,
  FaCalendarAlt,
  FaUsers,
  FaHistory,
  FaShieldAlt,
  FaChartBar,
  FaSignOutAlt,
  FaLock
} from 'react-icons/fa';

function Sidebar({ mobileOpen, onClose, panicActive }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define links based on user role
  const getNavItems = () => {
    const role = user?.role;
    const items = [];

    if (role === 'super_admin') {
      items.push(
        { path: '/admin/dashboard', label: 'Admin Dashboard', icon: <FaTh /> },
        { path: '/admin/users', label: 'User Management', icon: <FaUsers /> },
        { path: '/admin/papers', label: 'Encrypted Papers', icon: <FaFileAlt /> },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: <FaHistory /> },
        { path: '/admin/security', label: 'Security Center', icon: <FaShieldAlt /> },
        { path: '/admin/reports', label: 'Reports Overview', icon: <FaChartBar /> }
      );
    } else if (role === 'staff') {
      items.push(
        { path: '/staff/dashboard', label: 'Staff Dashboard', icon: <FaTh /> },
        { path: '/staff/upload', label: 'Upload Exam Paper', icon: <FaUpload /> },
        { path: '/staff/papers', label: 'Manage Papers', icon: <FaFileAlt /> }
      );
    } else if (role === 'coordinator') {
      items.push(
        { path: '/coordinator/dashboard', label: 'Dashboard', icon: <FaTh /> },
        { path: '/coordinator/papers', label: 'Release Scheduling', icon: <FaCalendarAlt /> }
      );
    } else if (role === 'student') {
      items.push(
        { path: '/student/dashboard', label: 'My Dashboard', icon: <FaTh /> },
        { path: '/student/papers', label: 'Exam Papers', icon: <FaFileAlt /> }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/dashboard" className="sidebar-logo">
          <div className="sidebar-logo-icon">SE</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">SecureExam</span>
            <span className="sidebar-logo-tagline">Exam Distribution</span>
          </div>
        </NavLink>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.role === 'super_admin' ? 'A' : (user?.full_name?.charAt(0).toUpperCase() || 'U')}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" style={{ fontWeight: 700, fontSize: '14px' }}>
              {user?.role === 'super_admin' ? 'Admin' : user?.full_name}
            </div>
            {user?.role === 'student' ? (
              <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {user?.enrollment_number && (
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                    ID: {user.enrollment_number}
                  </div>
                )}
                {user?.course ? (
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                    Course: {user.course}
                  </div>
                ) : (
                  <div className="sidebar-user-role">Student</div>
                )}
              </div>
            ) : (
              <div className="sidebar-user-role">
                {user?.role === 'super_admin' ? 'System Administrator' : user?.role?.replace('_', ' ')}
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {panicActive && (
            <div className="p-3 mb-2 text-center" style={{ background: '#7f1d1d', borderRadius: '8px', margin: '10px' }}>
              <div className="flex items-center justify-center gap-2 text-white font-bold" style={{ fontSize: '12px' }}>
                <FaLock /> SYSTEM LOCKED
              </div>
            </div>
          )}

          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={handleLogout} style={{ border: 'none', background: 'none' }}>
            <span className="sidebar-item-icon"><FaSignOutAlt /></span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
