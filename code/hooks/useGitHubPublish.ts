import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { Artifact, Project } from '../types';
import type { GitHubAuthStatus, PublishSuccessInfo } from '../components/PublishToGitHubModal';
import type { ProjectPublishRecord } from '../utils/publishHistory';
import { createProjectStaticSiteFiles } from '../utils/export';
import {
  checkGitHubAuthorization,
  publishToGitHub,
  startGitHubOAuth,
  dataApiBaseUrl,
  isDataApiConfigured,
} from '../services/dataApi';

interface UseGitHubPublishParams {
  getIdToken: () => Promise<string | null>;
  selectedProject: Project | null;
  projectArtifacts: Artifact[];
  setProjectPublishHistory: Dispatch<SetStateAction<Record<string, ProjectPublishRecord>>>;
  githubAuthSuccessMessage: string;
  isGuestMode: boolean;
}

interface UseGitHubPublishResult {
  isModalOpen: boolean;
  authStatus: GitHubAuthStatus;
  statusMessage: string | null;
  isPublishing: boolean;
  error: string | null;
  success: PublishSuccessInfo | null;
  openModal: (status?: GitHubAuthStatus, message?: string | null) => void;
  closeModal: () => void;
  resetStatus: () => void;
  startAuthorization: () => Promise<void>;
  publishToRepository: (repoName: string, publishDir: string) => Promise<void>;
}

const AUTHORIZING_MESSAGE = 'Authorizing with GitHub. Complete the pop-up window to continue.';
const DATA_API_DISABLED_MESSAGE = 'Publishing to GitHub is unavailable because the data API is not configured.';

