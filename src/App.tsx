import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import { AnimatePresence } from 'motion/react';

function AppRoutes() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handler = () => setShowSplash(true);
    window.addEventListener('rallyup:reload', handler);
    return () => window.removeEventListener('rallyup:reload', handler);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
      ) : (
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
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
