import React, { useEffect, useMemo, useState } from 'react';
import { Artifact, ArtifactType } from '../../types';
import {
  buildSimulatedHistoryHeatmap,
  SimulatedHistoryHeatmap as SimulatedHistoryHeatmapData,
} from '../../utils/worldSimulation';
import { CalendarIcon } from '../../components/Icons';
import {
  buildTimelineArtifactsFromFirestore,
  fetchSimulatedHistoryTimelines,
  FirestoreTimelineHeatmapTimeline,
} from '../../services/historyHeatmap';
import { useAuth } from '../../contexts/AuthContext';

interface SimulatedHistoryHeatmapProps {
  artifacts: Artifact[];
  currentWorldLabel?: string;
}

const intensityStyle = (value: number, maxValue: number): React.CSSProperties => {
  if (maxValue <= 0 || value <= 0) {
    return {
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      borderColor: 'rgba(148, 163, 184, 0.25)',
      color: 'rgba(226, 232, 240, 0.55)',
    };
  }

  const normalized = Math.min(1, value / maxValue);
  const backgroundStrength = 0.18 + normalized * 0.55;
  const borderStrength = 0.25 + normalized * 0.5;

  return {
    backgroundColor: `rgba(16, 185, 129, ${backgroundStrength.toFixed(3)})`,
    borderColor: `rgba(52, 211, 153, ${borderStrength.toFixed(3)})`,
    color: 'rgb(236, 253, 245)',
  };
};

const renderTooltip = (cell: SimulatedHistoryHeatmapData['rows'][number]['cells'][number]): string => {
  if (cell.events.length === 0) {
    return 'No recorded events in this span.';
  }

  return cell.events
    .map((event) => `${event.title}${event.date ? ` (${event.date})` : ''}`)
    .join('\n');
};

const applyEraFilter = (
  heatmap: SimulatedHistoryHeatmapData,
  eraLabel: string,
): SimulatedHistoryHeatmapData => {
  if (eraLabel === 'all') {
    return heatmap;
  }

  const bucket = heatmap.buckets.find((candidate) => candidate.label === eraLabel);
  if (!bucket) {
    return heatmap;
  }

  const rows = heatmap.rows.map((row) => {
    const cells = row.cells.filter((cell) => cell.bucketStart === bucket.start);
    const totalEvents = cells.reduce((sum, cell) => sum + cell.count, 0);
    return {
      ...row,
      cells,
      totalEvents,
    } satisfies SimulatedHistoryHeatmapData['rows'][number];
  });

  const maxCount = rows.reduce((max, row) => {
    const rowMax = row.cells.reduce((rowMaxInner, cell) => Math.max(rowMaxInner, cell.count), 0);
    return Math.max(max, rowMax);
  }, 0);

  const totalEvents = rows.reduce((sum, row) => sum + row.totalEvents, 0);

  return {
    ...heatmap,
    buckets: [bucket],
    rows,
    maxCount,
    totalEvents,
    earliestYear: bucket.start,
    latestYear: bucket.end,
  };
};

const toWorldOptions = (timelines: FirestoreTimelineHeatmapTimeline[]) => {
  const entries = new Map<string, string>();
  timelines.forEach((timeline) => {
    if (!entries.has(timeline.worldId)) {
      entries.set(timeline.worldId, timeline.worldTitle);
    }
  });
  return Array.from(entries.entries()).map(([value, label]) => ({ value, label }));
};

