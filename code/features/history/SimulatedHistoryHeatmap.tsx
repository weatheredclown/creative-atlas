import React, { useMemo } from 'react';
import { Artifact } from '../../types';
import {
  buildSimulatedHistoryHeatmap,
  SimulatedHistoryHeatmap as SimulatedHistoryHeatmapData,
} from '../../utils/worldSimulation';
import { CalendarIcon } from '../../components/Icons';

interface SimulatedHistoryHeatmapProps {
  artifacts: Artifact[];
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

const SimulatedHistoryHeatmap: React.FC<SimulatedHistoryHeatmapProps> = ({ artifacts }) => {
  const heatmap = useMemo<SimulatedHistoryHeatmapData>(() => buildSimulatedHistoryHeatmap(artifacts), [artifacts]);

  const hasTimelineData = heatmap.timelineCount > 0;
  const hasDatedEvents = heatmap.buckets.length > 0 && heatmap.rows.some((row) => row.totalEvents > 0);

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

      {!hasTimelineData && (
        <p className="text-sm text-emerald-100/80">
          Create a timeline artifact and add dated events to begin charting the world's simulated history.
        </p>
      )}

      {hasTimelineData && !hasDatedEvents && (
        <p className="text-sm text-emerald-100/80">
          Add explicit years or centuries to your timeline events. Once dated, this heatmap will reveal how history clusters.
        </p>
      )}

      {hasTimelineData && hasDatedEvents && (
        <>
          <div className="flex flex-wrap gap-3 text-[11px] font-medium uppercase tracking-wide text-emerald-100/80">
            <span>
              {heatmap.timelineCount} timeline{heatmap.timelineCount === 1 ? '' : 's'} tracked
            </span>
            <span>
              {heatmap.totalEvents - heatmap.undatedEventCount} dated beat{heatmap.totalEvents - heatmap.undatedEventCount === 1 ? '' : 's'}
            </span>
            {heatmap.undatedEventCount > 0 && (
              <span className="text-emerald-200/70">
                {heatmap.undatedEventCount} undated
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-xs text-emerald-50">
              <thead>
                <tr>
                  <th className="w-48 rounded-lg bg-slate-950/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
                    Timeline
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default SimulatedHistoryHeatmap;
