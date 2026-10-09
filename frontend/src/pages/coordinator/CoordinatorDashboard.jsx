import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { papersAPI } from '../../api/papers';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { FaClock, FaCheckCircle, FaLock, FaCalendarAlt, FaEye, FaBolt, FaExternalLinkAlt, FaDownload } from 'react-icons/fa';

function CoordinatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [selectedPaper, setSelectedPaper] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await papersAPI.coordinatorDashboard();
      setStats(res.data);
    } catch {
      toast.error('Failed to load coordinator analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleViewPaper = async (paper) => {
    setSelectedPaper(paper);
    toast.info(`Decrypting ${paper.course_code} exam document...`);
    try {
      const response = await papersAPI.viewPaperBlob(paper.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const localUrl = URL.createObjectURL(blob);
      setPdfUrl(localUrl);
      setShowPdfModal(true);
      toast.success(`Exam paper ${paper.course_code} decrypted successfully! 🔓`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decrypt and view exam paper');
    }
  };

  const handleReleaseNow = async (paper) => {
    if (!window.confirm(`Release "${paper.course_code} - ${paper.title}" immediately to all students?`)) return;
    try {
      await papersAPI.releaseNow(paper.id, {});
      toast.success(`⚡ Exam paper "${paper.course_code}" released immediately to students!`);
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to release paper immediately');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Loading exam coordinator dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Coordinator Dashboard</h1>
        <p className="text-muted">Monitor scheduled, active, and expired exam papers</p>
      </div>

      <div className="dashboard-grid-3 stagger-children">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/coordinator/papers?filter=released')}>
          <div className="stat-card-icon green"><FaCheckCircle /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.stats?.released_papers || 0}</div>
            <div className="stat-card-label">Released Papers</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/coordinator/papers?filter=upcoming')}>
          <div className="stat-card-icon blue"><FaCalendarAlt /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.stats?.upcoming_releases || 0}</div>
            <div className="stat-card-label">Upcoming Releases</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/coordinator/papers?filter=locked')}>
          <div className="stat-card-icon red"><FaLock /></div>
          <div className="stat-card-info">
            <div className="stat-card-value">{stats?.stats?.locked_papers || 0}</div>
            <div className="stat-card-label">Locked/Expired Papers</div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header flex justify-between items-center">
          <h3>Exam Papers Live Release Status</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/coordinator/papers')}>
            Manage Release Schedules 📅
          </button>
        </div>
        {stats?.papers?.length === 0 ? (
          <div className="p-4 text-center text-muted">No papers found in repository.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Paper Title</th>
                  <th>Subject</th>
                  <th>Scheduled Release</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats?.papers?.map((paper) => {
                  const isLocked = paper.is_locked || paper.distribution_status === 'locked';
                  return (
                    <tr key={paper.id} style={{ background: isLocked ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td className="font-bold">{paper.course_code}</td>
                      <td>{paper.title}</td>
                      <td>{paper.subject}</td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {paper.distribution_time
                          ? new Date(paper.distribution_time).toISOString().replace('T', ' ').substring(0, 16)
                          : 'Not Scheduled'}
                      </td>
                      <td>
                        {isLocked ? (
                          <span className="badge badge-danger">🔒 LOCKED</span>
                        ) : paper.distribution_status === 'released' ? (
                          <span className="badge badge-success">✅ RELEASED</span>
                        ) : paper.distribution_status === 'scheduled' ? (
                          <span className="badge badge-info">📅 SCHEDULED</span>
                        ) : paper.distribution_status === 'expired' ? (
                          <span className="badge badge-danger">🔒 EXPIRED</span>
                        ) : (
                          <span className="badge badge-primary">PENDING</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-ghost" title="View Decrypted Paper" onClick={() => handleViewPaper(paper)}>
                            <FaEye className="text-info" />
                          </button>
                          {paper.distribution_status !== 'released' && !isLocked && (
                            <button
                              className="btn btn-sm btn-success"
                              style={{ padding: '3px 8px', fontSize: '11px', gap: '3px' }}
                              title="Release Paper Immediately to Students"
                              onClick={() => handleReleaseNow(paper)}
                            >
                              <FaBolt /> Release Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF View Modal */}
      <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title={`Decrypted Exam Document (${selectedPaper?.course_code} - ${selectedPaper?.title})`} size="lg">
        {pdfUrl && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="badge badge-success">🔓 AES-256 Decrypted & Watermarked</span>
              <div className="flex gap-2">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary flex items-center gap-1">
                  <FaExternalLinkAlt /> Open in New Tab
                </a>
                <a href={pdfUrl} download={`${selectedPaper?.course_code}_Decrypted_Paper.pdf`} className="btn btn-sm btn-secondary flex items-center gap-1">
                  <FaDownload /> Download Copy
                </a>
              </div>
            </div>
            <div style={{ height: '520px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <object data={pdfUrl} type="application/pdf" width="100%" height="100%">
                <p className="text-center p-4">
                  PDF preview not supported directly in browser window.{' '}
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-bold">
                    Click here to open PDF in a new tab
                  </a>.
                </p>
              </object>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default CoordinatorDashboard;
