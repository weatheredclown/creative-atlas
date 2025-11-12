import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShareIcon, LinkIcon, Spinner } from '../components/Icons';
import { fetchSharedProject, isDataApiConfigured } from '../services/dataApi';
import type { Artifact, Project } from '../types';
import { formatStatusLabel, getStatusClasses } from '../utils/status';

interface SharedProjectState {
  loading: boolean;
  error: string | null;
  project: Project | null;
  artifacts: Artifact[];
}

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

  const totalRelations = useMemo(
    () => artifacts.reduce((sum, artifact) => sum + artifact.relations.length, 0),
    [artifacts],
  );

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-3">
              <ShareIcon className="h-6 w-6 text-cyan-300" />
            </span>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200/80">
                Read-only live view
              </p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                {project ? project.title : 'Shared project'}
              </h1>
              {project?.summary ? (
                <p className="max-w-3xl text-sm text-slate-300 sm:text-base">{project.summary}</p>
              ) : null}
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
                {projectTags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-600/60 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-slate-300">
                    #{tag}
                  </span>
                ))}
                {projectTags.length > 4 ? (
                  <span className="rounded-full border border-slate-600/60 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-slate-400">
                    +{projectTags.length - 4} more
                  </span>
                ) : null}
              </span>
            ) : null}
            {lastUpdated && (
              <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1 text-[10px] font-semibold text-slate-400">
                Updated {lastUpdated}
              </span>
            )}
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
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
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Artifacts</p>
                <p className="mt-2 text-3xl font-semibold text-white">{artifacts.length}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Total creative artifacts currently shared from this project.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Relationships</p>
                <p className="mt-2 text-3xl font-semibold text-white">{totalRelations}</p>
                <p className="mt-2 text-xs text-slate-400">Narrative links and references across shared artifacts.</p>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project tags</p>
                <p className="mt-2 text-3xl font-semibold text-white">{uniqueTags}</p>
                <p className="mt-2 text-xs text-slate-400">Distinct tags spanning this project and its artifacts.</p>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Share link</p>
                <a
                  href={typeof window === 'undefined' ? '#' : window.location.href}
                  className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  <LinkIcon className="h-4 w-4" />
                  {typeof window === 'undefined' ? 'Shared link' : window.location.href}
                </a>
                <p className="mt-2 text-xs text-slate-400">This view stays in sync whenever the author updates the atlas.</p>
              </div>
            </section>

            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Shared artifacts</h2>
                <p className="text-sm text-slate-400">
                  Browse the read-only artifacts curated for this live share. Content updates automatically when the author makes changes.
                </p>
              </div>

              {groupedArtifacts.length === 0 ? (
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 text-sm text-slate-400">
                  No artifacts are currently shared. The author may be preparing their first entries.
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedArtifacts.map(([type, items]) => (
                    <section key={type} className="space-y-4">
                      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <h3 className="text-xl font-semibold text-slate-100">{type}</h3>
                        <span className="text-xs text-slate-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
                      </header>
                      <div className="grid gap-4 md:grid-cols-2">
                        {items.map((artifact) => (
                          <article
                            key={artifact.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg"
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
                              <p className="text-sm text-slate-300">{artifact.summary}</p>
                            ) : (
                              <p className="text-sm italic text-slate-500">No summary provided for this artifact yet.</p>
                            )}
                            {artifact.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                                {artifact.tags.slice(0, 5).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-300"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {artifact.tags.length > 5 ? (
                                  <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-400">
                                    +{artifact.tags.length - 5} more
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <footer className="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
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
