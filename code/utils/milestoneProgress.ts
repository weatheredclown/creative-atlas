import {
  Artifact,
  ArtifactType,
  Milestone,
  MilestoneMetric,
  MilestoneObjective,
  Project,
  TaskData,
  TaskState,
  UserProfile,
  isNarrativeArtifactType,
} from '../types';

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
        return data?.state === TaskState.Done;
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
