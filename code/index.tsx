
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import './services/firebaseApp';
import { AuthProvider } from './contexts/AuthContext';
import { UserDataProvider } from './contexts/UserDataContext';
import AuthGate from './components/AuthGate';
import GitHubCallback from './components/GitHubCallback';
import TermsOfService from './pages/TermsOfService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserDataProvider>
    <AuthGate>{children}</AuthGate>
  </UserDataProvider>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/policies/terms" element={<TermsOfService />} />
          <Route
            path="/github/callback"
            element={(
              <Protected>
                <GitHubCallback />
              </Protected>
            )}
          />
          <Route
            path="/"
            element={(
              <Protected>
                <App />
              </Protected>
            )}
          />
        </Routes>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
