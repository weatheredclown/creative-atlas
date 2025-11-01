
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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <UserDataProvider>
          <AuthGate>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/github/callback" element={<GitHubCallback />} />
            </Routes>
          </AuthGate>
        </UserDataProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
