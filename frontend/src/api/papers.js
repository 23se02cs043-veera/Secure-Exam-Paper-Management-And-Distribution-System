import client, { API_BASE } from './client';

export const papersAPI = {
  // Staff
  upload: (formData) => client.post('/staff/papers/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  listStaff: () => client.get('/staff/papers'),
  getStaff: (id) => client.get(`/staff/papers/${id}`),
  updateStaff: (id, data, config = {}) => client.patch(`/staff/papers/${id}`, data, config),
  replacePdf: (id, formData) => client.post(`/staff/papers/${id}/replace-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteStaff: (id) => client.delete(`/staff/papers/${id}`),
  staffDashboard: () => client.get('/staff/dashboard'),
  clearStaffAuditLogs: () => client.delete('/staff/audit-logs/clear'),

  // Coordinator
  listAll: () => client.get('/coordinator/papers'),
  scheduleRelease: (id, data) => client.post(`/coordinator/papers/${id}/schedule-release`, data),
  releaseNow: (id, data) => client.post(`/coordinator/papers/${id}/release-now`, data),
  lockPaper: (id, data) => client.patch(`/coordinator/papers/${id}/lock`, data),
  unlockPaper: (id, data) => client.patch(`/coordinator/papers/${id}/unlock`, data),
  cancelRelease: (releaseId) => client.delete(`/coordinator/releases/${releaseId}`),
  coordinatorDashboard: () => client.get('/coordinator/dashboard'),
  releasedPapers: () => client.get('/coordinator/papers/released'),

  // Student
  studentPapers: () => client.get('/student/papers'),
  studentDashboard: () => client.get('/student/dashboard'),
  viewPaper: (id) => `${API_BASE}/student/papers/${id}/view`,
  viewPaperBlob: (id) => client.get(`/student/papers/${id}/view`, { responseType: 'blob' }),
  studentExams: () => client.get('/student/exams'),
};
