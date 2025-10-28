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
  signUp: (params: SignUpParams) => Promise<void>;
  signIn: (params: SignInParams) => Promise<void>;
  signOutUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to enable auth persistence', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async ({ email, password, displayName }: SignUpParams) => {
    const auth = getAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName });
    }
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getAuth();
    await signOut(auth);
  }, []);

  const signInWithGoogleProvider = useCallback(async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!user) return;
    await updateProfile(user, { displayName });
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOutUser,
    signInWithGoogle: signInWithGoogleProvider,
    updateDisplayName,
  }), [user, loading, signUp, signIn, signOutUser, signInWithGoogleProvider, updateDisplayName]);

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

