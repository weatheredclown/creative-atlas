import React, { useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { CubeIcon, GoogleIcon } from './Icons';

const mapFirebaseError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'The credentials you entered are incorrect. Please try again.';
      case 'auth/user-not-found':
        return 'No account found with that email address.';
      case 'auth/email-already-in-use':
        return 'That email is already registered. Try signing in instead.';
      case 'auth/weak-password':
        return 'Choose a stronger password (at least 6 characters).';
      case 'auth/popup-closed-by-user':
        return 'The Google sign-in popup was closed before completing the process.';
      default:
        return error.message ?? 'An unexpected authentication error occurred.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected authentication error occurred.';
};

const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleModeLabel = useMemo(() => mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in', [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, displayName });
      }
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl shadow-cyan-900/30 p-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <CubeIcon className="w-10 h-10 text-cyan-300" />
          <h1 className="text-2xl font-bold text-white">Creative Atlas</h1>
          <p className="text-sm text-slate-400 text-center">
            Sign {mode === 'login' ? 'in to continue your world-building adventure.' : 'up to start shaping your creative universe.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              autoComplete="email"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-display-name" className="block text-sm font-medium text-slate-300 mb-1">Display name</label>
              <input
                id="auth-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-900/40 border border-rose-700 text-rose-200 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pending}
          >
            {pending ? 'Processing…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pending}
          >
            <GoogleIcon className="w-4 h-4" />
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => setMode((current) => current === 'login' ? 'signup' : 'login')}
            className="text-cyan-300 hover:text-cyan-200 font-medium"
          >
            {toggleModeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const { loading: dataLoading } = useUserData();

  if (authLoading || (!isGuestMode && user && dataLoading) || (isGuestMode && dataLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-slate-300">
        <div className="flex items-center gap-3 mb-6">
          <CubeIcon className="w-10 h-10 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Creative Atlas</h1>
        </div>
        <div className="animate-pulse text-center space-y-2" role="status" aria-live="polite">
          <p className="text-sm">Loading your creative workspace…</p>
          <p className="text-xs text-slate-500">This should only take a moment.</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuestMode) {
    return <AuthScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;

