import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { IntegrityPage } from './pages/IntegrityPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/evaluation/:sheetId" element={
        <ProtectedRoute><AppLayout><EvaluationPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/review-queue" element={
        <ProtectedRoute><AppLayout><ReviewQueuePage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/integrity/:sheetId?" element={
        <ProtectedRoute><AppLayout><IntegrityPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
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
