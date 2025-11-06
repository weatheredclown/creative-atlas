import {
  Artifact,
  ArtifactType,
  Milestone,
  MilestoneMetric,
  MilestoneObjective,
  Project,
  TaskData,
  TASK_STATE,
  UserProfile,
  isNarrativeArtifactType,
} from '../types';
import {
  summarizeMagicConstraints,
  summarizeWorldAge,
  summarizeFactionNetwork,
  summarizeNpcMemory,
  formatSpanYears,
} from './worldSimulation';

export type ObjectiveStatus = 'not-started' | 'in-progress' | 'complete';

export interface ProjectActivity {
  viewedGraph: boolean;
  viewedKanban: boolean;
  importedCsv: boolean;
  exportedData: boolean;
  publishedSite: boolean;
  generatedReleaseNotes: boolean;
  githubImported: boolean;
  usedSearch: boolean;
  usedFilters: boolean;
}

export const createProjectActivity = (): ProjectActivity => ({
  viewedGraph: false,
  viewedKanban: false,
  importedCsv: false,
  exportedData: false,
  publishedSite: false,
  generatedReleaseNotes: false,
  githubImported: false,
  usedSearch: false,
  usedFilters: false,
});

export interface MilestoneObjectiveStatus extends MilestoneObjective {
  status: ObjectiveStatus;
  detail: string;
}

export interface MilestoneProgressOverview {
  milestone: Milestone;
  objectives: MilestoneObjectiveStatus[];
  completion: number;
}

interface EvaluationContext {
  project?: Project;
  artifacts: Artifact[];
  profile: UserProfile | null;
  activity: ProjectActivity;
}

const describeChecklist = (label: string, done: boolean): string => `${label} ${done ? '✔' : '—'}`;

