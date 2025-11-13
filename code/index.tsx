
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import './services/firebaseApp';
import { AuthProvider } from './contexts/AuthContext';
import { UserDataProvider } from './contexts/UserDataContext';
import { ToastProvider } from './contexts/ToastContext';
import AuthGate from './components/AuthGate';
import GitHubCallback from './components/GitHubCallback';
import TermsOfService from './pages/TermsOfService';
import SharedProjectPage from './pages/SharedProjectPage';
import AdminTimelineHeatmapPublisher from './pages/AdminTimelineHeatmapPublisher';

const MissingApiBaseUrlMessage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 text-center">
    <h1 className="text-3xl font-semibold">Configuration error</h1>
    <p className="mt-4 max-w-xl text-lg">
      Creative Atlas can't load because the <code>VITE_API_BASE_URL</code> environment variable is missing. Update the deployment
      configuration and redeploy the site.
    </p>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserDataProvider>
    <AuthGate>{children}</AuthGate>
  </UserDataProvider>
);

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const shouldBlockRender = import.meta.env.PROD && !apiBaseUrl;

if (shouldBlockRender) {
  console.error('Creative Atlas failed to load: VITE_API_BASE_URL is missing.');
}

const root = ReactDOM.createRoot(rootElement);

if (shouldBlockRender) {
  root.render(<MissingApiBaseUrlMessage />);
} else {
  root.render(
    <React.StrictMode>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <Routes>
            <Route path="/policies/terms" element={<TermsOfService />} />
            <Route path="/share/:shareId" element={<SharedProjectPage />} />
            <Route
              path="/github/callback"
              element={(
                <Protected>
                  <GitHubCallback />
                </Protected>
              )}
            />
            <Route
              path="/admin/timeline-heatmap"
              element={(
                <Protected>
                  <AdminTimelineHeatmapPublisher />
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
      </ToastProvider>
    </React.StrictMode>
  );
}
