/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
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
  );
}
