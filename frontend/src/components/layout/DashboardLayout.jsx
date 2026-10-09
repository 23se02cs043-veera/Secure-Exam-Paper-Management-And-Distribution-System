import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../api/users';
import Navbar from '../../components/layout/Navbar';
import Sidebar from '../../components/layout/Sidebar';
import { toast } from 'react-toastify';
import { FaLock, FaUnlock, FaClock, FaUserShield, FaBan } from 'react-icons/fa';

function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panicActive, setPanicActive] = useState(false);
  const [panicDetails, setPanicDetails] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const checkPanicLock = async () => {
    try {
      const res = await usersAPI.panicLockStatus();
      setPanicActive(res.data.active);
      setPanicDetails(res.data.lock);

      if (res.data.active && res.data.lock?.lock_type === 'all') {
        if (localStorage.getItem('access_token')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          toast.error('🚨 SYSTEM PANIC LOCKDOWN: All active sessions logged out. Returning to login page.');
          window.location.href = '/login';
        }
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    checkPanicLock();
    const interval = setInterval(checkPanicLock, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeactivateLockdown = async () => {
    if (!window.confirm('LIFT SYSTEM PANIC LOCKDOWN?\nThis will restore full system access across all student, staff, coordinator, and admin logins.')) return;
    setDeactivating(true);
    try {
      await usersAPI.deactivatePanicLock();
      toast.success('🔓 Emergency System Panic Lockdown deactivated! All portals restored.');
      setPanicActive(false);
      setPanicDetails(null);
      await checkPanicLock();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate panic lockdown');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="layout-wrapper">
      {/* Full-Screen Emergency System Panic Lockdown Overlay across All Logins */}
      {panicActive && (
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
          }}
        >
          {/* Large Pulsing Lock Emblem */}
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
            LOCKDOWN SCOPE: SUSPEND ALL CORE APP APIs (LOCKED ACROSS ALL STUDENT, STAFF, COORDINATOR, AND ADMIN LOGINS).
          </p>

          {/* Lockdown Detail Card */}
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
                <FaBan /> 🔒 SCOPE: SUSPEND ALL CORE APP APIs
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaClock /> {panicDetails?.created_at ? new Date(panicDetails.created_at).toLocaleString() : 'Just now'}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Lockdown Scope Selected
              </label>
              <div style={{ fontSize: '14px', color: '#fca5a5', fontWeight: 700, marginTop: '4px' }}>
                🛑 Suspend All Core App APIs & Full System Lockout (All Logins & Portals)
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Emergency Lockdown Reason
              </label>
              <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 700, marginTop: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                {panicDetails?.reason || 'Emergency system lockdown initiated by System Administrator.'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Security Directive
              </label>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
                All API operations, paper decryption, file downloads, release scheduling, and database access are strictly suspended until deactivated by System Administrator.
              </div>
            </div>
          </div>

          {/* Admin Override Action */}
          {user?.role === 'super_admin' ? (
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '16px 24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaUserShield /> Administrator Emergency Override Controls
              </div>
              <button
                className="btn btn-success"
                style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleDeactivateLockdown}
                disabled={deactivating}
              >
                <FaUnlock /> {deactivating ? 'Deactivating System Lockdown...' : '🔓 DEACTIVATE SYSTEM PANIC LOCKDOWN'}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Please contact the System Administrator to lift this panic lockdown.
            </div>
          )}
        </div>
      )}

      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        panicActive={panicActive}
      />
      <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Top Banner for 'downloads' or 'papers' scope */}
        {panicActive && panicDetails?.lock_type !== 'all' && (
          <div className="panic-lock-banner" style={{ background: panicDetails?.lock_type === 'downloads' ? '#854d0e' : '#991b1b' }}>
            <FaExclamationTriangle className="pulse" />
            <span>
              {panicDetails?.lock_type === 'downloads'
                ? `⚠️ PANIC LOCK (DOWNLOADS SUSPENDED): Paper decryption and file downloads are suspended by Administration. Reason: ${panicDetails?.reason}`
                : `🔒 PANIC LOCK (RELEASED PAPERS LOCKED): All released exam paper repositories are locked for student portals. Reason: ${panicDetails?.reason}`}
            </span>
          </div>
        )}

        <main
          className="main-content"
          style={{
            marginTop: panicActive && panicDetails?.lock_type !== 'all' ? 'calc(var(--navbar-height) + 40px)' : 'var(--navbar-height)',
          }}
        >
          <div className="fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
