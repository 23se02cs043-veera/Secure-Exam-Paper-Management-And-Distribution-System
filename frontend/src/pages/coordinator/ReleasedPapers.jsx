import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { papersAPI } from '../../api/papers';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaClock, FaCheck, FaTimes, FaCalendarAlt, FaLock, FaUnlock, FaBan } from 'react-icons/fa';

function ReleasedPapers() {
  const queryParams = new URLSearchParams(window.location.search);
  const initialFilter = queryParams.get('filter') || 'all';

  const [papers, setPapers] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockReason, setLockReason] = useState('Emergency manual lock initiated');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');

  // Forms
  const [releaseTime, setReleaseTime] = useState(new Date());
  const [expiryTime, setExpiryTime] = useState(new Date());
  const [notes, setNotes] = useState('');

  const fetchPapers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await papersAPI.listAll();
      setPapers(res.data.papers);
    } catch {
      toast.error('Failed to load exam documents repository');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers(true);
    const refreshTimer = setInterval(() => fetchPapers(), 5000);
    return () => clearInterval(refreshTimer);
  }, []);

  const filteredPapers = papers.filter((p) => {
    const isLocked = p.is_locked || p.distribution_status === 'locked';
    if (filter === 'upcoming') {
      return !isLocked && (p.distribution_status === 'scheduled' || p.distribution_status === 'pending' || p.distribution_status === 'not_scheduled');
    }
    if (filter === 'released') {
      return !isLocked && p.distribution_status === 'released';
    }
    if (filter === 'locked') {
      return isLocked || p.distribution_status === 'expired';
    }
    return true;
  });

  const handleOpenSchedule = (paper) => {
    setSelectedPaper(paper);
    setReleaseTime(new Date(Date.now() + 15 * 60000)); // Default 15 mins in future
    setExpiryTime(new Date(Date.now() + 180 * 60000)); // Default 3 hours in future
    setNotes('');
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await papersAPI.scheduleRelease(selectedPaper.id, {
        release_time: releaseTime.toISOString(),
        expiry_time: expiryTime.toISOString(),
        release_notes: notes,
      });
      toast.success('Exam release schedule programmed successfully!');
      setShowScheduleModal(false);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scheduling failed');
    }
  };

  const handleReleaseNow = async (paper) => {
    if (!window.confirm('RELEASE exam paper immediately to all students?')) return;
    try {
      await papersAPI.releaseNow(paper.id, {
        expiry_time: new Date(Date.now() + 180 * 60000).toISOString(), // 3 hours default duration
      });
      toast.success('🚀 Exam released immediately to student portals!');
      fetchPapers();
    } catch {
      toast.error('Failed to release paper');
    }
  };

  const handleLockClick = (paper) => {
    setSelectedPaper(paper);
    setLockPassword('');
    setLockReason('Emergency manual lock initiated');
    setShowLockModal(true);
  };

  const handleLockSubmit = async (e) => {
    e.preventDefault();
    if (!lockPassword) {
      toast.error('Verification password is required');
      return;
    }
    try {
      await papersAPI.lockPaper(selectedPaper.id, {
        reason: lockReason,
        password: lockPassword,
      });
      toast.error('Exam paper manually locked down. Access suspended.');
      setShowLockModal(false);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lock operation failed');
    }
  };

  const handleUnlockClick = (paper) => {
    setSelectedPaper(paper);
    setUnlockPassword('');
    setShowUnlockModal(true);
  };

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!unlockPassword) {
      toast.error('Verification password is required');
      return;
    }
    try {
      await papersAPI.unlockPaper(selectedPaper.id, {
        password: unlockPassword,
      });
      toast.success('Paper access resumed successfully.');
      setShowUnlockModal(false);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unlock operation failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Release Scheduling & Lock overrides</h1>
        <p className="text-muted">Schedule releases, dispatch immediate launches, and override active locks</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All Exam Papers' },
          { key: 'upcoming', label: '📅 Upcoming Releases' },
          { key: 'released', label: '✅ Released Papers' },
          { key: 'locked', label: '🔒 Locked / Expired' },
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

      {loading ? (
        <div className="text-center p-4">Loading repository indexes...</div>
      ) : filteredPapers.length === 0 ? (
        <div className="card text-center p-8 text-muted">No exam papers match the selected filter criterion.</div>
      ) : (
        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Subject Name</th>
                <th>Exam Title</th>
                <th>Status</th>
                <th>Distribution Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.map((p) => {
                const isLocked = p.is_locked;
                return (
                  <tr key={p.id}>
                    <td className="font-bold">{p.course_code}</td>
                    <td>{p.subject}</td>
                    <td>{p.title}</td>
                    <td>
                      {isLocked || p.distribution_status === 'locked' ? (
                        <span className="badge badge-danger"><FaLock /> Locked</span>
                      ) : p.distribution_time ? (
                        <span className={`badge ${p.distribution_status === 'released' ? 'badge-success' : p.distribution_status === 'scheduled' ? 'badge-info' : 'badge-danger'}`}>
                          {p.distribution_status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="badge badge-secondary"><FaClock /> Dormant</span>
                      )}
                    </td>
                    <td>
                      {p.distribution_time ? (
                        <span style={{ fontSize: '12px' }} className="text-muted">
                          {new Date(p.distribution_time).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '12px' }}>Not Scheduled</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {!isLocked && (
                          <>
                            <button className="btn btn-sm btn-ghost" title="Schedule Release" onClick={() => handleOpenSchedule(p)}>
                              <FaCalendarAlt className="text-primary" />
                            </button>
                            <button className="btn btn-sm btn-ghost" title="Release Immediately" onClick={() => handleReleaseNow(p)}>
                              <FaUnlock className="text-success" />
                            </button>
                             <button className="btn btn-sm btn-ghost text-danger" title="Manual Lock" onClick={() => handleLockClick(p)}>
                               <FaBan />
                             </button>
                          </>
                        )}
                        {isLocked && (
                          <button className="btn btn-sm btn-ghost text-success" title="Remove Lock" onClick={() => handleUnlockClick(p)}>
                            <FaUnlock /> Remove Lock
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

      {/* Schedule Release Modal */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Configure Scheduled Exam Window">
        <form onSubmit={handleScheduleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'block' }}>Release Window Start (Your Local Time)</label>
            <DatePicker
              selected={releaseTime}
              onChange={(date) => setReleaseTime(date)}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'block' }}>Release Window End / Expiry (Your Local Time)</label>
            <DatePicker
              selected={expiryTime}
              onChange={(date) => setExpiryTime(date)}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Instructions / Notes</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Provide exam details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-4">Program Release Window</button>
        </form>
      </Modal>

      {/* Manual Emergency Lock Modal */}
      <Modal isOpen={showLockModal} onClose={() => setShowLockModal(false)} title="Verify Manual Lock Action">
        <form onSubmit={handleLockSubmit}>
          <div className="alert alert-danger mb-4" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '8px' }}>
            <strong>CRITICAL ACTION:</strong> You are initiating a manual lock override on <strong>{selectedPaper?.title} ({selectedPaper?.course_code})</strong>. This will instantly suspend all student access to this exam paper.
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Lockdown</label>
            <input
              type="text"
              className="form-control"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your Account Password (Verification)</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password to verify identity"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-danger btn-full mt-4" style={{ background: 'var(--color-danger)' }}>Verify & Lock Exam Paper</button>
        </form>
      </Modal>

      {/* Manual Emergency Unlock Modal */}
      <Modal isOpen={showUnlockModal} onClose={() => setShowUnlockModal(false)} title="Verify Manual Unlock Action">
        <form onSubmit={handleUnlockSubmit}>
          <div className="alert alert-warning mb-4" style={{ background: 'rgba(245, 197, 24, 0.15)', border: '1px solid rgba(245, 197, 24, 0.3)', color: '#ffe066', padding: '12px', borderRadius: '8px' }}>
            <strong>CONFIRMATION REQUIRED:</strong> You are about to lift the lock restriction on <strong>{selectedPaper?.title} ({selectedPaper?.course_code})</strong>. This will restore student access to this exam paper immediately.
          </div>
          <div className="form-group">
            <label className="form-label">Your Account Password (Verification)</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password to verify identity"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">Verify & Unlock Exam Paper</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export default ReleasedPapers;
