import React, { useMemo } from 'react';
import { Artifact, ArtifactType, NarrativeNeed, NarrativeNeedStatus } from '../types';
import { evaluateNarrativeNeeds } from '../utils/narrativeHealth';
import { SparklesIcon } from './Icons';

interface NarrativeHealthPanelProps {
  artifacts: Artifact[];
}

const STATUS_CONFIG: Record<
  NarrativeNeedStatus,
  { label: string; badgeClass: string; borderClass: string; description: string }
> = {
  thriving: {
    label: 'Thriving',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
    borderClass: 'border-emerald-400/40',
    description: 'Actively appearing and woven into multiple beats.',
  },
  steady: {
    label: 'Steady',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
    borderClass: 'border-sky-400/40',
    description: 'Present and ready, but keep their momentum in view.',
  },
  cooling: {
    label: 'Cooling',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
    borderClass: 'border-amber-400/40',
    description: 'Starting to drift offstage—plan the next beat.',
  },
  'at-risk': {
    label: 'At Risk',
    badgeClass: 'bg-rose-500/20 text-rose-200 border-rose-400/60',
    borderClass: 'border-rose-400/50',
    description: 'No active ties. Reignite or archive deliberately.',
  },
};

const TYPE_LABELS: Partial<Record<ArtifactType, string>> = {
  [ArtifactType.Character]: 'Characters',
  [ArtifactType.Faction]: 'Factions',
  [ArtifactType.Location]: 'Locations',
};

const STATUS_ORDER: Record<NarrativeNeedStatus, number> = {
  thriving: 3,
  steady: 2,
  cooling: 1,
  'at-risk': 0,
};

const formatNeedDescription = (need: NarrativeNeed): string => {
  if (need.status === 'thriving') {
    return `${need.appearances} active placements · ${need.supportLinks} support links`;
  }
  if (need.status === 'steady') {
    return `${need.appearances} appearances—keep their spotlight warm.`;
  }
  if (need.status === 'cooling') {
    if (need.appearances === 0) {
      return 'Linked but still waiting for a stage entrance.';
    }
    return `${need.appearances} appearance · ${need.supportLinks} support ties`;
  }
  return 'No narrative anchors yet—decide whether to reactivate or shelve.';
};

const NarrativeHealthPanel: React.FC<NarrativeHealthPanelProps> = ({ artifacts }) => {
  const needs = useMemo(() => evaluateNarrativeNeeds(artifacts), [artifacts]);
  const groupedByType = useMemo(() => {
    const buckets = new Map<ArtifactType, NarrativeNeed[]>();
    for (const need of needs) {
      const existing = buckets.get(need.artifactType) ?? [];
      existing.push(need);
      buckets.set(need.artifactType, existing);
    }
    return buckets;
  }, [needs]);

  const coverage = useMemo(() => {
    if (needs.length === 0) {
      return 1;
    }
    const healthy = needs.filter((need) => need.status === 'thriving' || need.status === 'steady').length;
    return healthy / needs.length;
  }, [needs]);

  const atRisk = useMemo(
    () =>
      [...needs]
        .filter((need) => need.status === 'at-risk' || need.status === 'cooling')
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.appearances - b.appearances)
        .slice(0, 4),
    [needs],
  );

  const displayTypes: ArtifactType[] = [ArtifactType.Character, ArtifactType.Location, ArtifactType.Faction];

  if (needs.length === 0) {
    return (
      <section className="bg-slate-900/50 border border-dashed border-slate-700/60 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-cyan-300" /> Narrative Need Heatmap
        </h3>
        <p className="text-sm text-slate-400 mt-3">
          Add characters, factions, or locations to see how evenly your story spotlight is distributed.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-cyan-300" /> Narrative Need Heatmap
          </h3>
          <p className="text-sm text-slate-400">
            Track who is thriving in the spotlight and who needs another scene or relationship to stay memorable.
          </p>
        </div>
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-cyan-200 font-semibold">Coverage</p>
          <p className="text-2xl font-bold text-cyan-100">{Math.round(coverage * 100)}%</p>
          <p className="text-xs text-cyan-200/80">Characters, factions, and locations with active beats</p>
        </div>
      </header>

      {atRisk.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/40 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200 mb-2">Needs attention</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {atRisk.map((need) => {
              const statusMeta = STATUS_CONFIG[need.status];
              return (
                <div
                  key={need.artifactId}
                  className={`rounded-lg border ${statusMeta.borderClass} bg-slate-950/60 p-3`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">{need.artifactTitle}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{formatNeedDescription(need)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {displayTypes.map((type) => {
          const typeNeeds = [...(groupedByType.get(type) ?? [])].sort(
            (a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status] || b.appearances - a.appearances,
          );

          return (
            <div key={type} className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
              <header className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{TYPE_LABELS[type]}</h4>
                  <p className="text-xs text-slate-500">
                    {typeNeeds.length > 0
                      ? `${typeNeeds.filter((need) => need.status === 'thriving' || need.status === 'steady').length} of ${
                          typeNeeds.length
                        } engaged`
                      : 'No entries yet'}
                  </p>
                </div>
              </header>

              <div className="space-y-3">
                {typeNeeds.length > 0 ? (
                  typeNeeds.map((need) => {
                    const statusMeta = STATUS_CONFIG[need.status];
                    const appearanceRatio = Math.min(1, need.appearances / 3);
                    return (
                      <article
                        key={need.artifactId}
                        className={`rounded-lg border ${statusMeta.borderClass} bg-slate-900/60 p-3 space-y-2`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-100 truncate" title={need.artifactTitle}>
                            {need.artifactTitle}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{statusMeta.description}</p>
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"
                              style={{ width: `${appearanceRatio * 100}%` }}
                              aria-hidden="true"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {need.appearances} placements · {need.supportLinks} support links
                          </p>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">Capture at least one {TYPE_LABELS[type]?.toLowerCase()} to track heat.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NarrativeHealthPanel;
