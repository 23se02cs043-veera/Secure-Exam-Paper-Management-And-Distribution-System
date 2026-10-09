import client from './client';

export const usersAPI = {
  getProfile: () => client.get('/users/profile'),
  updateProfile: (data) => client.patch('/users/profile', data),

  // Admin
  adminList: (params) => client.get('/admin/users', { params }),
  adminCreate: (data) => client.post('/admin/users', data),
  adminGet: (id) => client.get(`/admin/users/${id}`),
  adminUpdate: (id, data) => client.patch(`/admin/users/${id}`, data),
  adminDelete: (id) => client.delete(`/admin/users/${id}`),
  adminDashboard: () => client.get('/admin/dashboard'),
  auditLogs: (params) => client.get('/admin/audit-logs', { params }),
  clearAuditLogs: () => client.delete('/admin/audit-logs/clear'),
  securityAlerts: (params) => client.get('/admin/security-alerts', { params }),
  resolveAlert: (id) => client.patch(`/admin/security-alerts/${id}/resolve`),
  clearSecurityAlerts: () => client.delete('/admin/security-alerts/clear'),
  panicLockStatus: () => client.get('/users/panic-lock/status'),
  activatePanicLock: (data) => client.post('/admin/security/panic-lock', data),
  deactivatePanicLock: () => client.delete('/admin/security/panic-lock'),
  reportsOverview: () => client.get('/admin/reports/overview'),
  securityOverview: () => client.get('/admin/security'),

  // Notifications
  getNotifications: () => client.get('/notifications'),
  markRead: (id) => client.patch(`/notifications/${id}/read`),
  markAllRead: () => client.patch('/notifications/read-all'),
  deleteNotification: (id) => client.delete(`/notifications/${id}`),
  unreadCount: () => client.get('/notifications/unread-count'),
};
