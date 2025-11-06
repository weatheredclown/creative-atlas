import React, { useMemo } from 'react';
import { Artifact, ArtifactType, CharacterData, isNarrativeArtifactType } from '../types';
import { SparklesIcon, FlagIcon, ShareIcon } from './Icons';

interface CharacterArcTrackerProps {
  artifacts: Artifact[];
}

type ArcStageId = 'spark' | 'rising' | 'crisis' | 'transformation' | 'legacy';

interface ArcStageConfig {
  id: ArcStageId;
  label: string;
  minScore: number;
  description: string;
  recommendation: string;
  badgeClass: string;
  borderClass: string;
}

interface CharacterArcEntry {
  character: Artifact;
  stage: ArcStageConfig;
  nextStage: ArcStageConfig | null;
  progressRatio: number;
  progressPercent: number;
  traitCount: number;
  bioWordCount: number;
  summaryWordCount: number;
  narrativeLinks: Artifact[];
  timelineLinks: Artifact[];
  questLinks: Artifact[];
  suggestions: string[];
  score: number;
}

const ARC_STAGE_CONFIG: ArcStageConfig[] = [
  {
    id: 'spark',
    label: 'Spark',
    minScore: 0,
    description: 'A character seed is planted. Their voice exists, but the first crucible is waiting.',
    recommendation: 'Capture an inciting beat or relationship hook to ignite their journey.',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60',
    borderClass: 'border-cyan-500/40',
  },
  {
    id: 'rising',
    label: 'Rising Stakes',
    minScore: 3.5,
    description: 'The cast member is threaded through early beats. Stakes and contradictions surface.',
    recommendation: 'Layer new complications or alliances that test their primary drive.',
    badgeClass: 'bg-violet-500/20 text-violet-200 border-violet-400/60',
    borderClass: 'border-violet-500/40',
  },
  {
    id: 'crisis',
    label: 'Crisis Point',
    minScore: 7,
    description: 'They collide with the arc’s core dilemma. Turning points demand irreversible choices.',
    recommendation: 'Outline a failure or sacrifice beat that redefines their trajectory.',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
    borderClass: 'border-amber-500/40',
  },
  {
    id: 'transformation',
    label: 'Transformation',
    minScore: 10.5,
    description: 'The character evolves in response to conflict. Relationships and abilities shift visibly.',
    recommendation: 'Document the aftermath—new abilities, scars, or alliances born from the crisis.',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
    borderClass: 'border-emerald-500/40',
  },
  {
    id: 'legacy',
    label: 'Legacy Echo',
    minScore: 14,
    description: 'Their choices ripple outward. Continuity, memory, and world systems adjust around them.',
    recommendation: 'Author canon notes or exports so future modules respect their impact.',
    badgeClass: 'bg-pink-500/20 text-pink-200 border-pink-400/60',
    borderClass: 'border-pink-500/40',
  },
];

const ARC_STAGE_ORDER = ARC_STAGE_CONFIG.map((config) => config.id);

const selectStageForScore = (score: number): ArcStageConfig => {
  for (let index = ARC_STAGE_CONFIG.length - 1; index >= 0; index -= 1) {
    const config = ARC_STAGE_CONFIG[index];
    if (score >= config.minScore) {
      return config;
    }
  }
  return ARC_STAGE_CONFIG[0];
};

