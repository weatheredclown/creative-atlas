import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Artifact,
  ArtifactType,
  TimelineData,
  TimelineEvent,
} from '../types';
import { useUserData } from '../contexts/UserDataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  FirestoreTimelineHeatmapEvent,
  TimelineHeatmapSnapshotDocument,
  TimelineHeatmapTimelinePayload,
  deleteTimelineHeatmapSnapshot,
  fetchTimelineHeatmapSnapshotsForOwners,
  getTimelineHeatmapDocumentId,
  publishTimelineHeatmapSnapshot,
} from '../services/historyHeatmap';
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  CubeIcon,
  Spinner,
  TrashIcon,
} from '../components/Icons';

type StatusKind = 'success' | 'error' | 'info';

interface StatusMessage {
  type: StatusKind;
  message: string;
}

interface PublishResult {
  ownerId: string;
  documentId: string;
}

const toTimelineEventPayload = (
  artifact: Artifact,
  event: TimelineEvent,
  index: number,
): FirestoreTimelineHeatmapEvent => {
  const trimmedTitle = event.title?.trim() ?? '';
  const trimmedDate = event.date?.trim() ?? '';
  const trimmedDescription = event.description?.trim() ?? '';
  const trimmedId = event.id?.trim() ?? '';

  const payload: FirestoreTimelineHeatmapEvent = {
    id: trimmedId || `${artifact.id}-event-${index + 1}`,
    title: trimmedTitle || `Event ${index + 1}`,
  };

  if (trimmedDate) {
    payload.date = trimmedDate;
  }

  if (trimmedDescription) {
    payload.description = trimmedDescription;
  }

  return payload;
};

const toTimelinePayload = (artifact: Artifact): TimelineHeatmapTimelinePayload => {
  const data = (artifact.data as TimelineData | undefined)?.events ?? [];
  const events = Array.isArray(data) ? data : [];

  return {
    timelineId: artifact.id,
    timelineTitle: artifact.title?.trim() || artifact.id,
    events: events.map((event, index) => toTimelineEventPayload(artifact, event, index)),
  } satisfies TimelineHeatmapTimelinePayload;
};

const formatTimestamp = (value: TimelineHeatmapSnapshotDocument['updatedAt']): string => {
  if (!value) {
    return 'Pending';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof value.toDate === 'function') {
      try {
        return value.toDate().toLocaleString();
      } catch {
        // Ignore conversion errors and fall back to seconds field if present.
      }
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
      const millis = value.seconds * 1000;
      return new Date(millis).toLocaleString();
    }
  }

  return 'Pending';
};

const normalizeOwnerIds = (raw: string): string[] => {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  return Array.from(new Set(tokens));
};

const aggregateTimelineStats = (
  timelines: TimelineHeatmapTimelinePayload[],
) => {
  return timelines.reduce(
    (acc, timeline) => ({
      timelines: acc.timelines + 1,
      events: acc.events + timeline.events.length,
    }),
    { timelines: 0, events: 0 },
  );
};

