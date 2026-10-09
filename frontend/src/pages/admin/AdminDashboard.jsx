import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { usersAPI } from '../../api/users';
import { toast } from 'react-toastify';
import {
  FaUsers,
  FaFileAlt,
  FaShieldAlt,
  FaClock,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const res = await usersAPI.adminDashboard();
      setStats(res.data);
    } catch {
      toast.error('Failed to retrieve administrator statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Loading administrator dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Administrator Control Console</h1>
        <p className="text-muted">Security diagnostics and access monitors</p>
      </div>

      {/* Grid Stats */}
      <div className="dashboard-grid-4 stagger-children">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>
          <div className="stat-card-icon blue"><FaUsers /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.total_users || 0}</div>
            <div className="stat-card-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/papers')}>
          <div className="stat-card-icon green"><FaFileAlt /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.total_papers || 0}</div>
            <div className="stat-card-label">Encrypted Papers</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/security')}>
          <div className="stat-card-icon gold"><FaShieldAlt /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.security_alerts || 0}</div>
            <div className="stat-card-label">Active Alerts</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/audit-logs?action=failed_login')}>
          <div className="stat-card-icon red"><FaClock /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.failed_logins_24h || 0}</div>
            <div className="stat-card-label">Failed Logins (24h)</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        {/* Unresolved Alerts */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Security Alerts</h3>
            {stats?.security_alerts > 0 && <span className="badge badge-danger">{stats?.security_alerts} Unresolved</span>}
          </div>
          {stats?.recent_alerts?.length === 0 ? (
            <div className="p-4 text-center text-muted">No unresolved security alerts. System normal.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats?.recent_alerts?.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                    borderLeft: '4px solid var(--color-danger)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ fontSize: '13px' }}>{alert.alert_type.toUpperCase()}</div>
                    <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>{alert.description}</div>
                  </div>
                  <span className="badge badge-danger">{alert.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Stream */}
        <div className="card">
          <div className="card-header">
            <h3>Audit Stream (Last 10 Actions)</h3>
          </div>
          <div className="flex flex-col" style={{ gap: '10px' }}>
            {stats?.recent_logs?.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--color-bg-secondary)',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span className="font-semibold text-primary">{log.user_email}</span>{' '}
                  <span style={{ color: 'var(--color-text-secondary)' }}>performed</span>{' '}
                  <span className="badge badge-primary">{log.action}</span>
                </div>
                <div className="text-muted" style={{ fontSize: '10px' }}>
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
