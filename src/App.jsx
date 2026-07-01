import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ResumeEditor from './pages/ResumeEditor';
import PaymentPage from './pages/PaymentPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminPayments from './pages/AdminPayments';
import SupportPage from './pages/SupportPage';
import AdminSupportPage from './pages/AdminSupportPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCouponsPage from './pages/AdminCouponsPage';
import MyResumesPage from './pages/MyResumesPage';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function PublicOnlyRoute({ children }) {
  const { currentUser, loading, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (currentUser) {
    return <Navigate to={isAdmin() ? "/admin" : "/dashboard"} replace />;
  }
  
  return children;
}

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
        } />
        <Route path="/register" element={
          <PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/resumes" element={
          <ProtectedRoute><MyResumesPage /></ProtectedRoute>
        } />
        <Route path="/editor" element={
          <ProtectedRoute><ResumeEditor /></ProtectedRoute>
        } />
        <Route path="/payment" element={
          <ProtectedRoute><PaymentPage /></ProtectedRoute>
        } />
        <Route path="/support" element={
          <ProtectedRoute><SupportPage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/payments" element={
          <ProtectedRoute><AdminPayments /></ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute><AdminSupportPage /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute><AdminUsersPage /></ProtectedRoute>
        } />
        <Route path="/admin/coupons" element={
          <ProtectedRoute><AdminCouponsPage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