const SimulatedHistoryHeatmap: React.FC<SimulatedHistoryHeatmapProps> = ({
  artifacts,
  currentWorldLabel,
}) => {
  const [timelines, setTimelines] = useState<FirestoreTimelineHeatmapTimeline[]>([]);
  const [worldFilter, setWorldFilter] = useState<string>('all');
  const [eraFilter, setEraFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, isGuestMode } = useAuth();

  const fetchKey = useMemo(() => {
    if (authLoading || isGuestMode || !user) {
      return 'skip';
    }
    return user.uid ?? 'authenticated';
  }, [authLoading, isGuestMode, user]);

  useEffect(() => {
    if (fetchKey === 'skip') {
      setTimelines([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const loadedTimelines = await fetchSimulatedHistoryTimelines();
        if (!cancelled) {
          setTimelines(loadedTimelines);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load timeline heatmap data', err);
        if (!cancelled) {
          setTimelines([]);
          setError('Unable to load shared timeline data. Showing local project data instead.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const worldOptions = useMemo(() => toWorldOptions(timelines), [timelines]);

  useEffect(() => {
    if (worldFilter === 'all') {
      return;
    }
    if (!worldOptions.some((option) => option.value === worldFilter)) {
      setWorldFilter('all');
    }
  }, [worldFilter, worldOptions]);

  const filteredTimelines = useMemo(() => {
    if (worldFilter === 'all') {
      return timelines;
    }
    return timelines.filter((timeline) => timeline.worldId === worldFilter);
  }, [timelines, worldFilter]);

  const firestoreArtifacts = useMemo(() => {
    if (filteredTimelines.length === 0) {
      return [] as Artifact[];
    }
    return buildTimelineArtifactsFromFirestore(filteredTimelines);
  }, [filteredTimelines]);

  const usingFirestore = timelines.length > 0;

  const artifactSource = useMemo(() => {
    if (usingFirestore) {
      return firestoreArtifacts;
    }
    return artifacts.filter((artifact) => artifact.type === ArtifactType.Timeline);
  }, [artifacts, firestoreArtifacts, usingFirestore]);

  const baseHeatmap = useMemo<SimulatedHistoryHeatmapData>(() => {
    return buildSimulatedHistoryHeatmap(artifactSource);
  }, [artifactSource]);

  const eraOptions = useMemo(() => baseHeatmap.buckets.map((bucket) => bucket.label), [baseHeatmap]);

  useEffect(() => {
    if (eraFilter === 'all') {
      return;
    }
    if (!eraOptions.includes(eraFilter)) {
      setEraFilter('all');
    }
  }, [eraFilter, eraOptions]);

  const heatmap = useMemo(() => applyEraFilter(baseHeatmap, eraFilter), [baseHeatmap, eraFilter]);

  const hasTimelineData = baseHeatmap.timelineCount > 0;
  const hasDatedEvents =
    baseHeatmap.buckets.length > 0 && baseHeatmap.rows.some((row) => row.totalEvents > 0);
  const filtersApplied = eraFilter !== 'all' || (usingFirestore && worldFilter !== 'all');
  const filteredHasEvents =
    heatmap.buckets.length > 0 && heatmap.rows.some((row) => row.totalEvents > 0);

  const worldLabel = useMemo(() => {
    if (worldFilter === 'all' || worldOptions.length === 0) {
      return currentWorldLabel;
    }
    const selected = worldOptions.find((option) => option.value === worldFilter);
    return selected?.label ?? currentWorldLabel;
  }, [currentWorldLabel, worldFilter, worldOptions]);

  return (
    <section className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 space-y-4 shadow-lg shadow-emerald-900/10">
      <header className="flex items-center gap-3">
        <div className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 p-2 text-emerald-200">
          <CalendarIcon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-emerald-50">Simulated history heatmap</h4>
          <p className="text-xs text-emerald-100/80">
            Timeline beats grouped by century so you can spot eras dense with change and the gaps waiting for lore.
          </p>
        </div>
      </header>

      {loading && (
        <p className="text-xs text-emerald-100/70">Loading shared timeline data…</p>
      )}

      {error && (
        <p className="text-xs text-emerald-100/70">{error}</p>
      )}

      {!hasTimelineData && (
        <p className="text-sm text-emerald-100/80">
          Create a timeline artifact and add dated events to begin charting the world&apos;s simulated history.
        </p>
      )}

      {hasTimelineData && !hasDatedEvents && (
        <p className="text-sm text-emerald-100/80">
          Add explicit years or centuries to your timeline events. Once dated, this heatmap will reveal how history clusters.
        </p>
      )}

      {hasTimelineData && hasDatedEvents && (
        <>
          {(usingFirestore && (worldOptions.length > 1 || eraOptions.length > 1)) || eraOptions.length > 1 ? (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-emerald-100/80">
              {usingFirestore && worldOptions.length > 1 && (
                <label className="flex items-center gap-2">
                  <span className="text-emerald-100/60">World</span>
                  <select
                    className="rounded-md border border-emerald-400/40 bg-slate-950/60 px-2 py-1 text-xs text-emerald-50"
                    value={worldFilter}
                    onChange={(event) => setWorldFilter(event.target.value)}
                  >
                    <option value="all">All worlds</option>
                    {worldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {eraOptions.length > 1 && (
                <label className="flex items-center gap-2">
                  <span className="text-emerald-100/60">Era</span>
                  <select
                    className="rounded-md border border-emerald-400/40 bg-slate-950/60 px-2 py-1 text-xs text-emerald-50"
                    value={eraFilter}
                    onChange={(event) => setEraFilter(event.target.value)}
                  >
                    <option value="all">All eras</option>
                    {eraOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 text-[11px] font-medium uppercase tracking-wide text-emerald-100/80">
            <span>
              {heatmap.timelineCount} timeline{heatmap.timelineCount === 1 ? '' : 's'} tracked
            </span>
            <span>
              {heatmap.totalEvents - heatmap.undatedEventCount} dated beat
              {heatmap.totalEvents - heatmap.undatedEventCount === 1 ? '' : 's'}
            </span>
            {heatmap.undatedEventCount > 0 && (
              <span className="text-emerald-200/70">
                {heatmap.undatedEventCount} undated
              </span>
            )}
          </div>

          {filtersApplied && !filteredHasEvents && (
            <p className="text-sm text-emerald-100/80">
              No timeline events match the selected filters. Adjust the world or era to explore other spans.
            </p>
          )}

          {(!filtersApplied || filteredHasEvents) && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-xs text-emerald-50">
                <thead>
                  <tr>
                    <th className="w-48 rounded-lg bg-slate-950/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
                      Timeline{worldLabel ? ` — ${worldLabel}` : ''}
                    </th>
                    {heatmap.buckets.map((bucket) => (
                      <th
                        key={bucket.start}
                        className="min-w-[88px] rounded-lg bg-slate-950/60 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80"
                      >
                        {bucket.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.rows.map((row) => (
                    <tr key={row.timelineId} className="align-top">
                      <th className="rounded-lg bg-slate-950/60 px-3 py-3 text-left text-sm font-semibold text-emerald-50">
                        {row.timelineTitle}
                      </th>
                      {row.cells.map((cell) => {
                        const style = intensityStyle(cell.count, heatmap.maxCount);
                        return (
                          <td key={`${row.timelineId}-${cell.bucketStart}`} className="px-1 py-1">
                            <div
                              className="flex h-16 items-center justify-center rounded-lg border text-sm font-semibold shadow-inner"
                              style={style}
                              title={renderTooltip(cell)}
                            >
                              {cell.count > 0 ? cell.count : '—'}
                            </div>
                          </td>
                        );
                      })}
                      {heatmap.buckets.length === 0 && (
                        <td className="px-1 py-1 text-center text-xs text-emerald-200/70">—</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default SimulatedHistoryHeatmap;
