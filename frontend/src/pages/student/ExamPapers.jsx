import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { papersAPI } from '../../api/papers';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaFilePdf, FaEye, FaLock, FaExclamationTriangle } from 'react-icons/fa';

function ExamPapers() {
  const { user } = useAuth();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activePaper, setActivePaper] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const iframeRef = useRef(null);

  const fetchReleased = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await papersAPI.studentPapers();
      setReleases(res.data.papers);
    } catch {
      toast.error('Failed to load exam listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleased(true);
    const refreshTimer = setInterval(() => fetchReleased(), 5000);
    return () => clearInterval(refreshTimer);
  }, []);

  const filteredPapers = releases.filter((p) => {
    const isLocked = p.is_locked || p.distribution_status === 'locked' || p.distribution_status === 'expired';
    if (isLocked) return false;

    const isUpcoming = p.distribution_status === 'scheduled' || p.distribution_status === 'pending' || p.distribution_status === 'not_scheduled';
    const isReleased = p.distribution_status === 'released' && !isUpcoming;

    if (filter === 'released') return isReleased;
    if (filter === 'upcoming') return isUpcoming;
    return true;
  });

  const releasedCount = releases.filter(p => !p.is_locked && p.distribution_status === 'released').length;
  const upcomingCount = releases.filter(p => !p.is_locked && (p.distribution_status === 'scheduled' || p.distribution_status === 'pending' || p.distribution_status === 'not_scheduled')).length;

  const handleOpenExamPaper = async (paper) => {
    const isLocked = paper.is_locked || paper.distribution_status === 'locked';
    if (isLocked) {
      toast.error('🔒 Exam paper is locked by administration.');
      return;
    }
    const isUpcoming = paper.distribution_status === 'scheduled' || paper.distribution_status === 'pending' || paper.distribution_status === 'not_scheduled';
    if (isUpcoming) {
      const releaseTimeStr = paper.distribution_time ? new Date(paper.distribution_time).toLocaleString() : 'the scheduled window';
      toast.info(`📅 Exam paper "${paper.course_code}" is UPCOMING. Scheduled for release on: ${releaseTimeStr}.`);
      return;
    }
    if (paper.distribution_status === 'expired') {
      toast.error('🔒 Examination window has expired for this paper.');
      return;
    }

    setActivePaper(paper.id);
    toast.info('Decrypting exam file & applying personal watermarks...');
    try {
      const response = await papersAPI.viewPaperBlob(paper.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const localUrl = URL.createObjectURL(blob);
      setPdfUrl(localUrl);
      toast.success('Exam paper decrypted successfully! 🔓');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Access window expired or file locked.';
      toast.error(errMsg);
      setActivePaper(null);
      setPdfUrl('');
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Examination Hall</h1>
        <p className="text-muted">Dynamic decryption and watermarked viewing of scheduled and upcoming exam papers</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: `All Exam Papers (${releases.filter(p => !p.is_locked && p.distribution_status !== 'expired').length})` },
          { key: 'released', label: `✅ Released Papers (${releasedCount})` },
          { key: 'upcoming', label: `📅 Upcoming Releases (${upcomingCount})` },
        ].map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${filter === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-3" style={{ gridTemplateColumns: '340px 1fr', gap: '30px' }}>
        {/* Left Side: Exam List */}
        <div className="flex flex-col gap-3">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Exam Catalog</h3>
          {loading ? (
            <div>Loading catalog...</div>
          ) : filteredPapers.length === 0 ? (
            <div className="card text-center p-4 text-muted">No exams match the selected filter.</div>
          ) : (
            filteredPapers.map((paper) => {
              const isLocked = paper.is_locked || paper.distribution_status === 'locked';
              const isUpcoming = paper.distribution_status === 'scheduled' || paper.distribution_status === 'pending' || paper.distribution_status === 'not_scheduled';
              return (
                <div
                  key={paper.id}
                  onClick={() => handleOpenExamPaper(paper)}
                  style={{
                    padding: '15px',
                    borderRadius: '10px',
                    border: activePaper === paper.id ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)',
                    background: activePaper === paper.id ? 'var(--color-bg-tertiary)' : 'var(--color-bg-light)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover-scale"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-primary">{paper.course_code}</div>
                    <div>
                      {isLocked ? (
                        <span className="badge badge-danger">🔒 LOCKED</span>
                      ) : isUpcoming ? (
                        <span className="badge badge-warning">📅 UPCOMING</span>
                      ) : (
                        <span className="badge badge-success">✅ RELEASED</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '2px', fontWeight: 600 }}>{paper.title}</div>
                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                    Subject: {paper.subject}
                  </div>
                  {isUpcoming && paper.distribution_time && (
                    <div style={{ fontSize: '11px', color: '#d97706', marginTop: '6px', fontWeight: 600 }}>
                      🕒 Release: {new Date(paper.distribution_time).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: PDF Viewer Frame */}
        <div className="card flex flex-col items-center justify-center" style={{ minHeight: '600px', background: 'var(--color-bg-secondary)', padding: '15px' }}>
          {pdfUrl ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div
                className="alert alert-warning mb-2"
                style={{
                  padding: '10px 15px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: 0,
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaExclamationTriangle className="pulse" />
                  <span>
                    <strong>SECURITY WATERMARK ACTIVE:</strong> Document personalized for <strong>{user?.full_name || 'STUDENT'}</strong> (Enrollment No: <strong>{user?.enrollment_number || '2026-CSE-001'}</strong>) | Email: {user?.email}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => window.open(pdfUrl, '_blank')} 
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    <FaEye /> Open in Full Screen Tab
                  </button>
                </div>
              </div>
              <object
                data={pdfUrl}
                type="application/pdf"
                style={{ width: '100%', height: '560px', border: 'none', borderRadius: '8px', background: 'white' }}
              >
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  title="Secure Exam Viewer"
                  style={{ width: '100%', height: '560px', border: 'none', borderRadius: '8px', background: 'white' }}
                />
              </object>
            </div>
          ) : (
            <div className="text-center p-8 text-muted">
              <FaLock style={{ fontSize: '3.5rem', color: 'var(--color-primary)', marginBottom: '15px' }} />
              <h3>Secure Exam Viewer</h3>
              <p style={{ maxWidth: '420px', fontSize: '13px', lineHeight: '1.6', marginTop: '10px' }}>
                Select an exam catalog entry from the left menu. The examination paper will be decrypted in real-time and streamed with personalized security watermarks.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ExamPapers;
