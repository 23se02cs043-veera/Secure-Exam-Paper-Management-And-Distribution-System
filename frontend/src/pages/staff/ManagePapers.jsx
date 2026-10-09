import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { papersAPI } from '../../api/papers';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { FaTrash, FaEdit, FaEye, FaLock, FaUnlock, FaKey, FaHistory, FaCheck, FaTimes, FaDownload, FaExternalLinkAlt, FaUsers, FaShieldAlt, FaBolt } from 'react-icons/fa';

function ManagePapers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';
  const isStaff = user?.role === 'staff';
  const isCoordinator = user?.role === 'coordinator';

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handleViewPaper = async (paper) => {
    setSelectedPaper(paper);
    toast.info('Decrypting exam file & generating watermarked view...');
    try {
      const response = await papersAPI.viewPaperBlob(paper.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const localUrl = URL.createObjectURL(blob);
      setPdfUrl(localUrl);
      setShowPdfModal(true);
      toast.success('Exam paper decrypted successfully! 🔓');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decrypt and view exam paper');
    }
  };

  const fetchPapers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await papersAPI.listStaff();
      setPapers(res.data.papers);
    } catch {
      toast.error('Failed to load exam documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers(true);
    const refreshTimer = setInterval(() => fetchPapers(), 5000);
    return () => clearInterval(refreshTimer);
  }, []);

  const [filter, setFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', subject: '', semester: 1, watermark_enabled: true, is_locked: false });

  const handleEditClick = (paper) => {
    setSelectedPaper(paper);
    let defaultTime = '';
    if (paper.distribution_time) {
      const d = new Date(paper.distribution_time);
      const pad = (n) => n.toString().padStart(2, '0');
      defaultTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setEditFormData({
      course_code: paper.course_code || '',
      title: paper.title,
      subject: paper.subject,
      semester: paper.semester || 1,
      watermark_enabled: paper.watermark_enabled,
      scheduled_release_time: defaultTime,
      is_locked: paper.is_locked || false,
      new_file: null,
    });
    setShowEditModal(true);
  };

  const handleReleaseNow = async (paper) => {
    if (!window.confirm(`Release "${paper.course_code} - ${paper.title}" immediately to all students?`)) return;
    try {
      await papersAPI.releaseNow(paper.id, {});
      toast.success(`⚡ Exam paper "${paper.course_code}" released immediately to students!`);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to release paper immediately');
    }
  };

  const handleToggleStudentAccess = async (paper) => {
    if (isStaff) {
      toast.info('ℹ️ Teaching staff can upload exam papers. Paper release and rescheduling controls are managed by Exam Coordinators.');
      return;
    }
    const newIsLocked = !paper.is_locked;
    try {
      await papersAPI.updateStaff(paper.id, { is_locked: newIsLocked });
      if (newIsLocked) {
        toast.warning(`🔒 Student access BLOCKED/EXPIRED for ${paper.course_code}!`);
      } else {
        toast.success(`🔓 Student access ALLOWED for ${paper.course_code}!`);
      }
      fetchPapers();
    } catch {
      toast.error('Failed to update student access permission.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editFormData.new_file) {
        const formData = new FormData();
        formData.append('course_code', editFormData.course_code);
        formData.append('title', editFormData.title);
        formData.append('subject', editFormData.subject);
        formData.append('semester', editFormData.semester);
        formData.append('watermark_enabled', editFormData.watermark_enabled);
        formData.append('file', editFormData.new_file);

        await papersAPI.replacePdf(selectedPaper.id, formData);
        toast.success('Exam paper PDF file re-uploaded & re-encrypted successfully! 📄✨');
      } else {
        const payload = { ...editFormData };
        delete payload.new_file;
        if (isStaff) {
          delete payload.scheduled_release_time;
          delete payload.is_locked;
        }
        await papersAPI.updateStaff(selectedPaper.id, payload);
        toast.success('Exam paper details updated successfully! ✏️');
      }

      setShowEditModal(false);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update paper details');
    }
  };

  const handleDeletePaper = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam paper?')) return;
    try {
      await papersAPI.deleteStaff(id);
      toast.success('Exam paper deleted successfully! 🗑️');
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete paper');
    }
  };

  const handleRevealKeys = (paper) => {
    setSelectedPaper(paper);
    setShowKeyModal(true);
  };

  const handleRevealLogs = async (paper) => {
    try {
      const res = await papersAPI.getStaff(paper.id);
      setSelectedPaper(res.data.paper);
      setShowLogsModal(true);
    } catch {
      toast.error('Failed to load paper access trail');
    }
  };

  const accessibleCount = papers.filter((p) => !p.is_locked && p.distribution_status === 'released').length;
  const scheduledCount = papers.filter((p) => !p.is_locked && (p.distribution_status === 'scheduled' || p.distribution_status === 'pending' || p.distribution_status === 'not_scheduled')).length;
  const expiredCount = papers.filter((p) => p.is_locked || p.distribution_status === 'expired').length;

  const filteredPapers = papers.filter((p) => {
    if (filter === 'accessible') return !p.is_locked && p.distribution_status === 'released';
    if (filter === 'scheduled') return !p.is_locked && (p.distribution_status === 'scheduled' || p.distribution_status === 'pending' || p.distribution_status === 'not_scheduled');
    if (filter === 'expired') return p.is_locked || p.distribution_status === 'expired';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>{isAdmin ? 'Encrypted Papers Catalog' : 'Manage Exam Papers'}</h1>
        <p className="text-muted">{isAdmin ? 'Audit uploaded exam documents, decryption keys, and member access logs' : 'Review, edit, update student access permissions (Lock/Unlock/Expire), release schedules, and inspect access logs'}</p>
      </div>

      {isAdmin && (
        <div className="alert alert-info mb-4" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaShieldAlt style={{ fontSize: '1.2rem' }} />
          <span>
            <strong>Administrator Read-Only Audit Mode:</strong> You can view uploaded paper details, inspect cryptographic nonces/keys, and review student access logs. Paper editing & deletion is restricted to teaching staff.
          </span>
        </div>
      )}

      {/* Filter Category Tabs for Teaching Staff */}
      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Exam Papers', count: papers.length },
          { key: 'accessible', label: '🔓 Student Access Allowed', count: accessibleCount },
          { key: 'scheduled', label: '📅 Scheduled / Upcoming Papers', count: scheduledCount },
          { key: 'expired', label: '🔒 Expired / Locked Papers', count: expiredCount },
        ].map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${filter === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-4">Loading repository index...</div>
      ) : filteredPapers.length === 0 ? (
        <div className="card text-center p-8 text-muted">No papers match the selected filter category.</div>
      ) : (
        <div
          className="table-wrapper"
          style={{
            overflowX: 'auto',
            maxWidth: '100%',
            WebkitOverflowScrolling: 'touch',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-light)',
          }}
        >
          <table className="table-modern" style={{ minWidth: '1150px', width: '100%' }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Exam Title</th>
                <th>Subject</th>
                <th>Algorithm</th>
                <th>Watermark</th>
                <th>Accesses</th>
                {!isStaff && <th>Student Access Status</th>}
                <th>Distribution Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.map((p) => (
                <tr key={p.id}>
                  <td className="font-bold">{p.course_code}</td>
                  <td>{p.title}</td>
                  <td>{p.subject}</td>
                  <td><span className="badge badge-primary">{p.encryption_type}</span></td>
                  <td>
                    {p.watermark_enabled ? (
                      <span className="badge badge-success"><FaCheck /> Enabled</span>
                    ) : (
                      <span className="badge badge-danger"><FaTimes /> Disabled</span>
                    )}
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-info" style={{ gap: '4px' }}>
                        <FaUsers style={{ marginRight: '3px' }} /> {p.unique_viewers || 0} Student Members
                      </span>
                      <div style={{ fontSize: '11px', marginTop: '3px' }} className="text-muted">
                        {p.unique_viewers || 0} Student Accesses
                      </div>
                    </div>
                  </td>
                  {!isStaff && (
                    <td>
                      <button
                        className={`btn btn-sm ${p.is_locked ? 'btn-danger' : 'btn-success'}`}
                        style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleToggleStudentAccess(p)}
                        title={p.is_locked ? 'Click to Allow Student Access' : 'Click to Block / Expire Student Access'}
                      >
                        {p.is_locked ? '🔒 Access Blocked / Expired' : '🔓 Access Allowed'}
                      </button>
                    </td>
                  )}
                  <td>
                    {p.distribution_time ? (
                      <div>
                        <span className={`badge ${p.is_locked ? 'badge-danger' : (p.distribution_status === 'released' ? 'badge-success' : 'badge-warning')}`} style={{ marginRight: '6px' }}>
                          {p.is_locked ? 'EXPIRED' : (p.distribution_status === 'scheduled' ? '📅 SCHEDULED (UPCOMING)' : p.distribution_status.toUpperCase())}
                        </span>
                        <span style={{ fontSize: '11px' }} className="text-muted">
                          {new Date(p.distribution_time).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '11px' }}>Not Scheduled</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {!isStaff && (
                        <button
                          className="btn btn-sm btn-success"
                          style={{ padding: '3px 8px', fontSize: '11px', gap: '3px' }}
                          title="Release Paper Immediately to Students"
                          onClick={() => handleReleaseNow(p)}
                        >
                          <FaBolt /> Release Now
                        </button>
                      )}
                      <button className="btn btn-sm btn-ghost" title="View Decrypted Paper" onClick={() => handleViewPaper(p)}>
                        <FaEye className="text-info" />
                      </button>
                      {!isStaff && (
                        <button
                          className={`btn btn-sm btn-ghost ${p.is_locked ? 'text-success' : 'text-danger'}`}
                          title={p.is_locked ? 'Unlock Paper (Allow Student Access)' : 'Lock / Expire Paper (Block Student Access)'}
                          onClick={() => handleToggleStudentAccess(p)}
                        >
                          {p.is_locked ? <FaUnlock /> : <FaLock />}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        title={isStaff ? "Edit Paper Metadata (Title, Subject, Semester)" : "Edit Paper Details & Release Schedule"}
                        onClick={() => handleEditClick(p)}
                      >
                        <FaEdit className="text-secondary" />
                      </button>
                      {!isCoordinator && (
                        <button className="btn btn-sm btn-ghost" title="Cryptographic Security Keys" onClick={() => handleRevealKeys(p)}>
                          <FaKey className="text-warning" />
                        </button>
                      )}
                      {!isCoordinator && (
                        <button className="btn btn-sm btn-ghost" title="Student Access Trail Logs" onClick={() => handleRevealLogs(p)}>
                          <FaHistory className="text-primary" />
                        </button>
                      )}
                      {!isCoordinator && (
                        <button className="btn btn-sm btn-ghost text-danger" title="Delete Paper" onClick={() => handleDeletePaper(p.id)}>
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cryptographic Security Keys Reveal Modal */}
      <Modal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} title={`🔑 Exam Paper Security Encryption Keys (${selectedPaper?.course_code})`}>
        {selectedPaper && (
          <div>
            <div className="alert alert-warning mb-4" style={{ padding: '12px 16px' }}>
              <strong>🔐 CONFIDENTIAL CRYPTOGRAPHIC METADATA:</strong> Below is the AES-256 security key and initialization nonce used to encrypt this exam paper.
            </div>
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>Encryption Standard</label>
              <input type="text" className="form-control font-bold text-primary" readOnly value={`${selectedPaper.encryption_type || 'AES-256-GCM'} (Authenticated Galois/Counter Mode)`} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>🔑 Exam Security Key (Hex)</label>
              <input type="text" className="form-control font-mono" style={{ background: '#0f172a', color: '#38bdf8', fontWeight: 600 }} readOnly value={selectedPaper.encryption_key} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>🎲 Initialization Vector / Nonce (Hex)</label>
              <input type="text" className="form-control font-mono" style={{ background: '#0f172a', color: '#a7f3d0', fontWeight: 600 }} readOnly value={selectedPaper.encryption_nonce} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>🛡️ SHA-256 File Integrity Hash</label>
              <input type="text" className="form-control font-mono" style={{ fontSize: '12px' }} readOnly value={selectedPaper.file_hash} />
            </div>
          </div>
        )}
      </Modal>

      {/* Access Logs Modal */}
      <Modal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} title={`Student Access Register (${selectedPaper?.course_code} - ${selectedPaper?.title})`} size="lg">
        {selectedPaper && (
          <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>IP Address</th>
                  <th>Student Email</th>
                  <th>Student Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedPaper.access_logs?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted p-4">No student accesses recorded yet for this exam paper.</td>
                  </tr>
                ) : (
                  selectedPaper.access_logs?.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono">{new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}</td>
                      <td className="font-mono">{log.ip_address || '127.0.0.1'}</td>
                      <td className="font-semibold text-primary">{log.user_email}</td>
                      <td>{log.user_name}</td>
                      <td>
                        <span className="badge badge-success">
                          {log.action === 'decrypt_view' ? 'DECRYPT & VIEW' : log.action.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Edit Paper Details & Student Access Permission Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Exam Paper Details & Access Permission (${selectedPaper?.course_code})`}>
        {selectedPaper && (
          <form onSubmit={handleEditSubmit}>
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>Course Code</label>
              <input
                type="text"
                className="form-control font-bold"
                value={editFormData.course_code}
                onChange={(e) => setEditFormData({ ...editFormData, course_code: e.target.value.toUpperCase() })}
                placeholder="e.g. CSE-601"
                required
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Exam Paper Title</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.subject}
                onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                className="form-control"
                value={editFormData.semester}
                onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{ fontWeight: 700 }}>📄 Replace / Re-upload Question Paper PDF (Optional)</label>
              <input
                type="file"
                accept=".pdf"
                className="form-control"
                onChange={(e) => setEditFormData({ ...editFormData, new_file: e.target.files[0] })}
              />
              <small className="text-muted" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Current File: <strong>{selectedPaper.original_filename || 'exam_paper.pdf'}</strong> ({selectedPaper.size_mb || 0} MB). Select a new PDF file to re-encrypt and replace the exam paper for students.
              </small>
            </div>

            {isStaff ? (
              <div className="alert alert-info mb-3" style={{ padding: '12px 16px', fontSize: '12px' }}>
                ℹ️ <strong>ROLE PRIVILEGE NOTICE:</strong> Teaching Staff can upload exam papers and edit paper metadata (Title, Subject, Semester, Watermark). Exam release scheduling, date/time rescheduling, and student access release controls are managed exclusively by <strong>Exam Coordinators</strong>.
              </div>
            ) : (
              <>
                <div className="form-group mb-3">
                  <label className="form-label">🔒 Student Access Status Permission</label>
                  <select
                    className="form-control"
                    value={editFormData.is_locked ? 'locked' : 'released'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_locked: e.target.value === 'locked' })}
                    style={{ color: '#0f172a', fontWeight: 600 }}
                  >
                    <option value="released">🔓 Student Access Allowed (Released)</option>
                    <option value="locked">🔒 Student Access Blocked (Locked / Expired)</option>
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">📅 Exam Release Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editFormData.scheduled_release_time}
                    onChange={(e) => setEditFormData({ ...editFormData, scheduled_release_time: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-group mb-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="edit_watermark_check"
                checked={editFormData.watermark_enabled}
                onChange={(e) => setEditFormData({ ...editFormData, watermark_enabled: e.target.checked })}
              />
              <label htmlFor="edit_watermark_check" className="form-label" style={{ margin: 0 }}>
                Enable Anti-Leakage Dynamic Watermarking
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              Save Paper & Access Permission Changes
            </button>
          </form>
        )}
      </Modal>

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

export default ManagePapers;
