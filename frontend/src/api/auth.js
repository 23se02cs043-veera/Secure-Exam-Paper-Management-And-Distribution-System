import client, { API_BASE } from './client';
import axios from 'axios';

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (email, password) => client.post('/auth/login', { email, password }),
  logout: () => client.post('/auth/logout'),
  getCurrentUser: () => client.get('/auth/me'),
  refreshToken: (refreshToken) =>
    axios.post(`${API_BASE}/auth/refresh`, null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  changePassword: (old_password, new_password) =>
    client.post('/users/change-password', { old_password, new_password }),
};
