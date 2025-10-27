import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthSession, UserAccount } from '../types';
import {
  authenticateUser,
  bootstrapDemoAccount,
  createSession,
  getUserBySessionToken,
  invalidateSession,
  registerUser,
} from '../services/authService';

const SESSION_STORAGE_KEY = 'creative-atlas:session-token';

type AuthMode = 'login' | 'register';

interface AuthContextValue {
  user: UserAccount | null;
  session: AuthSession | null;
  isLoading: boolean;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read session token from storage', error);
    return null;
  }
};

const persistToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist session token', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  useEffect(() => {
    const bootstrap = async () => {
      await bootstrapDemoAccount();
      const storedToken = readStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      const existingUser = await getUserBySessionToken(storedToken);
      if (!existingUser) {
        persistToken(null);
        setIsLoading(false);
        return;
      }
      setUser(existingUser);
      setSession({
        token: storedToken,
        userId: existingUser.id,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      });
      setIsLoading(false);
    };

    void bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: nextUser, session: newSession } = await authenticateUser(email, password);
      setUser(nextUser);
      setSession(newSession);
      persistToken(newSession.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const account = await registerUser(email, password, displayName);
      const newSession = await createSession(account.id);
      setUser(account);
      setSession(newSession);
      persistToken(newSession.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      await invalidateSession(session.token);
    }
    setUser(null);
    setSession(null);
    persistToken(null);
  }, [session?.token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    isLoading,
    authMode,
    setAuthMode,
    login,
    register,
    logout,
  }), [authMode, isLoading, login, logout, register, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
