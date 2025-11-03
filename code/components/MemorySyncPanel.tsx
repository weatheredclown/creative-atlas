import React, { useEffect, useMemo, useState } from 'react';
import { MemorySyncConversation, MemorySyncStatus } from '../types';
import { SparklesIcon, CheckCircleIcon, AlertTriangleIcon, ChevronDownIcon, TagIcon } from './Icons';

interface MemorySyncPanelProps {
  conversations: MemorySyncConversation[];
  onStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
}

const statusLabel: Record<MemorySyncStatus, string> = {
  pending: 'Awaiting approval',
  approved: 'Synced to canon',
  rejected: 'Dismissed',
};

const statusStyles: Record<MemorySyncStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-200 border-amber-400/60',
  approved: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/60',
  rejected: 'bg-rose-500/10 text-rose-200 border-rose-400/50',
};

const roleStyles = {
  creator: 'bg-slate-800/60 border-slate-700/60 text-slate-200',
  gemini: 'bg-cyan-950/50 border-cyan-700/50 text-cyan-100',
} as const;

const roleLabel = {
  creator: 'Creator',
  gemini: 'Gemini',
} as const;

const formatTimestamp = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const MemorySyncPanel: React.FC<MemorySyncPanelProps> = ({ conversations, onStatusChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(() => conversations[0]?.id ?? null);

  useEffect(() => {
    if (expandedId && !conversations.some((conversation) => conversation.id === expandedId)) {
      setExpandedId(conversations[0]?.id ?? null);
    }
    if (!expandedId && conversations.length === 0) {
      setExpandedId(null);
    }
  }, [conversations, expandedId]);

  const pendingTotal = useMemo(
    () =>
      conversations.reduce((total, conversation) => {
        const pending = conversation.suggestions.filter((suggestion) => suggestion.status === 'pending').length;
        return total + pending;
      }, 0),
    [conversations],
  );

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 text-cyan-300" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Gemini Memory Sync</h3>
            <p className="text-sm text-slate-400">
              Review Gemini conversation highlights before they crystalize into canon. Approved notes sync into your atlas; rejected ones stay archived.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
          {pendingTotal > 0 ? (
            <>
              <AlertTriangleIcon className="h-4 w-4 text-amber-300" />
              <span>{pendingTotal} pending</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
              <span>All synced</span>
            </>
          )}
        </div>
      </header>

      {conversations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
          No Gemini conversations are waiting for review in this project yet. Run a chat or import playtest logs to seed the queue.
        </p>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => {
            const pendingCount = conversation.suggestions.filter((suggestion) => suggestion.status === 'pending').length;
            const lastSyncedLabel = formatTimestamp(conversation.lastSyncedAt);
            const updatedLabel = formatTimestamp(conversation.updatedAt);
            const isExpanded = expandedId === conversation.id;

            return (
              <article
                key={conversation.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/70 shadow-lg shadow-slate-950/20"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : conversation.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">{conversation.title}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {updatedLabel && <span>Updated {updatedLabel}</span>}
                      {lastSyncedLabel && <span className="text-emerald-300">Last synced {lastSyncedLabel}</span>}
                      <span className="rounded-full border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                        {pendingCount} pending
                      </span>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-800/60 px-4 py-4 space-y-5">
                    <p className="text-sm text-slate-300">{conversation.summary}</p>

                    {conversation.transcript.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transcript highlights</p>
                        <ul className="space-y-2">
                          {conversation.transcript.map((message) => {
                            const timestamp = formatTimestamp(message.timestamp);
                            return (
                              <li
                                key={message.id}
                                className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm ${roleStyles[message.role]}`}
                              >
                                <div className="flex items-center justify-between text-xs text-slate-400/90">
                                  <span className="font-semibold uppercase tracking-wide">{roleLabel[message.role]}</span>
                                  {timestamp && <span>{timestamp}</span>}
                                </div>
                                <p className="text-slate-200">{message.text}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Memory suggestions</p>
                      <ul className="space-y-3">
                        {conversation.suggestions.map((suggestion) => (
                          <li
                            key={suggestion.id}
                            className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-3 space-y-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-100">{suggestion.statement}</p>
                                <p className="text-xs text-slate-400">{suggestion.rationale}</p>
                                {suggestion.artifactTitle && (
                                  <p className="text-xs text-slate-400">
                                    Target artifact: <span className="text-slate-200">{suggestion.artifactTitle}</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[suggestion.status]}`}
                                >
                                  {statusLabel[suggestion.status]}
                                </span>
                              </div>
                            </div>

                            {suggestion.tags && suggestion.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                <TagIcon className="h-3.5 w-3.5" />
                                {suggestion.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-slate-300"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {suggestion.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onStatusChange(conversation.id, suggestion.id, 'approved')}
                                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30"
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    Approve & sync
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onStatusChange(conversation.id, suggestion.id, 'rejected')}
                                    className="inline-flex items-center gap-2 rounded-md border border-rose-500/60 px-3 py-1.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/10"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {suggestion.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => onStatusChange(conversation.id, suggestion.id, 'pending')}
                                  className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800/60"
                                >
                                  Reopen review
                                </button>
                              )}
                              {suggestion.status === 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => onStatusChange(conversation.id, suggestion.id, 'pending')}
                                  className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800/60"
                                >
                                  Reconsider
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MemorySyncPanel;
