import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { papersAPI } from '../../api/papers';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaFilePdf, FaTimes, FaCalendarAlt } from 'react-icons/fa';

function UploadPaper() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    semester: '1',
    course_code: '',
    encryption_type: 'aes256gcm',
    watermark_enabled: true,
    release_time: '',
    expiry_time: '',
    release_notes: '',
  });
  const [uploading, setUploading] = useState(false);

  const onDrop = (acceptedFiles) => {
    const pdf = acceptedFiles[0];
    if (pdf && pdf.type === 'application/pdf') {
      setFile(pdf);
    } else {
      toast.error('Only PDF documents are allowed.');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please drag or browse a PDF exam document to upload.');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    data.append('title', formData.title);
    data.append('subject', formData.subject);
    data.append('semester', formData.semester);
    data.append('course_code', formData.course_code);
    data.append('encryption_type', formData.encryption_type);
    data.append('watermark_enabled', formData.watermark_enabled.toString());
    if (formData.release_time) data.append('release_time', formData.release_time);
    if (formData.expiry_time) data.append('expiry_time', formData.expiry_time);
    if (formData.release_notes) data.append('release_notes', formData.release_notes);

    try {
      await papersAPI.upload(data);
      toast.success('Exam paper encrypted and uploaded successfully! 🔒');
      navigate('/staff/papers');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failure. Double check fields.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Secure Document Encryptor</h1>
        <p className="text-muted">Encrypt and host exam papers securely inside private storage paths</p>
      </div>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* File Drag and Drop */}
          <div className="form-group">
            <label className="form-label">Exam PDF Document</label>
            {file ? (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'var(--color-bg-secondary)',
                  border: '1.5px solid var(--color-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div className="flex items-center gap-3">
                  <FaFilePdf style={{ fontSize: '2rem', color: 'var(--color-danger)' }} />
                  <div>
                    <div className="font-semibold">{file.name}</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-icon btn-ghost text-danger"
                  onClick={() => setFile(null)}
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                style={{
                  padding: '40px 20px',
                  borderRadius: '12px',
                  border: '2px dashed var(--color-border)',
                  background: isDragActive ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <input {...getInputProps()} />
                <FaCloudUploadAlt style={{ fontSize: '3rem', color: 'var(--color-secondary)', marginBottom: '15px' }} />
                <h4>Drag & Drop Exam PDF Here</h4>
                <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>or click to browse local files (max 100MB)</p>
              </div>
            )}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Exam/Paper Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="Final Examination 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="Database Systems"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="CS-301"
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                className="form-control"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Cryptographic Algorithm</label>
              <select
                className="form-control"
                value={formData.encryption_type}
                onChange={(e) => setFormData({ ...formData, encryption_type: e.target.value })}
              >
                <option value="aes256gcm">AES-256-GCM (Authenticated)</option>
                <option value="aes256cbc">AES-256-CBC (Padded)</option>
                <option value="chacha20">ChaCha20-Poly1305 (Fast Stream)</option>
              </select>
            </div>

            <div className="form-group flex items-center gap-3" style={{ height: '100%', paddingTop: '28px' }}>
              <input
                type="checkbox"
                id="watermark_check"
                checked={formData.watermark_enabled}
                onChange={(e) => setFormData({ ...formData, watermark_enabled: e.target.checked })}
              />
              <label htmlFor="watermark_check" className="form-label" style={{ margin: 0 }}>Embed Anti-Leak Watermark</label>
            </div>
          </div>

          {/* Release Scheduling Section */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--color-border)' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCalendarAlt /> Schedule Exam Release Window (Optional)
            </h4>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Scheduled Release Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.release_time}
                  onChange={(e) => setFormData({ ...formData, release_time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.expiry_time}
                  onChange={(e) => setFormData({ ...formData, expiry_time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Release Instructions / Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. End-Semester Regular Examination Window"
                value={formData.release_notes}
                onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-full mt-4 ${uploading ? 'btn-loading' : ''}`}
            disabled={uploading}
          >
            Encrypt & Upload Document
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default UploadPaper;