export function useGitHubPublish({
  getIdToken,
  selectedProject,
  projectArtifacts,
  setProjectPublishHistory,
  githubAuthSuccessMessage,
  isGuestMode,
}: UseGitHubPublishParams): UseGitHubPublishResult {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<GitHubAuthStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PublishSuccessInfo | null>(null);

  const githubOAuthPopupRef = useRef<Window | null>(null);
  const githubOAuthMonitorRef = useRef<number | null>(null);
  const githubAuthStatusRef = useRef<GitHubAuthStatus>('idle');

  const dataApiEnabled = useMemo(() => isDataApiConfigured && !isGuestMode, [isGuestMode]);

  const clearGithubOAuthMonitor = useCallback(() => {
    if (typeof window !== 'undefined' && githubOAuthMonitorRef.current !== null) {
      window.clearInterval(githubOAuthMonitorRef.current);
    }
    githubOAuthMonitorRef.current = null;
    githubOAuthPopupRef.current = null;
  }, []);

  const openModal = useCallback(
    (status: GitHubAuthStatus = 'authorized', message: string | null = null) => {
      if (status !== 'authorizing') {
        clearGithubOAuthMonitor();
      }
      setError(null);
      setSuccess(null);
      githubAuthStatusRef.current = status;
      setAuthStatus(status);
      setStatusMessage(message);
      setIsModalOpen(true);
    },
    [clearGithubOAuthMonitor],
  );

  const closeModal = useCallback(() => {
    clearGithubOAuthMonitor();
    setIsModalOpen(false);
    setError(null);
    setSuccess(null);
    githubAuthStatusRef.current = 'idle';
    setAuthStatus('idle');
    setStatusMessage(null);
  }, [clearGithubOAuthMonitor]);

  const resetStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const verifyGithubAuthorization = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to verify GitHub authorization.');
      }

      const { authorized } = await checkGitHubAuthorization(token);
      if (authorized) {
        openModal('authorized', githubAuthSuccessMessage);
        return;
      }

      const message = 'GitHub authorization did not complete. Please try again.';
      openModal('error', message);
      alert(message);
    } catch (authError) {
      console.error('Failed to verify GitHub authorization', authError);
      const message =
        authError instanceof Error
          ? authError.message
          : 'Unable to verify GitHub authorization. Please try again.';
      openModal('error', message);
      alert(message);
    }
  }, [getIdToken, githubAuthSuccessMessage, openModal]);

  useEffect(
    () => () => {
      clearGithubOAuthMonitor();
    },
    [clearGithubOAuthMonitor],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('github_auth');
    if (!status) {
      return;
    }

    if (status === 'success') {
      openModal('authorized', githubAuthSuccessMessage);
    } else if (status === 'error') {
      const message = searchParams.get('github_message') ?? 'GitHub authorization failed.';
      openModal('error', message);
      alert(message);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('github_auth');
    url.searchParams.delete('github_message');
    const nextSearch = url.searchParams.toString();
    const nextPath = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname;
    window.history.replaceState({}, document.title, `${nextPath}${url.hash}`);
  }, [githubAuthSuccessMessage, openModal]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let apiOrigin: string | null = null;
    if (dataApiBaseUrl) {
      try {
        apiOrigin = new URL(dataApiBaseUrl).origin;
      } catch (error) {
        console.warn('Unable to parse data API base URL for GitHub OAuth messaging', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (apiOrigin && event.origin !== apiOrigin) {
        return;
      }

      let payload: unknown = event.data;

      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (error) {
          console.warn('Received non-JSON GitHub OAuth message', error);
          return;
        }
      }

      if (!payload || typeof payload !== 'object') {
        return;
      }

      const messagePayload = payload as { type?: unknown; status?: unknown; message?: unknown };
      if (messagePayload.type !== 'github-oauth') {
        return;
      }

      if (messagePayload.status === 'success') {
        openModal('authorized', githubAuthSuccessMessage);
      } else if (messagePayload.status === 'error') {
        const message =
          typeof messagePayload.message === 'string'
            ? messagePayload.message
            : 'GitHub authorization failed.';
        openModal('error', message);
        alert(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [githubAuthSuccessMessage, openModal]);

  const startAuthorization = useCallback(async () => {
    if (!dataApiEnabled || !dataApiBaseUrl) {
      openModal('error', DATA_API_DISABLED_MESSAGE);
      alert(DATA_API_DISABLED_MESSAGE);
      return;
    }

    openModal('authorizing', AUTHORIZING_MESSAGE);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the GitHub authorization request.');
      }

      const { authUrl } = await startGitHubOAuth(token);
      if (typeof window !== 'undefined') {
        const popup = window.open(authUrl, 'creative-atlas-github-oauth', 'width=600,height=700');

        if (!popup) {
          window.location.href = authUrl;
          return;
        }

        githubOAuthPopupRef.current = popup;

        if (githubOAuthMonitorRef.current !== null) {
          window.clearInterval(githubOAuthMonitorRef.current);
        }

        githubOAuthMonitorRef.current = window.setInterval(() => {
          const popupWindow = githubOAuthPopupRef.current;
          if (popupWindow && !popupWindow.closed) {
            return;
          }

          clearGithubOAuthMonitor();

          if (githubAuthStatusRef.current === 'authorizing') {
            void verifyGithubAuthorization();
          }
        }, 500);
      }
    } catch (startError) {
      console.error('Failed to initiate GitHub authorization', startError);
      const message = `Unable to start GitHub authorization. ${
        startError instanceof Error ? startError.message : 'Please try again.'
      }`;
      openModal('error', message);
      alert(message);
    }
  }, [
    dataApiEnabled,
    getIdToken,
    clearGithubOAuthMonitor,
    openModal,
    verifyGithubAuthorization,
  ]);

  const publishToRepository = useCallback(
    async (repoName: string, publishDir: string) => {
      if (!selectedProject) {
        setError('Select a project to publish to GitHub.');
        return;
      }

      if (projectArtifacts.length === 0) {
        setError('Add at least one artifact before publishing to GitHub.');
        return;
      }

      const siteFiles = createProjectStaticSiteFiles(selectedProject, projectArtifacts);

      if (siteFiles.length === 0) {
        setError('No publishable content was generated for this project.');
        return;
      }

      setError(null);
      setSuccess(null);

      const trimmedPublishDir = publishDir.trim();
      const normalizedPublishDir = trimmedPublishDir.replace(/^\/+|\/+$/g, '');
      let publishDirectory = '';

      if (normalizedPublishDir.length > 0) {
        if (normalizedPublishDir.toLowerCase() === 'docs') {
          publishDirectory = 'docs';
        } else {
          setError('GitHub Pages only supports publishing from the site root or a docs/ folder. Leave the field blank or enter "docs".');
          return;
        }
      }

      setIsPublishing(true);
      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate the GitHub publish request.');
        }

        const result = await publishToGitHub(token, repoName, publishDirectory, siteFiles);
        const normalizedDirectory = publishDirectory.replace(/^\/+|\/+$/g, '');
        const encodedDirectoryPath = normalizedDirectory
          ? normalizedDirectory.split('/').map(encodeURIComponent).join('/')
          : '';

        const branchUrl = `https://github.com/${result.repository}/tree/gh-pages${
          encodedDirectoryPath ? `/${encodedDirectoryPath}` : ''
        }`;

        setSuccess({
          message: result.message,
          pagesUrl: result.pagesUrl,
          branchUrl,
          branchDirectory: normalizedDirectory || null,
        });

        setProjectPublishHistory((prev) => ({
          ...prev,
          [selectedProject.id]: {
            repository: repoName,
            publishDirectory,
            pagesUrl: result.pagesUrl,
            publishedAt: new Date().toISOString(),
          },
        }));
      } catch (publishError) {
        const message =
          publishError instanceof Error
            ? publishError.message
            : 'An unexpected error occurred while publishing to GitHub.';
        setError(message);
        throw new Error(message);
      } finally {
        setIsPublishing(false);
      }
    },
    [getIdToken, projectArtifacts, selectedProject, setProjectPublishHistory],
  );

  return {
    isModalOpen,
    authStatus,
    statusMessage,
    isPublishing,
    error,
    success,
    openModal,
    closeModal,
    resetStatus,
    startAuthorization,
    publishToRepository,
  };
}
