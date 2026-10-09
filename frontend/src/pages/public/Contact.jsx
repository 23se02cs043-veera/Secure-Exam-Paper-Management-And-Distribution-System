import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { FaSun, FaMoon, FaArrowLeft, FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';

function Contact() {
  const { isDark, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormData({ name: '', email: '', message: '' });
      toast.success('Your message has been submitted. We will contact you shortly!');
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-hero)', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <header className="navbar-public">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">SE</div>
          <span className="navbar-brand-text">Secure<span className="navbar-brand-accent">Exam</span></span>
        </Link>
        <div className="navbar-actions">
          <Link to="/" className="navbar-nav-link"><FaArrowLeft /> Back Home</Link>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '120px 20px 60px' }}>
        <div className="container fade-in">
          <h2 className="text-center" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '40px', color: 'var(--color-accent)' }}>
            Get In Touch
          </h2>
          <div className="grid grid-2" style={{ gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Info Cards */}
            <div className="flex flex-col gap-4 justify-center">
              <div className="card-glass p-6">
                <h4 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><FaEnvelope className="text-accent" /> Email</h4>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>support@universityexam.edu</p>
              </div>
              <div className="card-glass p-6">
                <h4 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><FaPhone className="text-accent" /> Phone</h4>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>+91 (080) 2345-6789</p>
              </div>
              <div className="card-glass p-6">
                <h4 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}><FaMapMarkerAlt className="text-accent" /> Address</h4>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Examination Bhavan, University Campus, Bangalore 560001</p>
              </div>
            </div>

            {/* Form */}
            <div className="card-glass p-8">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'white' }}>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'white' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="user@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'white' }}>Message</label>
                  <textarea
                    rows="4"
                    className="form-control"
                    placeholder="Describe query..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className={`btn btn-accent btn-full ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                  Submit Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Contact;
