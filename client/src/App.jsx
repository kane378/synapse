// FILE: client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage            from './pages/LoginPage';
import RegisterPage         from './pages/RegisterPage';
import AgentRegisterPage    from './pages/AgentRegisterPage';
import DashboardPage        from './pages/DashboardPage';
import InventoryPage        from './pages/InventoryPage';
import TransfersPage        from './pages/TransfersPage';
import WasteAlertsPage      from './pages/WasteAlertsPage';
import HospitalsPage        from './pages/HospitalsPage';
import DeliveriesPage       from './pages/DeliveriesPage';
import MapPage              from './pages/MapPage';
import AgentDeliveryPage    from './pages/AgentDeliveryPage';
import AgentsPage           from './pages/AgentsPage';
import AgentDashboardPage   from './pages/AgentDashboardPage';
import Layout               from './components/layout/Layout';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-synapse-bg">
      <div className="text-synapse-accent animate-pulse font-mono text-sm">INITIALIZING SYNAPSE...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"              element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"           element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/register-agent"     element={<PublicRoute><AgentRegisterPage /></PublicRoute>} />

      {/* PUBLIC — Agent delivery page — no login needed */}
      <Route path="/agent/:token"       element={<AgentDeliveryPage />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"         element={<DashboardPage />} />
        <Route path="inventory"         element={<InventoryPage />} />
        <Route path="transfers"         element={<TransfersPage />} />
        <Route path="deliveries"        element={<DeliveriesPage />} />
        <Route path="waste-alerts"      element={<WasteAlertsPage />} />
        <Route path="map"               element={<MapPage />} />
        {/* SuperAdmin only */}
        <Route path="hospitals"         element={<ProtectedRoute requiredRole="SuperAdmin"><HospitalsPage /></ProtectedRoute>} />
        <Route path="agents"            element={<ProtectedRoute requiredRole="SuperAdmin"><AgentsPage /></ProtectedRoute>} />
        {/* DeliveryAgent only */}
        <Route path="my-deliveries"     element={<ProtectedRoute requiredRole="DeliveryAgent"><AgentDashboardPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
