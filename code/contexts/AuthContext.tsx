import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { browserLocalPersistence, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, User } from 'firebase/auth';
import '../services/firebaseApp';

interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
}

interface SignInParams {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isGuestMode: boolean;
  signUp: (params: SignUpParams) => Promise<void>;
  signIn: (params: SignInParams) => Promise<void>;
  signOutUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const detectGuestMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('guest') === '1';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode] = useState(() => detectGuestMode());

  useEffect(() => {
    if (isGuestMode) {
      setUser(null);
      setLoading(false);
      return;
    }

    const auth = getAuth();
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to enable auth persistence', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isGuestMode]);

  const signUp = useCallback(async ({ email, password, displayName }: SignUpParams) => {
    if (isGuestMode) {
      throw new Error('Guest mode does not support account creation.');
    }
    const auth = getAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName });
    }
  }, [isGuestMode]);

  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    if (isGuestMode) {
      throw new Error('Guest mode does not support authentication.');
    }
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }, [isGuestMode]);

  const signOutUser = useCallback(async () => {
    if (isGuestMode) {
      return Promise.resolve();
    }
    const auth = getAuth();
    await signOut(auth);
  }, [isGuestMode]);

  const signInWithGoogleProvider = useCallback(async () => {
    if (isGuestMode) {
      throw new Error('Guest mode does not support authentication.');
    }
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, [isGuestMode]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (isGuestMode) {
      return Promise.resolve();
    }
    if (!user) return;
    await updateProfile(user, { displayName });
  }, [user, isGuestMode]);

  const getIdToken = useCallback(async () => {
    if (!user) {
      return null;
    }
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Failed to retrieve ID token', error);
      return null;
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (isGuestMode) {
      return Promise.resolve();
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user is available to delete.');
    }

    await currentUser.delete();
  }, [isGuestMode]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isGuestMode,
    signUp,
    signIn,
    signOutUser,
    signInWithGoogle: signInWithGoogleProvider,
    updateDisplayName,
    getIdToken,
    deleteAccount,
  }), [user, loading, isGuestMode, signUp, signIn, signOutUser, signInWithGoogleProvider, updateDisplayName, getIdToken, deleteAccount]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

