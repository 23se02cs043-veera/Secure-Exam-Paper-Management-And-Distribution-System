import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { usersAPI } from '../../api/users';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { FaUserPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'staff'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    enrollment_number: '',
    course: '',
    role: 'student',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.adminList();
      setUsers(res.data.users);
    } catch {
      toast.error('Failed to retrieve user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.adminCreate(formData);
      toast.success('User account added successfully!');
      setShowAddModal(false);
      setFormData({ email: '', password: '', full_name: '', phone: '', enrollment_number: '', course: '', role: 'student' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleEditClick = (user) => {
    setCurrentUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      enrollment_number: user.enrollment_number || '',
      course: user.course || '',
      role: user.role,
      is_active: user.is_active,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.adminUpdate(currentUser.id, formData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to edit account profile');
    }
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user profile? This cannot be undone.')) return;
    try {
      await usersAPI.adminDelete(id);
      toast.success('User account permanently deleted successfully!');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const studentUsers = users.filter(u => u.role === 'student');
  const staffUsers = users.filter(u => u.role !== 'student');

  return (
    <DashboardLayout>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>User Account Management</h1>
          <p className="text-muted">Register, edit, and audit system users</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({ email: '', password: '', full_name: '', phone: '', enrollment_number: '', course: '', role: activeTab === 'students' ? 'student' : 'staff' });
          setShowAddModal(true);
        }}>
          <FaUserPlus /> Add New Account
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'students' ? '#2563eb' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'students' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎓 Student Accounts ({studentUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'staff' ? '#2563eb' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'staff' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          👨‍🏫 Staff, Coordinators & Admins ({staffUsers.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center p-4">Fetching account files...</div>
      ) : activeTab === 'students' ? (
        /* STUDENTS TABLE */
        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Enrollment Number</th>
                <th>Course / Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-4 text-muted">No student accounts registered yet.</td>
                </tr>
              ) : (
                studentUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || 'N/A'}</td>
                    <td>{u.enrollment_number || 'N/A'}</td>
                    <td>
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {u.course || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success"><FaCheck /> Active</span>
                      ) : (
                        <span className="badge badge-danger"><FaTimes /> Deactive</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(u)}>
                          <FaEdit />
                        </button>
                        <button className="btn btn-sm btn-ghost text-danger" title="Delete Profile" onClick={() => handleDeleteClick(u.id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* STAFF / COORDINATOR / ADMIN TABLE */
        <div className="table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>System Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-muted">No staff or administrative accounts registered yet.</td>
                </tr>
              ) : (
                staffUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || 'N/A'}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'super_admin' ? 'badge-danger' : u.role === 'coordinator' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {u.role === 'super_admin' ? 'Admin' : u.role === 'coordinator' ? 'Exam Coordinator' : 'Teaching Staff'}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-success"><FaCheck /> Active</span>
                      ) : (
                        <span className="badge badge-danger"><FaTimes /> Deactive</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(u)}>
                          <FaEdit />
                        </button>
                        <button className="btn btn-sm btn-ghost text-danger" title="Delete Profile" onClick={() => handleDeleteClick(u.id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create User Profile">
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role Privilege</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="staff">Teaching Staff</option>
              <option value="coordinator">Exam Coordinator</option>
              <option value="super_admin">Admin</option>
            </select>
          </div>

          {formData.role === 'student' && (
            <>
              <div className="form-group">
                <label className="form-label">Enrollment Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 2026-CSE-001"
                  value={formData.enrollment_number}
                  onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Course / Branch</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. B.Tech Computer Science"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">Create Account</button>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update User Profile">
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role Privilege</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="staff">Teaching Staff</option>
              <option value="coordinator">Exam Coordinator</option>
              <option value="super_admin">Admin</option>
            </select>
          </div>

          {formData.role === 'student' && (
            <>
              <div className="form-group">
                <label className="form-label">Enrollment Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 2026-CSE-001"
                  value={formData.enrollment_number}
                  onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Course / Branch</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. B.Tech Computer Science"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">New Password (Leave blank to keep current)</label>
            <input
              type="password"
              className="form-control"
              placeholder="New Password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="form-group flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active_check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <label htmlFor="is_active_check" className="form-label" style={{ margin: 0 }}>Account Active Status</label>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4">Save Changes</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export default UserManagement;