const getNextStage = (currentStage: ArcStageConfig): ArcStageConfig | null => {
  const currentIndex = ARC_STAGE_ORDER.indexOf(currentStage.id);
  if (currentIndex < 0 || currentIndex >= ARC_STAGE_CONFIG.length - 1) {
    return null;
  }
  return ARC_STAGE_CONFIG[currentIndex + 1];
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const safeWordCount = (text?: string | null) => {
  if (!text) {
    return 0;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
};

const deriveStatusScore = (status: string | undefined) => {
  if (!status) {
    return 0.5;
  }
  const normalized = status.toLowerCase();
  if (normalized.includes('final') || normalized.includes('complete') || normalized.includes('publish')) {
    return 3.5;
  }
  if (normalized.includes('revise') || normalized.includes('edit') || normalized.includes('polish')) {
    return 2.75;
  }
  if (normalized.includes('progress') || normalized.includes('draft')) {
    return 2;
  }
  if (normalized.includes('idea') || normalized.includes('concept')) {
    return 1;
  }
  return 1.25;
};

const buildSuggestions = (
  entry: Pick<
    CharacterArcEntry,
    'stage' | 'traitCount' | 'bioWordCount' | 'summaryWordCount' | 'narrativeLinks' | 'timelineLinks'
  >,
): string[] => {
  const suggestions = new Set<string>();
  suggestions.add(entry.stage.recommendation);

  if (entry.narrativeLinks.length < 2) {
    suggestions.add('Link them to additional scenes or chapters to showcase escalation.');
  }

  if (entry.timelineLinks.length === 0) {
    suggestions.add('Anchor at least one timeline beat so continuity can track the change.');
  }

  if (entry.traitCount < 3) {
    suggestions.add('Document three or more defining traits so their evolution is explicit.');
  }

  if (entry.bioWordCount < 120) {
    suggestions.add('Expand the biography with emotional stakes or formative scars.');
  }

  if (entry.summaryWordCount < 40) {
    suggestions.add('Refresh the summary with the current objective or internal conflict.');
  }

  return Array.from(suggestions).slice(0, 3);
};

const CharacterArcTracker: React.FC<CharacterArcTrackerProps> = ({ artifacts }) => {
  const lookup = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), [artifacts]);

  const entries = useMemo<CharacterArcEntry[]>(() => {
    return artifacts
      .filter((artifact) => artifact.type === ArtifactType.Character)
      .map((character) => {
        const data = (character.data as CharacterData | undefined) ?? { bio: '', traits: [] };
        const traits = Array.isArray(data.traits) ? data.traits : [];
        const traitCount = traits.length;
        const bioWordCount = safeWordCount(data.bio);
        const summaryWordCount = safeWordCount(character.summary);

        const relatedArtifacts = character.relations
          .map((relation) => lookup.get(relation.toId))
          .filter((related): related is Artifact => Boolean(related));

        const narrativeLinks = relatedArtifacts.filter(
          (related) =>
            isNarrativeArtifactType(related.type) ||
            related.type === ArtifactType.Scene ||
            related.type === ArtifactType.Chapter,
        );
        const timelineLinks = relatedArtifacts.filter((related) => related.type === ArtifactType.Timeline);
        const questLinks = relatedArtifacts.filter(
          (related) => related.type === ArtifactType.Task || related.type === ArtifactType.GameModule,
        );

        const statusScore = deriveStatusScore(character.status);
        const traitScore = traitCount * 1.25;
        const bioScore = Math.min(3, bioWordCount / 80);
        const summaryScore = Math.min(2, summaryWordCount / 60);
        const narrativeScore = narrativeLinks.length * 1.8;
        const timelineScore = timelineLinks.length * 1.5;
        const questScore = questLinks.length * 0.75;

        const score = Number(
          (statusScore + traitScore + bioScore + summaryScore + narrativeScore + timelineScore + questScore).toFixed(2),
        );

        const stage = selectStageForScore(score);
        const nextStage = getNextStage(stage);
        const nextThreshold = nextStage ? nextStage.minScore : stage.minScore + 4;
        const progressRatio = nextStage
          ? clamp((score - stage.minScore) / (nextThreshold - stage.minScore || 1), 0, 1)
          : 1;
        const progressPercent = Math.round(progressRatio * 100);

        const baseEntry: CharacterArcEntry = {
          character,
          stage,
          nextStage,
          progressRatio,
          progressPercent,
          traitCount,
          bioWordCount,
          summaryWordCount,
          narrativeLinks,
          timelineLinks,
          questLinks,
          suggestions: [],
          score,
        };

        return {
          ...baseEntry,
          suggestions: buildSuggestions(baseEntry),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [artifacts, lookup]);

  const stageCounts = useMemo(() => {
    return entries.reduce<Record<ArcStageId, number>>((accumulator, entry) => {
      accumulator[entry.stage.id] = (accumulator[entry.stage.id] ?? 0) + 1;
      return accumulator;
    }, {
      spark: 0,
      rising: 0,
      crisis: 0,
      transformation: 0,
      legacy: 0,
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
        <header className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 text-cyan-300" />
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Character Arc Tracker</h3>
            <p className="text-sm text-slate-400">Add character artifacts to start charting progression states.</p>
          </div>
        </header>
        <p className="text-sm text-slate-400">
          No character profiles yet. Seed your cast to unlock arc staging, continuity prompts, and narrative heat checks.
        </p>
      </section>
    );
  }

  const advancedArcs = stageCounts.transformation + stageCounts.legacy;
  const crisisReady = stageCounts.crisis + stageCounts.transformation;

  return (
    <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 p-2 text-cyan-200">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Arc Progression</p>
            <h3 className="text-xl font-semibold text-slate-100">Character Arc Tracker</h3>
            <p className="text-sm text-slate-400">
              Visualize how each character advances from spark to legacy, and surface the next high-impact beat to author.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Active arcs</p>
            <p className="text-2xl font-bold text-cyan-50">{entries.length}</p>
          </div>
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Climax ready</p>
            <p className="text-2xl font-bold text-amber-50">{crisisReady}</p>
          </div>
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Legacy threads</p>
            <p className="text-2xl font-bold text-emerald-50">{advancedArcs}</p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {entries.map((entry) => {
          const keyBeats = entry.narrativeLinks.slice(0, 3);
          return (
            <article
              key={entry.character.id}
              className={`bg-slate-950/60 border ${entry.stage.borderClass} rounded-2xl p-4 space-y-4`}
            >
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-100">{entry.character.title}</h4>
                  <p className="text-sm text-slate-400">{entry.character.summary || 'No summary provided yet.'}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border ${entry.stage.badgeClass}`}>
                    {entry.stage.label}
                  </span>
                  <span className="text-xs text-slate-500">Score: {entry.score.toFixed(1)}</span>
                </div>
              </header>

              <div className="space-y-2">
                <div className="h-2 rounded-full bg-slate-800/70" aria-hidden>
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${entry.progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-cyan-200">
                    <FlagIcon className="w-3.5 h-3.5" /> {entry.progressPercent}% toward {entry.nextStage ? entry.nextStage.label : 'Legacy'}
                  </span>
                  {entry.nextStage && (
                    <span className="text-slate-500">
                      Next unlock: {entry.nextStage.description}
                    </span>
                  )}
                </p>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Traits logged</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.traitCount}</dd>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Bio words</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.bioWordCount}</dd>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Key beats linked</dt>
                  <dd className="text-base font-semibold text-slate-100">{entry.narrativeLinks.length + entry.timelineLinks.length}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended next moves</p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {entry.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2">
                      <span className="mt-1">
                        <ShareIcon className="w-3.5 h-3.5 text-cyan-300" />
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current beats</p>
                {keyBeats.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {keyBeats.map((beat) => (
                      <li
                        key={beat.id}
                        className="rounded-md border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-xs text-slate-300"
                      >
                        {beat.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No scenes or chapters linked yet.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default CharacterArcTracker;
