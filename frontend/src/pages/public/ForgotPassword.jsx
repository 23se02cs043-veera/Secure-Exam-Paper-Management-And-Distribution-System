import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link dispatched! Please check your inbox.');
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-panel-left">
          <Link to="/" className="auth-panel-brand">
            <div className="auth-panel-brand-icon">SE</div>
            <span className="auth-panel-brand-name">Secure<span>Exam</span></span>
          </Link>
          <h2 className="auth-panel-title">
            Recover <span className="highlight">Access.</span>
          </h2>
          <p className="auth-panel-desc">
            Provide your registered institution email. If verified, we will send password recovery instructions.
          </p>
        </div>

        <div className="auth-panel-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <div className="auth-card-icon"><FaLock /></div>
              <h3 className="auth-card-title">Reset Password</h3>
              <p className="auth-card-subtitle">Regain entry to the exam portal</p>
            </div>

            {submitted ? (
              <div className="text-center">
                <div className="alert alert-success">
                  If that email exists, a password reset link has been dispatched to your mailbox.
                </div>
                <Link to="/login" className="btn btn-primary mt-4 btn-full">
                  <FaArrowLeft /> Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Institution Email</label>
                  <div className="input-group">
                    <span className="input-group-icon"><FaEnvelope /></span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="user@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  Send Reset Link
                </button>

                <div className="auth-footer" style={{ marginTop: '20px' }}>
                  <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <FaArrowLeft /> Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
