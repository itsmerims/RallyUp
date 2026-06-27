import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handler = () => setShowSplash(true);
    window.addEventListener('rallyup:reload', handler);
    return () => window.removeEventListener('rallyup:reload', handler);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          !user ? <LandingPage /> : <Navigate to="/dashboard" replace />
        }
      />
      <Route path="/signin" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
