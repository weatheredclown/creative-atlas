
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './services/firebaseApp';
import { AuthProvider } from './contexts/AuthContext';
import { UserDataProvider } from './contexts/UserDataContext';
import AuthGate from './components/AuthGate';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <UserDataProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </UserDataProvider>
    </AuthProvider>
  </React.StrictMode>
);
