import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './layouts/Navbar';
import { Footer } from './layouts/Footer';
import { Home } from './pages/Home';
import { ReportWaste } from './pages/ReportWaste';
import { ExploreMap } from './pages/ExploreMap';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { AdminPortal } from './pages/AdminPortal';
import { WorkerPortal } from './pages/WorkerPortal';
import { Login } from './pages/Login';
import { LegacyImportModal } from './components/LegacyImportModal';

const queryClient = new QueryClient();

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-indigo-400 font-mono animate-pulse">
        Checking authentication session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function MainLayout() {
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e1a] text-slate-100 font-sans">
      <Navbar onOpenMigration={() => setShowMigrationModal(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportWaste />} />
          <Route path="/map" element={<ExploreMap />} />
          <Route
            path="/my-reports"
            element={
              <ProtectedRoute>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker"
            element={
              <ProtectedRoute requiredRole="worker">
                <WorkerPortal />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      <LegacyImportModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onImportComplete={() => {
          localStorage.removeItem('cleantrack_reports');
          window.location.reload();
        }}
      />
    </div>
  );
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <MainLayout />
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
