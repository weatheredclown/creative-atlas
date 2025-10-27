import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthPanel: React.FC = () => {
  const { authMode, setAuthMode, login, register, isLoading } = useAuth();
  const [email, setEmail] = useState('demo@creative-atlas.app');
  const [password, setPassword] = useState('demo-pass-1234');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Display name is required');
          return;
        }
        await register(displayName.trim(), email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Creative Atlas</h1>
          <p className="text-sm text-slate-400">Sign in to access your worlds and artifacts.</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <button
            className={`px-3 py-1 rounded-md border ${authMode === 'login' ? 'border-cyan-400 text-cyan-200' : 'border-transparent hover:border-slate-700'}`}
            onClick={() => setAuthMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`px-3 py-1 rounded-md border ${authMode === 'register' ? 'border-cyan-400 text-cyan-200' : 'border-transparent hover:border-slate-700'}`}
            onClick={() => setAuthMode('register')}
            type="button"
          >
            Register
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your creator identity"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center">
          Demo credentials prefill the form. Register to create a dedicated workspace.
        </p>
      </div>
    </div>
  );
};

export default AuthPanel;
