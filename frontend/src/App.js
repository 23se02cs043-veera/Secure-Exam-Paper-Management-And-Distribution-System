import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy-loaded pages
// Public pages
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const Features = lazy(() => import('./pages/public/Features'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const ManagePapers = lazy(() => import('./pages/staff/ManagePapers'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const SecurityCenter = lazy(() => import('./pages/admin/SecurityCenter'));
const Reports = lazy(() => import('./pages/admin/Reports'));

// Staff pages
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const UploadPaper = lazy(() => import('./pages/staff/UploadPaper'));

// Coordinator pages
const CoordinatorDashboard = lazy(() => import('./pages/coordinator/CoordinatorDashboard'));
const ReleasedPapers = lazy(() => import('./pages/coordinator/ReleasedPapers'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const ExamPapers = lazy(() => import('./pages/student/ExamPapers'));

// NotFound
const NotFound = lazy(() => import('./pages/public/NotFound'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner fullscreen />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/features" element={<Features />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="papers" element={<ManagePapers />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="security" element={<SecurityCenter />} />
                <Route path="reports" element={<Reports />} />
              </Route>

              {/* Staff routes */}
              <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff', 'super_admin']} />}>
                <Route index element={<StaffDashboard />} />
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="upload" element={<UploadPaper />} />
                <Route path="papers" element={<ManagePapers />} />
              </Route>

              {/* Coordinator routes */}
              <Route path="/coordinator" element={<ProtectedRoute allowedRoles={['coordinator', 'super_admin']} />}>
                <Route index element={<CoordinatorDashboard />} />
                <Route path="dashboard" element={<CoordinatorDashboard />} />
                <Route path="papers" element={<ManagePapers />} />
                <Route path="released" element={<ReleasedPapers />} />
              </Route>

              {/* Student routes */}
              <Route path="/student" element={<ProtectedRoute allowedRoles={['student', 'super_admin']} />}>
                <Route index element={<StudentDashboard />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="papers" element={<ExamPapers />} />
              </Route>

              {/* Role-based dashboard redirect */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Redirect /dashboard to the user's role-specific dashboard
function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullscreen />;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'staff':
      return <Navigate to="/staff/dashboard" replace />;
    case 'coordinator':
      return <Navigate to="/coordinator/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
