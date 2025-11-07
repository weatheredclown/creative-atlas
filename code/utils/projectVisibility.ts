import {
  PROJECT_COMPONENT_KEYS,
  type ProjectComponentKey,
  type ProjectFeatureGroup,
  type ProjectVisibilitySettings,
} from '../types';

export const PROJECT_FEATURE_GROUPS: Record<ProjectFeatureGroup, { title: string; description: string }> = {
  summary: {
    title: 'Summary, Settings & Artifacts',
    description: 'Curate the overview surfaces and artifact workspace that greet you when opening the project.',
  },
  analytics: {
    title: 'Analytics & Inspiration/Assistance',
    description: 'Toggle Atlas Intelligence, health diagnostics, and inspiration utilities that surface creative signals.',
  },
  tracking: {
    title: 'Tracking',
    description: 'Control boards and trackers that monitor production progress, arcs, and milestone readiness.',
  },
  distribution: {
    title: 'Import/Export & Releasing/Publishing',
    description: 'Decide which ingestion tools, template systems, and release workflows stay in view while you ship.',
  },
};

interface ComponentDefinition {
  label: string;
  description: string;
  group: ProjectFeatureGroup;
}

export const PROJECT_COMPONENT_DEFINITIONS: Record<ProjectComponentKey, ComponentDefinition> = {
  projectHero: {
    label: 'Project hero',
    description: 'Banner summary with quick stats, calls to action, and saved lore sparks.',
    group: 'summary',
  },
  projectOverview: {
    label: 'Project overview card',
    description: 'Inline editor for title, summary, status, and tags.',
    group: 'summary',
  },
  quickFactsPanel: {
    label: 'Quick facts shelf',
    description: 'Lore sparks with copy-ready snippets and clipboard helpers.',
    group: 'summary',
  },
  artifactExplorer: {
    label: 'Artifact workspace',
    description: 'Table, graph, and Kanban explorer with editors for individual artifacts.',
    group: 'summary',
  },
  projectInsights: {
    label: 'Project insights',
    description: 'Auto-generated metrics across seeds, relationships, and quests.',
    group: 'analytics',
  },
  aiCopilot: {
    label: 'Atlas Intelligence studio',
    description: 'Opt-in creative assistants with curated prompt slots.',
    group: 'analytics',
  },
  narrativeHealth: {
    label: 'Narrative health monitor',
    description: 'Highlights story needs, momentum, and neglected beats.',
    group: 'analytics',
  },
  continuityMonitor: {
    label: 'Continuity monitor',
    description: 'Flags canon risks and suggests alignment fixes.',
    group: 'analytics',
  },
  worldSimulation: {
    label: 'World simulation lens',
    description: 'Explore systems modelling timelines, factions, and physics drift.',
    group: 'analytics',
  },
  inspirationDeck: {
    label: 'Inspiration deck',
    description: 'Blend and capture inspiration cards to spark new scenes.',
    group: 'analytics',
  },
  memorySync: {
    label: 'Memory sync panel',
    description: 'Review Atlas Intelligence memory suggestions and canon updates.',
    group: 'tracking',
  },
  openTasks: {
    label: 'Open tasks',
    description: 'Summaries of active questboard tasks with due date context.',
    group: 'tracking',
  },
  narrativePipeline: {
    label: 'Narrative pipeline board',
    description: 'Pipeline view for tracking story states across production.',
    group: 'tracking',
  },
  characterArcTracker: {
    label: 'Character arc tracker',
    description: 'Visualises beat coverage and continuity for key characters.',
    group: 'tracking',
  },
  familyTreeTools: {
    label: 'Family tree tools',
    description: 'Diagram character lineages and household relationships.',
    group: 'tracking',
  },
  milestoneTracker: {
    label: 'Milestone tracker',
    description: 'Roadmap-aligned progress tracker for upcoming milestones.',
    group: 'tracking',
  },
  githubImport: {
    label: 'GitHub import',
    description: 'Bring repositories, issues, and releases into your atlas.',
    group: 'distribution',
  },
  templates: {
    label: 'Template library',
    description: 'Apply curated project templates or browse the gallery.',
    group: 'distribution',
  },
  releaseWorkflows: {
    label: 'Release workflows',
    description: 'Generate release notes and access publish actions.',
    group: 'distribution',
  },
};

export const DEFAULT_PROJECT_VISIBILITY: ProjectVisibilitySettings = PROJECT_COMPONENT_KEYS.reduce(
  (accumulator, key) => {
    accumulator[key] = key !== 'milestoneTracker';
    return accumulator;
  },
  {} as ProjectVisibilitySettings,
);

const VISIBILITY_STORAGE_KEY = 'creative-atlas.project-visibility.v1';

export const createDefaultVisibility = (): ProjectVisibilitySettings => ({ ...DEFAULT_PROJECT_VISIBILITY });

export const ensureVisibilityDefaults = (
  settings?: Partial<ProjectVisibilitySettings>,
): ProjectVisibilitySettings => {
  const defaults = createDefaultVisibility();
  if (!settings) {
    return defaults;
  }

  PROJECT_COMPONENT_KEYS.forEach((key) => {
    if (typeof settings[key] === 'boolean') {
      defaults[key] = settings[key] as boolean;
    }
  });

  return defaults;
};

export const loadProjectVisibility = (): Record<string, ProjectVisibilitySettings> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<ProjectVisibilitySettings>>;
    return Object.entries(parsed).reduce<Record<string, ProjectVisibilitySettings>>((accumulator, [projectId, value]) => {
      if (typeof projectId === 'string' && value && typeof value === 'object') {
        accumulator[projectId] = ensureVisibilityDefaults(value);
      }
      return accumulator;
    }, {});
  } catch (error) {
    console.warn('Failed to load project visibility preferences.', error);
    return {};
  }
};

export const persistProjectVisibility = (map: Record<string, ProjectVisibilitySettings>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const sanitized = Object.entries(map).reduce<Record<string, ProjectVisibilitySettings>>(
      (accumulator, [projectId, settings]) => {
        if (typeof projectId === 'string') {
          accumulator[projectId] = ensureVisibilityDefaults(settings);
        }
        return accumulator;
      },
      {},
    );

    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Failed to persist project visibility preferences.', error);
  }
};

export const getProjectComponentGroups = () =>
  (Object.keys(PROJECT_FEATURE_GROUPS) as ProjectFeatureGroup[]).map((groupKey) => ({
    key: groupKey,
    ...PROJECT_FEATURE_GROUPS[groupKey],
    items: PROJECT_COMPONENT_KEYS.filter((componentKey) =>
      PROJECT_COMPONENT_DEFINITIONS[componentKey].group === groupKey,
    ).map((componentKey) => ({
      key: componentKey,
      ...PROJECT_COMPONENT_DEFINITIONS[componentKey],
    })),
  }));
