import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Vehicles } from './pages/Vehicles';
import { Reservations } from './pages/Reservations';
import { Units } from './pages/Units';
import { SettingsPage } from './pages/Settings';
import { Approvals } from './pages/Approvals';
import { MaintenancePage } from './pages/Maintenance';
import { WorkshopsPage } from './pages/Workshops';
import { FuelingPage } from './pages/Fueling';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">Carregando ControlFrota...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Role-based Route Component
const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

// Placeholder for other pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8">
    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-6">
      <div className="w-10 h-10 border-4 border-zinc-300 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
    <h1 className="text-2xl font-bold dark:text-white mb-2">{title}</h1>
    <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
      Este módulo está em desenvolvimento e estará disponível em breve com funcionalidades completas.
    </p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="approvals" element={
                <RoleRoute allowedRoles={['admin', 'manager']}>
                  <Approvals />
                </RoleRoute>
              } />
              <Route path="users" element={
                <RoleRoute allowedRoles={['admin', 'manager']}>
                  <Users />
                </RoleRoute>
              } />
              <Route path="units" element={
                <RoleRoute allowedRoles={['admin', 'manager']}>
                  <Units />
                </RoleRoute>
              } />
              <Route path="settings" element={
                <RoleRoute allowedRoles={['admin', 'manager']}>
                  <SettingsPage />
                </RoleRoute>
              } />
              <Route path="maintenance" element={
                <RoleRoute allowedRoles={['admin', 'manager', 'maintenance']}>
                  <MaintenancePage />
                </RoleRoute>
              } />
              <Route path="workshops" element={
                <RoleRoute allowedRoles={['admin', 'manager', 'maintenance']}>
                  <WorkshopsPage />
                </RoleRoute>
              } />
              <Route path="fuel" element={<FuelingPage />} />
              <Route path="fines" element={<PlaceholderPage title="Multas" />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