const computeObjectiveStatus = (metric: MilestoneMetric | undefined, context: EvaluationContext): { status: ObjectiveStatus; detail: string } => {
  const { artifacts, profile, activity } = context;

  switch (metric) {
    case 'graph-core': {
      const artifactCount = artifacts.length;
      const relationCount = artifacts.reduce((total, artifact) => total + artifact.relations.length, 0);
      if (artifactCount === 0) {
        return { status: 'not-started', detail: 'No artifacts seeded yet.' };
      }
      if (relationCount > 0) {
        return { status: 'complete', detail: `${relationCount} total links created.` };
      }
      return { status: 'in-progress', detail: 'Artifacts captured. Add relations to complete the graph.' };
    }
    case 'view-engagement': {
      const artifactCount = artifacts.length;
      const sawGraph = activity.viewedGraph;
      if (artifactCount === 0) {
        return { status: 'not-started', detail: 'Seed artifacts to explore views.' };
      }
      if (artifactCount >= 3 && sawGraph) {
        return { status: 'complete', detail: `${artifactCount} artifacts seeded and graph view explored.` };
      }
      const detail = `${artifactCount} artifacts captured${sawGraph ? '; graph view explored' : '; open the graph view to complete.'}`;
      return { status: 'in-progress', detail };
    }
    case 'csv-flows': {
      const { importedCsv, exportedData } = activity;
      if (!importedCsv && !exportedData) {
        return { status: 'not-started', detail: 'No CSV or TSV activity yet.' };
      }
      if (importedCsv && exportedData) {
        return { status: 'complete', detail: 'CSV import and export both confirmed.' };
      }
      return {
        status: 'in-progress',
        detail: `${describeChecklist('Import', importedCsv)} · ${describeChecklist('Export', exportedData)}`,
      };
    }
    case 'github-import': {
      if (activity.githubImported) {
        return { status: 'complete', detail: 'GitHub artifacts synced into this project.' };
      }
      return { status: 'not-started', detail: 'No GitHub repositories imported yet.' };
    }
    case 'rich-editors': {
      const hasConlang = artifacts.some((artifact) => artifact.type === ArtifactType.Conlang);
      const hasStoryboard = artifacts.some(
        (artifact) => isNarrativeArtifactType(artifact.type) || artifact.type === ArtifactType.Scene,
      );
      const sawKanban = activity.viewedKanban;
      const fulfilled = [hasConlang, hasStoryboard, sawKanban].filter(Boolean).length;
      const status: ObjectiveStatus = fulfilled === 0 ? 'not-started' : fulfilled === 3 ? 'complete' : 'in-progress';
      const detail = [
        describeChecklist('Conlang editor', hasConlang),
        describeChecklist('Storyboard seeds', hasStoryboard),
        describeChecklist('Kanban view', sawKanban),
      ].join(' · ');
      return { status, detail };
    }
    case 'progression-loops': {
      const doneTasks = artifacts.filter((artifact) => artifact.type === ArtifactType.Task).filter((artifact) => {
        const data = artifact.data as TaskData | undefined;
        return data?.state === TASK_STATE.Done;
      }).length;
      const achievementsUnlocked = profile?.achievementsUnlocked?.length ?? 0;
      const xp = profile?.xp ?? 0;
      const hasQuestProgress = doneTasks > 0 || xp >= 50;
      if (!hasQuestProgress && achievementsUnlocked === 0) {
        return { status: 'not-started', detail: 'Complete quests or earn achievements to begin the loop.' };
      }
      if (hasQuestProgress && achievementsUnlocked > 0) {
        return { status: 'complete', detail: `${doneTasks} tasks completed · ${achievementsUnlocked} achievements unlocked.` };
      }
      return {
        status: 'in-progress',
        detail: `${doneTasks} tasks completed · ${achievementsUnlocked} achievements unlocked · ${xp} XP earned.`,
      };
    }
    case 'markdown-export': {
      if (activity.exportedData) {
        return { status: 'complete', detail: 'Exported data ready for markdown bundling.' };
      }
      if (activity.importedCsv) {
        return { status: 'in-progress', detail: 'CSV imports prepped—trigger an export to finish.' };
      }
      return { status: 'not-started', detail: 'No export actions recorded yet.' };
    }
    case 'static-site': {
      if (activity.publishedSite) {
        return { status: 'complete', detail: 'Static export triggered for this project.' };
      }
      return { status: 'in-progress', detail: 'Use “Publish Site” to generate a static bundle.' };
    }
    case 'release-notes': {
      if (activity.generatedReleaseNotes) {
        return { status: 'complete', detail: 'AI-powered release notes drafted.' };
      }
      return { status: 'not-started', detail: 'Generate release notes to track launch readiness.' };
    }
    case 'search-filters': {
      const { usedSearch, usedFilters } = activity;
      if (usedSearch && usedFilters) {
        return { status: 'complete', detail: 'Search and advanced filters explored.' };
      }
      if (usedSearch || usedFilters) {
        return {
          status: 'in-progress',
          detail: `${describeChecklist('Search', usedSearch)} · ${describeChecklist('Filters', usedFilters)}`,
        };
      }
      return { status: 'not-started', detail: 'Try the search bar or filters to surface artifacts faster.' };
    }
    case 'magic-systems': {
      const summary = summarizeMagicConstraints(artifacts);
      if (summary.codexCount === 0) {
        return { status: 'not-started', detail: 'No magic codices captured yet.' };
      }
      const constraintCount =
        summary.volatilePrinciples.length + summary.forbiddenPrinciples.length + summary.taboos.length;
      if (summary.annotatedCodexCount > 0 && constraintCount > 0) {
        return {
          status: 'complete',
          detail: `${summary.annotatedCodexCount} codex annotated with ${constraintCount} constraints.`,
        };
      }
      return {
        status: 'in-progress',
        detail: 'Codex seeded—document volatile principles, taboos, or forbidden laws to finish.',
      };
    }
    case 'world-age': {
      const summary = summarizeWorldAge(artifacts);
      if (summary.timelineCount === 0) {
        return { status: 'not-started', detail: 'No timeline beats logged yet.' };
      }
      const span = summary.spanYears ?? 0;
      const eventCount = summary.totalEvents;
      if (Math.abs(span) >= 100 && eventCount >= 5) {
        return {
          status: 'complete',
          detail: `${eventCount} dated events across ${formatSpanYears(summary)}.`,
        };
      }
      return {
        status: 'in-progress',
        detail: `${eventCount} dated events logged—expand across more eras to complete.`,
      };
    }
    case 'faction-conflicts': {
      const summary = summarizeFactionNetwork(artifacts);
      if (summary.factionCount === 0) {
        return { status: 'not-started', detail: 'No factions recorded yet.' };
      }
      if (summary.factionsWithLinks >= 2 && summary.crossFactionLinks > 0) {
        return {
          status: 'complete',
          detail: `${summary.factionsWithLinks} factions linked with ${summary.crossFactionLinks} rival tie${
            summary.crossFactionLinks === 1 ? '' : 's'
          }.`,
        };
      }
      if (summary.factionsWithLinks > 0) {
        return {
          status: 'in-progress',
          detail: `${summary.factionsWithLinks} factions linked—add rival or alliance relations to finish.`,
        };
      }
      return {
        status: 'in-progress',
        detail: 'Factions seeded—add relationships to map tension.',
      };
    }
    case 'npc-memory': {
      const summary = summarizeNpcMemory(artifacts);
      if (summary.totalNpcCount === 0) {
        return { status: 'not-started', detail: 'No characters or factions available for memory tracking.' };
      }
      if (summary.anchoredCount >= 2 || summary.crossWorldActors > 0) {
        return {
          status: 'complete',
          detail: `${summary.anchoredCount} anchored actors · ${summary.crossWorldActors} cross-world bridges.`,
        };
      }
      return {
        status: 'in-progress',
        detail: 'Link characters or factions to more artifacts to anchor their memories.',
      };
    }
    case 'plugin-api':
    case 'theming-offline':
      return { status: 'not-started', detail: 'Roadmap item — work begins in later phases.' };
    default:
      return { status: 'not-started', detail: 'Status tracking not yet instrumented.' };
  }
};

export const evaluateMilestoneProgress = (
  milestones: Milestone[],
  context: EvaluationContext,
): MilestoneProgressOverview[] => {
  return milestones.map((milestone) => {
    const objectives = milestone.objectives.map((objective) => {
      const evaluation = computeObjectiveStatus(objective.metric, context);
      return {
        ...objective,
        ...evaluation,
      };
    });

    const completedObjectives = objectives.filter((objective) => objective.status === 'complete').length;
    const completion = objectives.length > 0 ? completedObjectives / objectives.length : 0;

    return {
      milestone,
      objectives,
      completion,
    };
  });
};
