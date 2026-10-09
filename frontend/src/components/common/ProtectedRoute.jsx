import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const roleRoutes = {
      super_admin: '/admin/dashboard',
      staff: '/staff/dashboard',
      coordinator: '/coordinator/dashboard',
      student: '/student/dashboard',
    };
    return <Navigate to={roleRoutes[user?.role] || '/login'} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