const AdminTimelineHeatmapPublisher: React.FC = () => {
  const { projects, artifacts, loading: workspaceLoading } = useUserData();
  const { isGuestMode, loading: authLoading } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTimelineIds, setSelectedTimelineIds] = useState<string[]>([]);
  const [worldIdInput, setWorldIdInput] = useState<string>('');
  const [worldTitleInput, setWorldTitleInput] = useState<string>('');
  const [ownerIdsInput, setOwnerIdsInput] = useState<string>('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [existingSnapshots, setExistingSnapshots] = useState<
    TimelineHeatmapSnapshotDocument[]
  >([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState<boolean>(false);
  const [lastPublishResults, setLastPublishResults] = useState<PublishResult[]>([]);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);

  const previousProjectIdRef = useRef<string | null>(null);

  const timelineArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.type === ArtifactType.Timeline),
    [artifacts],
  );

  const defaultProjectId = useMemo(() => {
    if (selectedProjectId) {
      return selectedProjectId;
    }
    if (timelineArtifacts.length > 0) {
      return timelineArtifacts[0].projectId;
    }
    return projects[0]?.id ?? '';
  }, [projects, selectedProjectId, timelineArtifacts]);

  useEffect(() => {
    if (!selectedProjectId && defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    }
  }, [defaultProjectId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedTimelineIds([]);
      return;
    }

    const available = timelineArtifacts.filter(
      (artifact) => artifact.projectId === selectedProjectId,
    );
    const availableIds = available.map((artifact) => artifact.id);

    setSelectedTimelineIds((prev) => {
      const hasSameSelection =
        prev.length === availableIds.length &&
        prev.every((id) => availableIds.includes(id));
      return hasSameSelection ? prev : availableIds;
    });

    if (previousProjectIdRef.current !== selectedProjectId) {
      const project = projects.find((candidate) => candidate.id === selectedProjectId);
      if (project) {
        setWorldIdInput(project.id);
        setWorldTitleInput(project.title);
      }
    }

    previousProjectIdRef.current = selectedProjectId;
  }, [projects, selectedProjectId, timelineArtifacts]);

  const availableProjects = useMemo(() =>
    projects.map((project) => ({ id: project.id, title: project.title })),
  [projects]);

  const availableTimelines = useMemo(() => {
    if (!selectedProjectId) {
      return [] as Artifact[];
    }
    return timelineArtifacts.filter(
      (artifact) => artifact.projectId === selectedProjectId,
    );
  }, [selectedProjectId, timelineArtifacts]);

  const toggleTimelineSelection = useCallback((timelineId: string) => {
    setSelectedTimelineIds((prev) =>
      prev.includes(timelineId)
        ? prev.filter((id) => id !== timelineId)
        : [...prev, timelineId],
    );
  }, []);

  const parsedOwnerIds = useMemo(
    () => normalizeOwnerIds(ownerIdsInput),
    [ownerIdsInput],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const previewTimelines = useMemo(() => {
    const map = new Map<string, Artifact>();
    availableTimelines.forEach((artifact) => {
      map.set(artifact.id, artifact);
    });

    return selectedTimelineIds
      .map((id) => map.get(id))
      .filter((artifact): artifact is Artifact => Boolean(artifact))
      .map(toTimelinePayload);
  }, [availableTimelines, selectedTimelineIds]);

  const trimmedWorldId = worldIdInput.trim();
  const trimmedWorldTitle = worldTitleInput.trim();
  const resolvedWorldTitle =
    trimmedWorldTitle || selectedProject?.title || trimmedWorldId || 'Untitled World';

  const snapshotStats = useMemo(
    () => aggregateTimelineStats(previewTimelines),
    [previewTimelines],
  );

  const previewOwnerId = parsedOwnerIds[0] ?? '<collaborator uid>';

  const previewSnapshot = useMemo(
    () => ({
      ownerId: previewOwnerId || '<collaborator uid>',
      worldId: trimmedWorldId || '<world-id>',
      worldTitle: resolvedWorldTitle || '<world title>',
      timelines: previewTimelines,
    }),
    [previewOwnerId, previewTimelines, resolvedWorldTitle, trimmedWorldId],
  );

  const ownerDocumentPreviews = useMemo(() => {
    if (parsedOwnerIds.length === 0) {
      return [] as PublishResult[];
    }
    const worldKey = trimmedWorldId || '<world-id>';
    return parsedOwnerIds.map((ownerId) => ({
      ownerId,
      documentId: getTimelineHeatmapDocumentId(ownerId, worldKey),
    }));
  }, [parsedOwnerIds, trimmedWorldId]);

  const setStatusMessage = useCallback((next: StatusMessage | null) => {
    setStatus(next);
  }, []);

  const loadSnapshots = useCallback(
    async (ownerOverride?: string[]) => {
      const owners = ownerOverride ?? parsedOwnerIds;
      if (owners.length === 0) {
        setExistingSnapshots([]);
        return;
      }

      setIsLoadingSnapshots(true);
      try {
        const snapshots = await fetchTimelineHeatmapSnapshotsForOwners(owners);
        setExistingSnapshots(snapshots);
      } catch (error) {
        console.error('Failed to load timeline snapshots', error);
        setStatusMessage({
          type: 'error',
          message: 'Unable to load existing snapshots. Please try again.',
        });
      } finally {
        setIsLoadingSnapshots(false);
      }
    },
    [parsedOwnerIds, setStatusMessage],
  );

  const handlePublish = useCallback(async () => {
    if (isGuestMode) {
      setStatusMessage({
        type: 'error',
        message:
          'Guest mode cannot publish to Firestore. Sign in with a collaborator account to continue.',
      });
      return;
    }

    if (previewTimelines.length === 0) {
      setStatusMessage({
        type: 'error',
        message: 'Select at least one timeline to publish.',
      });
      return;
    }

    if (!trimmedWorldId) {
      setStatusMessage({
        type: 'error',
        message: 'Enter a world ID before publishing.',
      });
      return;
    }

    if (parsedOwnerIds.length === 0) {
      setStatusMessage({
        type: 'error',
        message: 'Add at least one collaborator UID to publish snapshots.',
      });
      return;
    }

    setIsPublishing(true);
    setStatusMessage({ type: 'info', message: 'Publishing timeline snapshots…' });

    try {
      const results: PublishResult[] = [];
      for (const ownerId of parsedOwnerIds) {
        const documentId = await publishTimelineHeatmapSnapshot({
          ownerId,
          worldId: trimmedWorldId,
          worldTitle: resolvedWorldTitle,
          timelines: previewTimelines,
        });
        results.push({ ownerId, documentId });
      }

      setLastPublishResults(results);
      setStatusMessage({
        type: 'success',
        message: `Published ${results.length} snapshot${
          results.length === 1 ? '' : 's'
        } successfully.`,
      });

      await loadSnapshots(parsedOwnerIds);
    } catch (error) {
      console.error('Failed to publish timeline snapshots', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'An unexpected error occurred.';
      setStatusMessage({
        type: 'error',
        message: `Unable to publish snapshots. ${message}`,
      });
    } finally {
      setIsPublishing(false);
    }
  }, [
    isGuestMode,
    loadSnapshots,
    parsedOwnerIds,
    previewTimelines,
    resolvedWorldTitle,
    setStatusMessage,
    trimmedWorldId,
  ]);

  const handleDeleteSnapshot = useCallback(
    async (documentId: string) => {
      if (!documentId) {
        return;
      }

      setDeletingSnapshotId(documentId);
      try {
        await deleteTimelineHeatmapSnapshot(documentId);
        setStatusMessage({
          type: 'success',
          message: `Deleted snapshot ${documentId}.`,
        });
        await loadSnapshots();
      } catch (error) {
        console.error('Failed to delete snapshot', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to delete the snapshot.';
        setStatusMessage({
          type: 'error',
          message,
        });
      } finally {
        setDeletingSnapshotId(null);
      }
    },
    [loadSnapshots, setStatusMessage],
  );

  const isLoading = authLoading || workspaceLoading;

  if (isGuestMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800/60 bg-slate-900/80">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
            <div className="flex items-center gap-3">
              <CubeIcon className="h-7 w-7 text-cyan-400" />
              <div>
                <p className="text-sm font-semibold text-cyan-200/80">Admin Tool</p>
                <h1 className="text-2xl font-bold text-slate-100">
                  Timeline Heatmap Publisher
                </h1>
              </div>
            </div>
            <Link
              to="/"
              className="rounded-md border border-slate-700/60 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Return to workspace
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-16">
          <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-8 text-center">
            <AlertTriangleIcon className="mx-auto h-10 w-10 text-amber-400" />
            <h2 className="text-xl font-semibold text-slate-100">
              Timeline publishing is unavailable in guest mode
            </h2>
            <p className="text-sm text-slate-300">
              Sign in with a Firebase collaborator account to seed the
              <code className="mx-2 rounded bg-slate-800 px-2 py-1 text-xs text-cyan-300">timelineHeatmap</code>
              collection described in
              <span className="mx-2 font-semibold">docs/firebase-timeline-heatmap-setup.md</span>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-7 w-7 text-cyan-400" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200/80">
                Admin Tool
              </p>
              <h1 className="text-2xl font-bold text-slate-100">
                Timeline Heatmap Publisher
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/docs/firebase-timeline-heatmap-setup.md"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-700/60 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              View setup guide
            </Link>
            <Link
              to="/"
              className="rounded-md border border-slate-700/60 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Return to workspace
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">
                Publish Firestore timeline snapshots
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Select existing timeline artifacts, map them to collaborator UIDs, and publish
                documents into the
                <code className="mx-2 rounded bg-slate-800 px-2 py-1 text-xs text-cyan-300">timelineHeatmap</code>
                collection described in
                <span className="mx-2 font-semibold">docs/firebase-timeline-heatmap-setup.md</span>.
              </p>
            </div>
            {isLoading && <Spinner className="h-6 w-6 text-cyan-300" />}
          </div>
          {status && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : status.type === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                    : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
              }`}
            >
              {status.type === 'success' && (
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              )}
              {status.type === 'error' && (
                <AlertTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              )}
              {status.type === 'info' && (
                <CalendarIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
              )}
              <p>{status.message}</p>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-100">1. Choose a world</h3>
              <p className="text-sm text-slate-400">
                Pick the project whose timelines you want to publish and confirm the metadata stored in Firestore.
              </p>
            </header>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="timeline-project">
                  Project
                </label>
                <select
                  id="timeline-project"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  {availableProjects.length === 0 && <option value="">No projects available</option>}
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title || project.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="world-id">
                    World ID
                  </label>
                  <input
                    id="world-id"
                    type="text"
                    value={worldIdInput}
                    onChange={(event) => setWorldIdInput(event.target.value)}
                    placeholder={selectedProject?.id ?? 'world-dustland'}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300" htmlFor="world-title">
                    World title
                  </label>
                  <input
                    id="world-title"
                    type="text"
                    value={worldTitleInput}
                    onChange={(event) => setWorldTitleInput(event.target.value)}
                    placeholder={selectedProject?.title ?? 'Dustland'}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p>
                  <span className="font-semibold text-slate-100">Snapshot summary:</span>{' '}
                  {snapshotStats.timelines} timeline{snapshotStats.timelines === 1 ? '' : 's'} •{' '}
                  {snapshotStats.events} event{snapshotStats.events === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-100">2. Select timeline artifacts</h3>
              <p className="text-sm text-slate-400">
                Check the timelines to include in the Firestore snapshot. Use your project workspace to refine their events first.
              </p>
            </header>
            <div className="space-y-3">
              {availableTimelines.length === 0 && (
                <p className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-sm text-slate-400">
                  This project does not have any timeline artifacts yet. Create one in your workspace, then refresh this page.
                </p>
              )}
              {availableTimelines.map((artifact) => {
                const timelineData = (artifact.data as TimelineData | undefined)?.events ?? [];
                const eventCount = Array.isArray(timelineData) ? timelineData.length : 0;
                const isSelected = selectedTimelineIds.includes(artifact.id);
                return (
                  <label
                    key={artifact.id}
                    aria-label={`Toggle timeline ${artifact.title || artifact.id}`}
                    className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-800/60 bg-slate-900/50 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTimelineSelection(artifact.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                    />
                    <div>
                      <p className="text-sm font-semibold">{artifact.title || artifact.id}</p>
                      <p className="text-xs text-slate-400">
                        {eventCount} event{eventCount === 1 ? '' : 's'} • ID: {artifact.id}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-100">3. Target collaborator UIDs</h3>
              <p className="text-sm text-slate-400">
                Enter the Firebase Authentication UIDs that should receive this snapshot. The tool creates one document per UID.
              </p>
            </header>
            <textarea
              value={ownerIdsInput}
              onChange={(event) => setOwnerIdsInput(event.target.value)}
              rows={4}
              placeholder="uid-alex
uid-lee"
              className="w-full rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                {parsedOwnerIds.length > 0
                  ? `Preparing ${parsedOwnerIds.length} collaborator${
                      parsedOwnerIds.length === 1 ? '' : 's'
                    }.`
                  : 'Add at least one collaborator UID to continue.'}
              </p>
              {ownerDocumentPreviews.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Firestore document IDs
                  </p>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {ownerDocumentPreviews.map((entry) => (
                      <li key={entry.ownerId} className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-slate-100">{entry.ownerId}</span>
                        <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-cyan-200">
                          {entry.documentId}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6">
            <header className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-100">4. Preview & publish</h3>
              <p className="text-sm text-slate-400">
                Review the final payload before publishing it to Firestore.
              </p>
            </header>
            <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/80">
              <pre className="max-h-72 overflow-auto p-4 text-xs text-slate-300">
{`${JSON.stringify(previewSnapshot, null, 2)}`}
              </pre>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={isPublishing || previewTimelines.length === 0 || parsedOwnerIds.length === 0 || !trimmedWorldId}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  isPublishing || previewTimelines.length === 0 || parsedOwnerIds.length === 0 || !trimmedWorldId
                    ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
                    : 'border border-cyan-500/60 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                }`}
              >
                {isPublishing ? 'Publishing…' : 'Publish snapshots'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadSnapshots();
                }}
                disabled={isLoadingSnapshots || parsedOwnerIds.length === 0}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  isLoadingSnapshots || parsedOwnerIds.length === 0
                    ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-700'
                }`}
              >
                {isLoadingSnapshots ? 'Refreshing…' : 'Check existing snapshots'}
              </button>
              {lastPublishResults.length > 0 && (
                <div className="text-xs text-slate-400">
                  Most recent publish:
                  {lastPublishResults.map((result) => (
                    <span key={result.documentId} className="ml-2 rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-cyan-200">
                      {result.ownerId} → {result.documentId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6">
          <header className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-100">Published snapshots</h3>
            <p className="text-sm text-slate-400">
              Review the documents currently stored in Firestore for the selected collaborator UIDs.
            </p>
          </header>
          {isLoadingSnapshots && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-sm text-slate-300">
              <Spinner className="h-5 w-5 text-cyan-300" />
              Loading snapshots…
            </div>
          )}
          {!isLoadingSnapshots && existingSnapshots.length === 0 && (
            <p className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-sm text-slate-400">
              No timeline snapshots found for these collaborator IDs yet.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {existingSnapshots.map((snapshot) => {
              const timelineCount = snapshot.parsedTimelines.length;
              const eventCount = snapshot.parsedTimelines.reduce(
                (total, timeline) => total + timeline.events.length,
                0,
              );
              const isDeleting = deletingSnapshotId === snapshot.id;
              return (
                <div
                  key={snapshot.id}
                  className="flex h-full flex-col justify-between rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {snapshot.ownerId}
                        </p>
                        <h4 className="text-base font-semibold text-slate-100">
                          {snapshot.worldTitle}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteSnapshot(snapshot.id);
                        }}
                        disabled={isDeleting}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isDeleting
                            ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-100 hover:border-rose-400/60 hover:bg-rose-500/20'
                        }`}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Document ID:
                      <span className="ml-2 rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-cyan-200">
                        {snapshot.id}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Updated: {formatTimestamp(snapshot.updatedAt)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {timelineCount} timeline{timelineCount === 1 ? '' : 's'} • {eventCount} event{eventCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-800/60 bg-slate-950/60 p-3">
                    <pre className="text-[11px] text-slate-300">
{`${JSON.stringify(
  {
    ownerId: snapshot.ownerId,
    worldId: snapshot.worldId,
    worldTitle: snapshot.worldTitle,
    timelines: snapshot.timelines,
  },
  null,
  2,
)}`}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminTimelineHeatmapPublisher;
