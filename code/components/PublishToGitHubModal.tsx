import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { GitHubIcon, Spinner } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchGitHubRepositories,
  type GitHubRepositorySummary,
} from '../services/dataApi';

export interface PublishSuccessInfo {
  message: string;
  pagesUrl: string;
  branchUrl: string;
  branchDirectory: string | null;
}

export type GitHubAuthStatus = 'idle' | 'authorizing' | 'authorized' | 'error';

interface PublishToGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (repoName: string, publishDir: string) => Promise<void>;
  isPublishing: boolean;
  errorMessage?: string | null;
  successInfo?: PublishSuccessInfo | null;
  onResetStatus: () => void;
  authStatus: GitHubAuthStatus;
  statusMessage?: string | null;
}

const DEFAULT_FETCH_ERROR_MESSAGE =
  'Unable to load your GitHub repositories. Enter a new repository name to continue.';

const PublishToGitHubModal: React.FC<PublishToGitHubModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  isPublishing,
  errorMessage,
  successInfo,
  onResetStatus,
  authStatus,
  statusMessage,
}) => {
  const [repoName, setRepoName] = useState('');
  const [publishDir, setPublishDir] = useState('');
  const [repos, setRepos] = useState<GitHubRepositorySummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [showNewRepoInput, setShowNewRepoInput] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoFetchError, setRepoFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { getIdToken } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setRepoName('');
      setPublishDir('');
      setRepos([]);
      setSelectedRepo('');
      setShowNewRepoInput(false);
      setIsLoadingRepos(false);
      setRepoFetchError(null);
      setFormError(null);
      return;
    }

    if (authStatus !== 'authorized') {
      setIsLoadingRepos(false);
      setRepoFetchError(null);
      setFormError(null);
      setRepos([]);
      setSelectedRepo('');
      setShowNewRepoInput(false);
    }
  }, [authStatus, isOpen]);

  useEffect(() => {
    if (!isOpen || authStatus !== 'authorized') {
      return;
    }

    onResetStatus();
    let isCancelled = false;

    const loadRepos = async () => {
      setIsLoadingRepos(true);
      setRepoFetchError(null);
      setFormError(null);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate with GitHub. Please sign in again.');
        }

        const data = await fetchGitHubRepositories(token);
        if (isCancelled) {
          return;
        }

        setRepos(data);
        if (data.length > 0) {
          setSelectedRepo(data[0].fullName);
          setShowNewRepoInput(false);
        } else {
          setSelectedRepo('');
          setShowNewRepoInput(true);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }
        const message =
          error instanceof Error && error.message
            ? error.message
            : DEFAULT_FETCH_ERROR_MESSAGE;
        setRepoFetchError(message);
        setRepos([]);
        setSelectedRepo('');
        setShowNewRepoInput(true);
      } finally {
        if (!isCancelled) {
          setIsLoadingRepos(false);
        }
      }
    };

    void loadRepos();

    return () => {
      isCancelled = true;
    };
  }, [authStatus, getIdToken, isOpen, onResetStatus]);

  const handleRepoSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onResetStatus();
    setFormError(null);

    if (value === 'new') {
      setShowNewRepoInput(true);
      setSelectedRepo('');
    } else {
      setShowNewRepoInput(false);
      setSelectedRepo(value);
      setRepoName('');
    }
  };

  const handleRepoNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRepoName(event.target.value);
    setFormError(null);
    onResetStatus();
  };

  const handlePublishDirChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPublishDir(event.target.value);
    setFormError(null);
    onResetStatus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLoadingRepos) {
      setFormError('Repositories are still loading. Please wait a moment and try again.');
      return;
    }

    const trimmedRepo = showNewRepoInput ? repoName.trim() : selectedRepo;

    if (!trimmedRepo) {
      setFormError('Select an existing repository or enter a new repository name.');
      return;
    }

    setFormError(null);
    onResetStatus();

    const normalizedPublishDir = publishDir.trim();

    try {
      await onPublish(trimmedRepo, normalizedPublishDir);
    } catch (publishError) {
      const fallbackMessage =
        publishError instanceof Error
          ? publishError.message
          : 'An unexpected error occurred while publishing to GitHub.';
      setFormError(fallbackMessage);
    }
  };

  const disableSubmit =
    isPublishing ||
    isLoadingRepos ||
    authStatus !== 'authorized' ||
    (showNewRepoInput ? repoName.trim().length === 0 : selectedRepo.length === 0);

  const statusVariantClasses =
    authStatus === 'error'
      ? 'border-red-500/40 bg-red-500/10 text-red-200'
      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish to GitHub">
      <form onSubmit={handleSubmit}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <GitHubIcon className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Publish Project to GitHub</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Choose a GitHub repository to publish your project to as a GitHub Pages site.
          </p>

          <select
            value={showNewRepoInput ? 'new' : selectedRepo}
            onChange={handleRepoSelection}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            disabled={
              isLoadingRepos ||
              isPublishing ||
              repos.length === 0 ||
              authStatus !== 'authorized'
            }
          >
            {repos.map((repo) => (
              <option key={repo.fullName} value={repo.fullName}>
                {repo.name}
              </option>
            ))}
            <option value="new">Create a new repository</option>
          </select>

          {showNewRepoInput && (
            <input
              type="text"
              value={repoName}
              onChange={handleRepoNameChange}
              placeholder="e.g., my-awesome-project"
              className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
              disabled={isPublishing || authStatus !== 'authorized'}
              required
            />
          )}

          <label htmlFor="publish-dir" className="text-sm text-slate-400 mt-4 block">
            Publish Directory (optional)
          </label>
          <p className="text-xs text-slate-500 mb-1">
            Leave blank to publish from the site root, or enter <code>docs</code> to publish from a docs/
            folder.
          </p>
          <input
            id="publish-dir"
            type="text"
            value={publishDir}
            onChange={handlePublishDirChange}
            placeholder="e.g., docs"
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            disabled={isPublishing || authStatus !== 'authorized'}
          />

          {statusMessage && (
            <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${statusVariantClasses}`}>
              {statusMessage}
            </div>
          )}

          {isLoadingRepos && (
            <p className="mt-3 text-sm text-slate-400">Loading repositories…</p>
          )}

          {repoFetchError && (
            <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {repoFetchError}
            </div>
          )}

          {formError && !errorMessage && (
            <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {successInfo && (
            <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <p>{successInfo.message}</p>
              <p className="mt-2">
                Your site will be available at{' '}
                <a
                  href={successInfo.pagesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-100 underline hover:text-white"
                >
                  {successInfo.pagesUrl}
                </a>
                .
              </p>
              <p className="mt-1">
                <a
                  href={successInfo.branchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-100 underline hover:text-white"
                >
                  Browse{' '}
                  {successInfo.branchDirectory
                    ? `gh-pages/${successInfo.branchDirectory}`
                    : 'gh-pages'}{' '}
                  on GitHub
                </a>
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-4 bg-slate-800/50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors disabled:bg-slate-600 disabled:text-slate-300 disabled:cursor-not-allowed"
            disabled={disableSubmit}
          >
            {isPublishing && <Spinner className="w-4 h-4 text-cyan-200" />}
            {isPublishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PublishToGitHubModal;
