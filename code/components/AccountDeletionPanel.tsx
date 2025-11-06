import React, { useCallback, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../contexts/AuthContext';
import { useUserData } from '../contexts/UserDataContext';
import { Link } from 'react-router-dom';

const REQUIRED_PHRASE = 'DELETE MY CREATIVE ATLAS ACCOUNT';

const mapDeletionError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/requires-recent-login') {
      return 'Please sign in again and retry deleting your account to complete the process.';
    }
    return error.message ?? 'An unexpected authentication error occurred while removing your sign-in.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred while deleting your account.';
};

const AccountDeletionPanel: React.FC = () => {
  const { deleteAccount: deleteAuthAccount, signOutUser, isGuestMode } = useAuth();
  const { profile, deleteAccountData } = useUserData();
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const placeholder = useMemo(
    () => `Type "${REQUIRED_PHRASE}" to confirm`,
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!profile || isGuestMode) {
      return;
    }

    if (confirmation.trim().toUpperCase() !== REQUIRED_PHRASE) {
      setError('Please type the confirmation phrase exactly to proceed.');
      return;
    }

    setPending(true);
    setError(null);
    setStatus(null);

    const dataDeleted = await deleteAccountData();
    if (!dataDeleted) {
      setPending(false);
      setError('We could not remove your workspace data. Please try again later.');
      return;
    }

    try {
      await deleteAuthAccount();
      setStatus('Your Creative Atlas account has been deleted. Redirecting…');
      setTimeout(() => {
        void signOutUser();
        window.location.href = '/';
      }, 1200);
    } catch (authError) {
      const mapped = mapDeletionError(authError);
      setError(`Your workspace data was deleted, but we could not remove your sign-in: ${mapped}`);
      await signOutUser();
    } finally {
      setPending(false);
    }
  }, [
    confirmation,
    deleteAccountData,
    deleteAuthAccount,
    isGuestMode,
    profile,
    signOutUser,
  ]);

  if (!profile || isGuestMode) {
    return null;
  }

  return (
    <section className="rounded-lg border border-rose-800/70 bg-rose-950/50 p-4 shadow-inner shadow-rose-900/40">
      <h3 className="text-sm font-semibold text-rose-200">Delete account</h3>
      <p className="mt-2 text-xs text-rose-100/80">
        Deleting your account removes your profile, projects, artifacts, and any stored creative data. This action cannot be
        undone.
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-300">
        Confirmation phrase
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-rose-700 bg-rose-950/70 px-3 py-2 text-sm text-rose-100 placeholder:text-rose-500 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/70"
        aria-label="Type the confirmation phrase to delete your account"
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="mt-3 w-full rounded-md border border-rose-600 bg-rose-700/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Permanently delete my account'}
      </button>
      {error && (
        <p className="mt-3 text-xs text-rose-200" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="mt-3 text-xs text-cyan-200" role="status">
          {status}
        </p>
      )}
      <p className="mt-4 text-[10px] text-right text-rose-100/60">
        Seeking the dusty legal scroll?{' '}
        <Link
          to="/policies/terms"
          className="font-semibold text-rose-200/60 underline decoration-dotted underline-offset-2 transition hover:text-rose-200"
        >
          Whispering terms
        </Link>
        .
      </p>
    </section>
  );
};

export default AccountDeletionPanel;
