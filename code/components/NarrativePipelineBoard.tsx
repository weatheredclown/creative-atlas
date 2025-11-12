import React, { useMemo } from 'react';
import { Artifact, ArtifactType, Scene, SceneArtifactData, isNarrativeArtifactType } from '../types';
import { MegaphoneIcon, ShareIcon, SparklesIcon } from './Icons';

interface NarrativePipelineBoardProps {
  artifacts: Artifact[];
}

type PipelineStage = 'Concept' | 'Drafting' | 'Revision' | 'Launch';

const STAGE_META: Record<PipelineStage, { description: string; badgeClass: string; borderClass: string }> = {
  Concept: {
    description: 'Outlines and loose beats that still need shape.',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/60',
    borderClass: 'border-sky-500/40',
  },
  Drafting: {
    description: 'Scenes in progress or awaiting polish.',
    badgeClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/60',
    borderClass: 'border-indigo-500/40',
  },
  Revision: {
    description: 'Tighten continuity, pacing, and emotional arcs.',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
    borderClass: 'border-amber-500/40',
  },
  Launch: {
    description: 'Locked scripts ready to ship or share with readers.',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
    borderClass: 'border-emerald-500/40',
  },
};

const determineStage = (status: string): PipelineStage => {
  const normalized = status.toLowerCase();
  if (normalized.includes('release') || normalized.includes('publish') || normalized.includes('final') || normalized.includes('done')) {
    return 'Launch';
  }
  if (normalized.includes('revise') || normalized.includes('edit') || normalized.includes('polish')) {
    return 'Revision';
  }
  if (normalized.includes('draft') || normalized.includes('write') || normalized.includes('in-progress')) {
    return 'Drafting';
  }
  return 'Concept';
};

const getScenes = (artifact: Artifact): Scene[] => {
  if (artifact.type === ArtifactType.Scene) {
    const data = artifact.data as SceneArtifactData | undefined;
    if (!data) {
      return [];
    }
    const summary = data.synopsis?.trim() || artifact.summary || '';
    if (Array.isArray(data.dialogue) && data.dialogue.length > 0) {
      const firstLine = data.dialogue[0];
      return [
        {
          id: firstLine?.id ?? artifact.id,
          title: artifact.title,
          summary,
        },
      ];
    }
    return summary.trim().length > 0
      ? [
          {
            id: artifact.id,
            title: artifact.title,
            summary,
          },
        ]
      : [];
  }

  const data = artifact.data as Scene[] | undefined;
  if (!Array.isArray(data)) {
    return [];
  }
  return data;
};

const buildSuggestion = (sceneCount: number, castSize: number): string => {
  if (sceneCount === 0) {
    return 'Add at least three beats to anchor the arc.';
  }
  if (sceneCount < 3) {
    return 'Plan midpoint or fallout scenes to sustain tension.';
  }
  if (castSize <= 1) {
    return 'Invite another character or faction to complicate the beat.';
  }
  return 'Review pacing and transition notes before moving stages.';
};

const NarrativePipelineBoard: React.FC<NarrativePipelineBoardProps> = ({ artifacts }) => {
  const lookup = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), [artifacts]);
  const pipelineEntries = useMemo(() => {
    return artifacts
      .filter((artifact) => isNarrativeArtifactType(artifact.type) || artifact.type === ArtifactType.Scene || artifact.type === ArtifactType.Chapter)
      .map((artifact) => {
        const stage = determineStage(artifact.status ?? '');
        const scenes = getScenes(artifact);
        const cast = artifact.relations
          .map((relation) => lookup.get(relation.toId))
          .filter((related): related is Artifact => Boolean(related) && related.type === ArtifactType.Character)
          .map((character) => character.title);

        return {
          artifact,
          stage,
          scenes,
          cast,
          suggestion: buildSuggestion(scenes.length, cast.length),
        };
      });
  }, [artifacts, lookup]);

  const groupedByStage = useMemo(() => {
    const buckets: Record<PipelineStage, typeof pipelineEntries> = {
      Concept: [],
      Drafting: [],
      Revision: [],
      Launch: [],
    };
    for (const entry of pipelineEntries) {
      buckets[entry.stage].push(entry);
    }
    return buckets;
  }, [pipelineEntries]);

  const stageOrder: PipelineStage[] = ['Concept', 'Drafting', 'Revision', 'Launch'];

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <MegaphoneIcon className="w-5 h-5 text-violet-300" /> Narrative Pipeline
          </h3>
          <p className="text-sm text-slate-400">
            Snapshot your active storylines, cast heat, and next actions to keep drafting momentum.
          </p>
        </div>
        <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wide text-violet-200 font-semibold">Active story threads</p>
          <p className="text-2xl font-bold text-violet-100">{pipelineEntries.length}</p>
          <p className="text-xs text-violet-200/80">Drag beats forward as you fill scenes</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stageOrder.map((stage) => {
          const entries = groupedByStage[stage];
          const meta = STAGE_META[stage];
          return (
            <div key={stage} className={`bg-slate-950/50 border ${meta.borderClass} rounded-2xl p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${meta.badgeClass}`}>
                  {stage}
                </span>
                <span className="text-xs text-slate-400">{entries.length} track{entries.length === 1 ? '' : 's'}</span>
              </div>
              <p className="text-xs text-slate-500">{meta.description}</p>
              <div className="space-y-3">
                {entries.length > 0 ? (
                  entries.map(({ artifact, scenes, cast, suggestion }) => (
                    <article key={artifact.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 space-y-2">
                      <header className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{artifact.title}</p>
                          <p className="text-xs text-slate-400">{artifact.type}</p>
                        </div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wide">{artifact.status || 'Unstaged'}</span>
                      </header>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <SparklesIcon className="w-3.5 h-3.5 text-cyan-300" /> {scenes.length} scene{scenes.length === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShareIcon className="w-3.5 h-3.5 text-amber-300" /> {cast.length} cast
                        </span>
                      </div>
                      {cast.length > 0 && (
                        <p className="text-[11px] text-slate-500 truncate" title={cast.join(', ')}>
                          Featuring: {cast.join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 leading-relaxed">{suggestion}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No tracks staged here yet.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NarrativePipelineBoard;
