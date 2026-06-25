/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dashboard from './components/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    </AuthProvider>
  );
}
