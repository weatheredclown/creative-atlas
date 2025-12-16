import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShareIcon, LinkIcon, Spinner, CubeIcon, SparklesIcon } from '../components/Icons';
import { fetchSharedProject, isDataApiConfigured } from '../services/dataApi';
import type { Artifact, Project, SceneDialogueLine } from '../types';
import { ArtifactType } from '../types';
import { sanitizeSceneArtifactData } from '../utils/sceneArtifacts';
import { formatStatusLabel, getStatusClasses } from '../utils/status';

interface SharedProjectState {
  loading: boolean;
  error: string | null;
  project: Project | null;
  artifacts: Artifact[];
}

const SHARE_COPY_FEEDBACK_TIMEOUT_MS = 1600;

const gradientBackdrop =
  'pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.13),transparent_40%),_radial-gradient(circle_at_80%_10%,rgba(192,132,252,0.12),transparent_35%),_radial-gradient(circle_at_60%_35%,rgba(34,197,94,0.12),transparent_40%)] blur-3xl';

const formatTimestamp = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
};

const SharedProjectPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [state, setState] = useState<SharedProjectState>({
    loading: true,
    error: null,
    project: null,
    artifacts: [],
  });
  const sanitizeTimestampRef = useRef<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!shareId) {
        setState({ loading: false, error: 'This shared project link is missing or invalid.', project: null, artifacts: [] });
        return;
      }

      if (!isDataApiConfigured) {
        setState({
          loading: false,
          error: 'Sharing is not available in this environment. Configure the data API to enable shared views.',
          project: null,
          artifacts: [],
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { project, artifacts } = await fetchSharedProject(shareId);
        if (cancelled) {
          return;
        }
        setState({ loading: false, error: null, project, artifacts });
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error('Failed to fetch shared project', err);
        setState({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : 'We could not load this shared project. The link may be expired or revoked.',
          project: null,
          artifacts: [],
        });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), SHARE_COPY_FEEDBACK_TIMEOUT_MS);
    } catch (error) {
      console.warn('Unable to copy shared link', error);
    }
  }, [shareUrl]);

  const { project, artifacts, loading, error } = state;
  const projectTags = useMemo(
    () => (project?.tags ? [...project.tags] : []),
    [project?.tags],
  );

  const groupedArtifacts = useMemo(() => {
    const groups = new Map<string, Artifact[]>();
    artifacts.forEach((artifact) => {
      const key = artifact.type || 'Artifact';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(artifact);
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [artifacts]);

  const dialoguePreviews = useMemo(() => {
    const previews = new Map<string, { lines: SceneDialogueLine[]; generatedAt?: string }>();

    artifacts.forEach((artifact) => {
      if (artifact.type !== ArtifactType.Scene) {
        return;
      }

      try {
        const data = sanitizeSceneArtifactData(artifact.data, sanitizeTimestampRef.current);
        if (data.dialogue.length > 0) {
          previews.set(artifact.id, { lines: data.dialogue, generatedAt: data.generatedAt });
        }
      } catch (error) {
        console.warn('Unable to display dialogue preview for shared scene artifact.', {
          artifactId: artifact.id,
          error,
        });
      }
    });

    return previews;
  }, [artifacts]);

  const totalRelations = useMemo(
    () => artifacts.reduce((sum, artifact) => sum + artifact.relations.length, 0),
    [artifacts],
  );

  const mostRecentUpdate = useMemo(() => {
    const sorted = [...artifacts].sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });

    return sorted[0]?.updatedAt ? formatTimestamp(sorted[0].updatedAt) : null;
  }, [artifacts]);

  const artifactBreakdown = useMemo(
    () =>
      groupedArtifacts.map(([type, items]) => ({
        label: type,
        count: items.length,
      })),
    [groupedArtifacts],
  );

  const scenePreviewCount = dialoguePreviews.size;
  
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    artifacts.forEach((artifact) => {
      artifact.tags.forEach((tag) => tagSet.add(tag));
    });
    projectTags.forEach((tag) => tagSet.add(tag));
    return tagSet.size;
  }, [artifacts, projectTags]);

  const lastUpdated = project?.updatedAt ? formatTimestamp(project.updatedAt) : null;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div className={gradientBackdrop} aria-hidden="true" />
      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-900/20 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-2xl border border-cyan-400/50 bg-cyan-500/10 p-3">
              <ShareIcon className="h-6 w-6 text-cyan-300" />
            </span>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/80">Live shared atlas</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{project ? project.title : 'Shared project'}</h1>
              {project?.summary ? (
                <p className="max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">{project.summary}</p>
              ) : (
                <p className="max-w-3xl text-sm text-slate-400">A living project snapshot ready to explore without editing.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            {project && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusClasses(project.status)}`}>
                {formatStatusLabel(project.status)}
              </span>
            )}
            {projectTags.length ? (
              <span className="flex flex-wrap items-center gap-2 text-[11px]">
                {projectTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-600/60 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
                {projectTags.length > 5 ? (
                  <span className="rounded-full border border-slate-600/60 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-slate-400">
                    +{projectTags.length - 5} more
                  </span>
                ) : null}
              </span>
            ) : null}
            {lastUpdated && (
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold text-slate-400">
                Updated {lastUpdated}
              </span>
            )}
            {mostRecentUpdate && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-100">
                Latest artifact refresh {mostRecentUpdate}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                <SparklesIcon className="h-4 w-4" />
                Stays synced with author updates
              </span>
              {scenePreviewCount > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                  {scenePreviewCount} scene preview{scenePreviewCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/60 hover:bg-slate-900"
            >
              <CubeIcon className="h-5 w-5 text-cyan-300" />
              Back to Creative Atlas
            </Link>
          </div>
        </header>

        {project?.nanoBananaImage ? (
          <figure className="overflow-hidden rounded-3xl border border-amber-400/30 bg-slate-900/70 shadow-2xl shadow-amber-900/20">
            <img
              src={project.nanoBananaImage}
              alt={`${project.title} Creative Atlas generative art used for sharing`}
              className="h-auto w-full object-cover"
            />
            <figcaption className="border-t border-slate-800/60 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-300">
              Creative Atlas generative art for social previews
            </figcaption>
          </figure>
        ) : null}

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <Spinner className="h-5 w-5 text-cyan-300" />
            Loading shared project…
          </div>
        )}

        {!loading && error && (
          <div className="max-w-3xl space-y-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            <p>{error}</p>
            <p>
              If you manage this atlas, make sure sharing is enabled. You can return to the{' '}
              <a
                href="/"
                className="font-semibold text-rose-200 underline decoration-dotted underline-offset-4 hover:text-rose-100"
              >
                Creative Atlas home
              </a>{' '}
              to generate a new link.
            </p>
          </div>
        )}

        {!loading && !error && project && (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-cyan-900/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live share health</p>
                    <h2 className="text-2xl font-semibold text-white">Project signal</h2>
                    <p className="max-w-3xl text-sm text-slate-300">
                      A curated overview of everything that is publicly available for this project. Artifact updates refresh instantly so your guests always see the latest version.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/70 hover:bg-cyan-500/20"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {copied ? 'Link copied' : 'Copy share link'}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artifacts</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{artifacts.length}</p>
                    <p className="mt-2 text-xs text-slate-400">Total creative artifacts currently shared from this project.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Relationships</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{totalRelations}</p>
                    <p className="mt-2 text-xs text-slate-400">Narrative links and references across shared artifacts.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project tags</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{uniqueTags}</p>
                    <p className="mt-2 text-xs text-slate-400">Distinct tags spanning this project and its artifacts.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Share status</p>
                    <p className="mt-2 text-3xl font-semibold text-white">Synced</p>
                    <p className="mt-2 text-xs text-emerald-50">Live view stays aligned with creator edits in Creative Atlas.</p>
                  </div>
                </div>

                {artifactBreakdown.length > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">Artifact mix</p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{artifactBreakdown.length} types</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {artifactBreakdown.map((entry) => (
                        <div key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/90 px-3 py-2 text-sm text-slate-100">
                          <span className="font-medium">{entry.label}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-200">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-cyan-900/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Share link</p>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">Guest-ready</span>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 text-sm text-slate-200">
                  <p className="truncate font-semibold text-cyan-50">{shareUrl || 'Shared link available after load'}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Share this URL with collaborators. They will always see the newest public edits.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {lastUpdated ? <span className="rounded-full bg-slate-800 px-2 py-1">Project updated {lastUpdated}</span> : null}
                    {scenePreviewCount > 0 ? (
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-100">Scene previews {scenePreviewCount}</span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-1">Ready for reading</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 text-sm text-slate-200">
                  <p className="text-sm font-semibold text-white">Why this view?</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Visitors can tour your atlas without risk to the source material. When you add new artifacts or rewrite summaries, this page updates instantly with the revised content.
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">No sign-in required</p>
                </div>
              </div>
            </section>

            <section className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-cyan-900/20">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Shared artifacts</h2>
                  <p className="text-sm text-slate-300">
                    Browse the read-only artifacts curated for this live share. Content updates automatically when the author makes changes.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <span className="rounded-full bg-slate-800 px-2 py-1">{artifacts.length} total</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1">{groupedArtifacts.length} categories</span>
                </div>
              </div>

              {groupedArtifacts.length === 0 ? (
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 text-sm text-slate-300">
                  No artifacts are currently shared. The author may be preparing their first entries.
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedArtifacts.map(([type, items]) => (
                    <section key={type} className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-xl font-semibold text-slate-100">{type}</h3>
                        <span className="text-xs text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
                      </header>
                      <div className="grid gap-4 md:grid-cols-2">
                        {items.map((artifact) => {
                          const preview = dialoguePreviews.get(artifact.id);
                          const previewLines = preview ? preview.lines.slice(0, 4) : [];
                          const forgedAt = preview?.generatedAt ? formatTimestamp(preview.generatedAt) : null;

                          return (
                            <article
                              key={artifact.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-lg shadow-slate-950/50"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-white">{artifact.title}</h4>
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClasses(
                                    artifact.status,
                                  )}`}
                                >
                                  {formatStatusLabel(artifact.status)}
                                </span>
                              </div>
                              {artifact.summary ? (
                                <p className="text-sm text-slate-200">{artifact.summary}</p>
                              ) : (
                                <p className="text-sm italic text-slate-500">No summary provided for this artifact yet.</p>
                              )}
                              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                                <span className="rounded-full bg-slate-800 px-2 py-1">{artifact.relations.length} relation{artifact.relations.length === 1 ? '' : 's'}</span>
                                {artifact.tags.length > 0 ? (
                                  <span className="rounded-full bg-slate-800 px-2 py-1">{artifact.tags.length} tag{artifact.tags.length === 1 ? '' : 's'}</span>
                                ) : (
                                  <span className="rounded-full bg-slate-800 px-2 py-1">Tags pending</span>
                                )}
                                {artifact.updatedAt ? (
                                  <span className="rounded-full bg-slate-800 px-2 py-1">Updated {formatTimestamp(artifact.updatedAt)}</span>
                                ) : null}
                              </div>
                              {preview ? (
                                <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-cyan-200/80">
                                    <span className="font-semibold">Dialogue preview</span>
                                    {forgedAt ? <span className="text-[11px] text-cyan-100/70">Forged {forgedAt}</span> : null}
                                  </div>
                                  <ul className="space-y-3 text-sm text-slate-100">
                                    {previewLines.map((line) => (
                                      <li key={line.id} className="space-y-1">
                                        <p className="font-semibold text-cyan-100">{line.speakerName}</p>
                                        <p className="whitespace-pre-wrap text-slate-100">{line.line}</p>
                                        {line.direction ? (
                                          <p className="text-xs italic text-cyan-200/70">({line.direction})</p>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                  {preview.lines.length > previewLines.length ? (
                                    <p className="text-[11px] uppercase tracking-wide text-cyan-200/70">
                                      +{preview.lines.length - previewLines.length} more lines available in Creative Atlas
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              {artifact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                                  {artifact.tags.slice(0, 6).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-200"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {artifact.tags.length > 6 ? (
                                    <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-400">
                                      +{artifact.tags.length - 6} more
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <footer className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/80 p-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <p>
                This page is a guest-friendly snapshot of <span className="font-semibold text-slate-100">{project.title}</span>. Any edits in Creative Atlas refresh this view instantly.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300/70 hover:bg-cyan-500/20"
              >
                Explore Creative Atlas
              </Link>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

export default SharedProjectPage;
