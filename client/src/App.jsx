// src/App.jsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';

const Login = React.lazy(() => import('./pages/Login.jsx'));
const Register = React.lazy(() => import('./pages/Register.jsx'));
const Dashboard = React.lazy(() => import('./pages/Dashboard.jsx'));
const Incidents = React.lazy(() => import('./pages/Incidents.jsx'));
const IncidentDetail = React.lazy(() => import('./pages/IncidentDetail.jsx'));
const Releases = React.lazy(() => import('./pages/Releases.jsx'));
const ReleaseDetail = React.lazy(() => import('./pages/ReleaseDetail.jsx'));
const Admin = React.lazy(() => import('./pages/Admin.jsx'));
const NotFound = React.lazy(() => import('./pages/NotFound.jsx'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="state-panel"><Loader2 className="spin" size={20} />Loading your workspace…</div>;
  return user ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="state-panel"><Loader2 className="spin" size={20} />Loading page…</div>}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
            <Route path="/releases" element={<ProtectedRoute><Releases /></ProtectedRoute>} />
            <Route path="/releases/:id" element={<ProtectedRoute><ReleaseDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}
