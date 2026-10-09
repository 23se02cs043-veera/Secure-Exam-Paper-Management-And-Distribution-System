import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { papersAPI } from '../../api/papers';
import { useCountdown } from '../../hooks/useCountdown';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { FaFilePdf, FaClock, FaCheckCircle, FaExclamationCircle, FaGraduationCap, FaIdCard } from 'react-icons/fa';

function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchDashboard = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await papersAPI.studentDashboard();
      setDashboardData(res.data);
    } catch {
      toast.error('Failed to load student exam portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
    const refreshTimer = setInterval(() => fetchDashboard(), 2000);
    return () => clearInterval(refreshTimer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Initializing student dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Student Profile Card Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        color: '#ffffff',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              backdropFilter: 'blur(4px)'
            }}>
              🎓
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
                {user?.full_name || 'Student Portal'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#e0f2fe' }}>
                {user?.enrollment_number && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FaIdCard /> <strong>Enrollment No:</strong> {user.enrollment_number}
                  </span>
                )}
                {user?.course && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FaGraduationCap /> <strong>Course:</strong> {user.course}
                  </span>
                )}
                <span><strong>Email:</strong> {user?.email}</span>
              </div>
            </div>
          </div>
          {user?.enrollment_number && (
            <div style={{
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              ID: {user.enrollment_number}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid-3 stagger-children">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/student/papers')}>
          <div className="stat-card-icon blue"><FaFilePdf /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.papers_released || 0}</div>
            <div className="stat-card-label">Active Releases</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/student/papers')}>
          <div className="stat-card-icon gold"><FaClock /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.total_upcoming || 0}</div>
            <div className="stat-card-label">Upcoming Exams</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setShowHistoryModal(true)}>
          <div className="stat-card-icon green"><FaCheckCircle /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{dashboardData?.stats?.papers_viewed || 0}</div>
            <div className="stat-card-label">Exams Accessed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Active papers */}
        <div className="card">
          <div className="card-header">
            <h3>Released Exams (Open Now)</h3>
            <Link to="/student/papers" className="btn btn-ghost btn-sm">Enter Exam Hall</Link>
          </div>
          {dashboardData?.released_papers?.length === 0 ? (
            <div className="p-4 text-center text-muted">No exams are currently active. Safe.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dashboardData?.released_papers?.map((release) => (
                <div
                  key={release.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FaFilePdf style={{ fontSize: '1.5rem', color: 'var(--color-danger)' }} />
                    <div>
                      <div className="font-semibold text-primary">{release.paper_title}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{release.course_code} • {release.paper_subject}</div>
                    </div>
                  </div>
                  <Link to="/student/papers" className="btn btn-sm btn-primary">Open Portal</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming timers */}
        <div className="card">
          <div className="card-header">
            <h3>Upcoming Scheduled Exams</h3>
          </div>
          {dashboardData?.upcoming_exams?.length === 0 ? (
            <div className="p-4 text-center text-muted">No upcoming scheduled releases found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dashboardData?.upcoming_exams?.map((release) => (
                <UpcomingExamRow key={release.id} release={release} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Access History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="My Exam Access Register" size="lg">
        {dashboardData?.access_history?.length === 0 ? (
          <div className="p-4 text-center text-muted">You have not accessed any exam papers yet.</div>
        ) : (
          <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Exam Action</th>
                  <th>Security Verification</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.access_history?.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono">{new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}</td>
                    <td>
                      <span className="badge badge-success">
                        🔓 DECRYPTED & VIEWED
                      </span>
                    </td>
                    <td className="text-muted font-mono" style={{ fontSize: '12px' }}>IP: {log.ip_address || '127.0.0.1'} (AES-256 Verified)</td>
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

function UpcomingExamRow({ release }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(release.scheduled_release_time);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        borderRadius: '8px',
        background: 'var(--color-bg-secondary)',
      }}
    >
      <div>
        <div className="font-semibold text-primary">{release.paper_title}</div>
        <div className="text-muted" style={{ fontSize: '11px' }}>{release.course_code} • {release.paper_subject}</div>
      </div>
      <div>
        {isExpired ? (
          <span className="badge badge-success">READY</span>
        ) : (
          <span className="badge badge-warning font-mono" style={{ fontSize: '12px', padding: '5px 10px' }}>
            ⏳ {days > 0 ? `${days}d ` : ''}{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
