// ============================================
// QR ATTENDANCE SYSTEM - MAIN APP
// Aplicación principal con enrutamiento
// ============================================

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';

// Pages
import LoginPage from './pages/LoginPage';
import ProfesorPage from './pages/ProfesorPage';
import AlumnoPage from './pages/AlumnoPage';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'PROFESOR' | 'ALUMNO')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin" replace />;
      case 'PROFESOR':
        return <Navigate to="/profesor" replace />;
      case 'ALUMNO':
        return <Navigate to="/alumno" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

// Role-based Redirect
const RoleBasedRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'PROFESOR':
      return <Navigate to="/profesor" replace />;
    case 'ALUMNO':
      return <Navigate to="/alumno" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <RoleBasedRedirect /> : <LoginPage />
          }
        />

        {/* Protected Routes - Admin */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Profesor */}
        <Route
          path="/profesor/*"
          element={
            <ProtectedRoute allowedRoles={['PROFESOR', 'ADMIN']}>
              <ProfesorPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Alumno */}
        <Route
          path="/alumno/*"
          element={
            <ProtectedRoute allowedRoles={['ALUMNO']}>
              <AlumnoPage />
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-gray-400 mb-8">Página no encontrada</p>
                <a
                  href="/"
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                >
                  Volver al inicio
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
