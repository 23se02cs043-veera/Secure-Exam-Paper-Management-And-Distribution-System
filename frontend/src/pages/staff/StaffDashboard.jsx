import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { papersAPI } from '../../api/papers';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { FaUpload, FaDatabase, FaHistory, FaCloudUploadAlt, FaFilePdf, FaUsers, FaUserCheck, FaTrash } from 'react-icons/fa';

function StaffDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await papersAPI.staffDashboard();
      setDashboardData(res.data);
    } catch {
      toast.error('Failed to load teaching staff dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all recent operation logs?')) return;
    try {
      await papersAPI.clearStaffAuditLogs();
      toast.success('Recent operations cleared successfully! 🗑️');
      fetchDashboard();
    } catch {
      toast.error('Failed to clear recent operations');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Loading instructor dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Instructor Console</h1>
          <p className="text-muted">Upload course papers and review encryption logs</p>
        </div>
        <Link to="/staff/upload" className="btn btn-primary">
          <FaUpload /> Upload New Paper
        </Link>
      </div>

      <div className="dashboard-grid-3 stagger-children">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/papers')}>
          <div className="stat-card-icon blue"><FaCloudUploadAlt /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.total_papers || 0}</div>
            <div className="stat-card-label">Uploaded Papers</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setShowAccessModal(true)}>
          <div className="stat-card-icon green"><FaHistory /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.total_downloads || 0}</div>
            <div className="stat-card-label">Total Student Accesses</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/papers')}>
          <div className="stat-card-icon gold"><FaDatabase /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.storage_used_mb || 0} MB</div>
            <div className="stat-card-label">Encrypted Storage Used</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Uploaded papers summary */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Uploads</h3>
            <Link to="/staff/papers" className="btn btn-ghost btn-sm">Manage All</Link>
          </div>
          {dashboardData?.papers?.length === 0 ? (
            <div className="p-4 text-center text-muted">No papers uploaded yet. Click Upload above to start.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dashboardData?.papers?.map((paper) => {
                const isLocked = paper.is_locked || paper.distribution_status === 'locked';
                const isUpcoming = paper.distribution_status === 'scheduled' || paper.distribution_status === 'pending' || paper.distribution_status === 'not_scheduled';
                return (
                  <div
                    key={paper.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-secondary)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                    }}
                    onClick={() => navigate('/staff/papers')}
                  >
                    <div className="flex items-center gap-3">
                      <FaFilePdf style={{ fontSize: '1.5rem', color: 'var(--color-danger)' }} />
                      <div>
                        <div className="font-semibold text-primary" style={{ fontSize: '13px' }}>
                          {paper.title}
                          {isUpcoming && (
                            <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px' }}>
                              📅 SCHEDULED (UPCOMING)
                            </span>
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          <span>Code: <strong>{paper.course_code}</strong></span>
                          <span>Subject: <strong>{paper.subject}</strong></span>
                          {isUpcoming && paper.distribution_time && (
                            <span style={{ color: '#d97706', fontWeight: 600 }}>
                              🕒 Release: {new Date(paper.distribution_time).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3>Recent Operations</h3>
            {dashboardData?.recent_activity?.length > 0 && (
              <button className="btn btn-ghost btn-sm text-danger" title="Clear Operations Log" onClick={handleClearLogs}>
                <FaTrash style={{ marginRight: '4px' }} /> Clear Logs
              </button>
            )}
          </div>
          {dashboardData?.recent_activity?.length === 0 ? (
            <div className="p-4 text-center text-muted">No recent operations logged.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {dashboardData?.recent_activity?.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-content">
                    <div className="activity-action">{log.action.replace('_', ' ').toUpperCase()}</div>
                    <div className="activity-detail">{log.details ? JSON.stringify(log.details) : 'Executed successfully'}</div>
                  </div>
                  <div className="activity-time">{new Date(log.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Student Access Logs Modal */}
      <Modal isOpen={showAccessModal} onClose={() => setShowAccessModal(false)} title="Total Student Paper Access Register" size="lg">
        {dashboardData?.recent_student_access_logs?.length === 0 ? (
          <div className="p-4 text-center text-muted">No student accesses recorded yet for your uploaded course papers.</div>
        ) : (
          <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Student Email</th>
                  <th>Action Triggered</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.recent_student_access_logs?.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono">{new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}</td>
                    <td className="font-semibold text-primary">{log.user_email || 'Student'}</td>
                    <td>
                      <span className={`badge ${log.action === 'decrypt_view' ? 'badge-success' : 'badge-primary'}`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default StaffDashboard;
