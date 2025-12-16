import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShareIcon, LinkIcon, Spinner } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import {
  disableProjectShare,
  enableProjectShare,
  getProjectShareStatus,
  isDataApiConfigured,
} from '../services/dataApi';
import type { Project } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ProjectSharePanelProps {
  project: Project;
}

type ShareStatus = 'loading' | 'disabled' | 'enabled' | 'unavailable' | 'error';
type CopyFeedback = 'idle' | 'copied' | 'failed';

const ProjectSharePanel: React.FC<ProjectSharePanelProps> = ({ project }) => {
  const { getIdToken, isGuestMode } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<ShareStatus>('loading');
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>('idle');
  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<number | null>(null);

  const canShare = isDataApiConfigured && !isGuestMode;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  const shareUrl = useMemo(() => {
    if (!shareId) {
      return '';
    }
    if (typeof window === 'undefined') {
      return `/share/${shareId}`;
    }
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/share/${shareId}`;
  }, [shareId]);

  const loadStatus = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    if (!canShare) {
      setStatus('unavailable');
      setShareId(null);
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('You must be signed in to manage sharing.');
      }

      const response = await getProjectShareStatus(token, project.id);
      if (!isMountedRef.current) {
        return;
      }

      if (response.enabled && response.shareId) {
        setShareId(response.shareId);
        setStatus('enabled');
      } else {
        setShareId(null);
        setStatus('disabled');
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Failed to load project sharing status', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load the sharing status. Please try again.',
      );
      setStatus('error');
    }
  }, [canShare, getIdToken, project.id]);

  useEffect(() => {
    setCopyFeedback('idle');
    void loadStatus();
  }, [loadStatus, project.id]);

  const handleEnable = useCallback(async () => {
    if (!canShare || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('You must be signed in to enable sharing.');
      }
      const { shareId: newShareId } = await enableProjectShare(token, project.id);
      if (!isMountedRef.current) {
        return;
      }
      setShareId(newShareId);
      setStatus('enabled');
      setCopyFeedback('idle');
      showToast('Sharing activated. Copy the link to share your atlas.', { variant: 'success' });
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Failed to enable project sharing', err);
      setError(err instanceof Error ? err.message : 'Failed to enable sharing.');
      showToast('Unable to activate sharing. Please try again.', { variant: 'error' });
      setStatus('error');
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [canShare, getIdToken, isProcessing, project.id, showToast]);

  const handleDisable = useCallback(async () => {
    if (!canShare || !shareId || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('You must be signed in to disable sharing.');
      }
      await disableProjectShare(token, project.id);
      if (!isMountedRef.current) {
        return;
      }
      setShareId(null);
      setStatus('disabled');
      setCopyFeedback('idle');
      showToast('Sharing disabled for this project.', { variant: 'success' });
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Failed to disable project sharing', err);
      setError(err instanceof Error ? err.message : 'Failed to disable sharing.');
      showToast('Unable to disable sharing right now. Please try again.', { variant: 'error' });
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [canShare, getIdToken, isProcessing, project.id, shareId, showToast]);

  const handleRetry = useCallback(() => {
    setError(null);
    void loadStatus();
  }, [loadStatus]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('Clipboard copy failed.');
        }
      }
      if (!isMountedRef.current) {
        return;
      }
      setCopyFeedback('copied');
      showToast('Share link copied to your clipboard.', { variant: 'success' });
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Failed to copy share link', err);
      setCopyFeedback('failed');
      showToast('Copy failed. Try again or copy the link manually.', { variant: 'error' });
    } finally {
      if (isMountedRef.current) {
        if (copyTimeoutRef.current !== null) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            setCopyFeedback('idle');
          }
        }, 2000);
      }
    }
  }, [shareUrl, showToast]);

  const copyFeedbackMessage: string | null = useMemo(() => {
    if (copyFeedback === 'copied') {
      return 'Share link copied to clipboard';
    }
    if (copyFeedback === 'failed') {
      return 'Share link copy failed. Try again or copy manually.';
    }
    return null;
  }, [copyFeedback]);

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20">
      <header className="flex items-start gap-3">
        <span className="rounded-xl border border-cyan-400/50 bg-cyan-500/10 p-2">
          <ShareIcon className="h-5 w-5 text-cyan-300" />
        </span>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">Share your atlas</h3>
          <p className="text-sm text-slate-400">
            Generate a live, read-only link to showcase <span className="text-slate-200">{project.title}</span>.
          </p>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        {status === 'unavailable' && (
          <p className="text-sm text-slate-400">
            Sharing is unavailable in guest mode or when the data API is not configured.
          </p>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Spinner className="h-5 w-5 text-cyan-300" />
            Checking sharing status…
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p>{error ?? 'Unable to load the sharing status right now.'}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md border border-rose-400/50 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-100 transition-colors hover:border-rose-300/70 hover:bg-rose-500/20"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'disabled' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Enable sharing to send collaborators a read-only view that updates with your latest work.
            </p>
            <button
              type="button"
              onClick={handleEnable}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300/70 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Activate sharing
            </button>
          </div>
        )}

        {status === 'enabled' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Sharing is active. Anyone with the link below can explore a read-only snapshot of this project.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                <LinkIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate" title={shareUrl}>
                  {shareUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                  copyFeedback === 'copied'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                    : copyFeedback === 'failed'
                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-100'
                    : 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-500/20'
                }`}
              >
                {copyFeedback === 'copied'
                  ? 'Copied!'
                  : copyFeedback === 'failed'
                  ? 'Copy failed'
                  : 'Copy link'}
              </button>
              {copyFeedbackMessage && (
                <span className="sr-only" role="status" aria-live="polite">
                  {copyFeedbackMessage}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleDisable}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disable sharing
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectSharePanel;
