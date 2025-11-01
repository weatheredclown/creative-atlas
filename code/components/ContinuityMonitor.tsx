import React, { useMemo } from 'react';
import { Artifact, ContinuityWarning } from '../types';
import { detectContinuityWarnings } from '../utils/narrativeHealth';
import { AlertTriangleIcon, SparklesIcon } from './Icons';

interface ContinuityMonitorProps {
  artifacts: Artifact[];
}

const SEVERITY_META: Record<
  ContinuityWarning['severity'],
  { label: string; badgeClass: string; borderClass: string; iconClass: string }
> = {
  alert: {
    label: 'Critical',
    badgeClass: 'bg-rose-500/20 text-rose-200 border-rose-400/60',
    borderClass: 'border-rose-500/40',
    iconClass: 'text-rose-300',
  },
  caution: {
    label: 'Caution',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
    borderClass: 'border-amber-500/40',
    iconClass: 'text-amber-300',
  },
  info: {
    label: 'Heads-Up',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/60',
    borderClass: 'border-sky-500/40',
    iconClass: 'text-sky-300',
  },
};

const ContinuityMonitor: React.FC<ContinuityMonitorProps> = ({ artifacts }) => {
  const warnings = useMemo(() => detectContinuityWarnings(artifacts), [artifacts]);
  const artifactLookup = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact.title])), [artifacts]);
  const grouped = useMemo(() => {
    return warnings.reduce<Record<string, ContinuityWarning[]>>((acc, warning) => {
      const bucket = acc[warning.severity] ?? [];
      bucket.push(warning);
      acc[warning.severity] = bucket;
      return acc;
    }, {});
  }, [warnings]);

  if (warnings.length === 0) {
    return (
      <section className="bg-slate-900/50 border border-dashed border-slate-700/60 rounded-2xl p-6 space-y-3">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-emerald-300" /> Continuity Monitor
        </h3>
        <p className="text-sm text-slate-400">
          Your timelines and narrative anchors look consistent. Keep logging beats to maintain this signal.
        </p>
      </section>
    );
  }

  const orderedSeverities: ContinuityWarning['severity'][] = ['alert', 'caution', 'info'];

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-emerald-300" /> Continuity Monitor
          </h3>
          <p className="text-sm text-slate-400">
            Automatically flags characters, timelines, and systems that have drifted out of sync.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-emerald-200 font-semibold">Open warnings</p>
          <p className="text-2xl font-bold text-emerald-100">{warnings.length}</p>
          <p className="text-xs text-emerald-200/80">Resolve items below to strengthen canon</p>
        </div>
      </header>

      <div className="space-y-5">
        {orderedSeverities.map((severity) => {
          const severityWarnings = grouped[severity] ?? [];
          if (severityWarnings.length === 0) {
            return null;
          }
          const meta = SEVERITY_META[severity];
          return (
            <div key={severity} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${meta.badgeClass}`}>
                  {meta.label}
                </span>
                <span className="text-xs text-slate-400">{severityWarnings.length} issue{severityWarnings.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-3">
                {severityWarnings.map((warning) => (
                  <article
                    key={warning.id}
                    className={`border ${meta.borderClass} bg-slate-950/60 rounded-xl p-4 flex flex-col gap-3`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full bg-slate-900/80 p-2 ${meta.iconClass}`}>
                        <AlertTriangleIcon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-slate-100">{warning.message}</h4>
                        <p className="text-xs text-slate-400">{warning.recommendation}</p>
                        {warning.relatedArtifactIds.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            Related:{' '}
                            {warning.relatedArtifactIds
                              .map((id) => artifactLookup.get(id) ?? id)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ContinuityMonitor;
