import React, { Component, useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

class ErrorBoundary extends Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-black text-red-500 mb-4">Something went wrong</h1>
            <pre className="text-sm text-slate-400 bg-slate-900 rounded-xl p-4 text-left overflow-auto max-h-60 mb-4 font-mono">
              {this.state.error.message}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-500 text-[#ffffff] font-bold rounded-xl"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handler = () => setShowSplash(true);
    window.addEventListener('rallyup:reload', handler);
    return () => window.removeEventListener('rallyup:reload', handler);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AnimatePresence mode="wait">
          {showSplash ? (
            <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
          ) : (
            <AuthGuard key="app">
              <Dashboard />
            </AuthGuard>
          )}
        </AnimatePresence>
      </AuthProvider>
    </ErrorBoundary>
  );
}
