import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    AIAssistant,
    Achievement,
    Artifact,
    ArtifactType,
    CharacterData,
    ConlangLexeme,
    Milestone,
    Project,
    ProjectStatus,
    ProjectTemplate,
    Quest,
    Questline,
    InspirationCard,
    MemorySyncStatus,
    Relation,
    TaskData,
    TASK_STATE,
    type TaskState,
    TemplateCategory,
    TemplateEntry,
    TemplateArtifactBlueprint,
    TimelineData,
    UserProfile,
    WikiData,
    isNarrativeArtifactType,
} from './types';
import {
    PlusIcon,
    TableCellsIcon,
    ShareIcon,
    ViewColumnsIcon,
    ArrowUpTrayIcon,
    BuildingStorefrontIcon,
    FolderPlusIcon,
    SparklesIcon,
    GitHubIcon,
    CubeIcon,
    IntelligenceLogo,
} from './components/Icons';
import Header from './components/Header';
import Modal from './components/Modal';
import CreateArtifactForm from './components/CreateArtifactForm';
import CreateProjectForm from './components/CreateProjectForm';
import ProjectCard from './components/ProjectCard';
import Quests from './components/Quests';
import Achievements from './components/Achievements';
import ArtifactDetail from './components/ArtifactDetail';
import ArtifactListItem from './components/ArtifactListItem';
import GraphView from './components/GraphView';
import ConlangLexiconEditor from './components/ConlangLexiconEditor';
import StoryEditor from './components/StoryEditor';
import KanbanBoard from './components/KanbanBoard';
import CharacterEditor from './components/CharacterEditor';
import WikiEditor from './components/WikiEditor';
import LocationEditor from './components/LocationEditor';
import TaskEditor from './components/TaskEditor';
import TimelineEditor from './components/TimelineEditor';
import MagicSystemBuilder from './components/MagicSystemBuilder';
import { exportProjectAsStaticSite, exportChapterBibleMarkdown, exportChapterBiblePdf, exportLoreJson } from './utils/export';
import ProjectOverview from './components/ProjectOverview';
import ProjectInsights from './components/ProjectInsights';
import ProjectHero from './components/ProjectHero';
import OpenTasksPanel from './components/OpenTasksPanel';
import { formatStatusLabel } from './utils/status';
import TemplateGallery from './components/TemplateGallery';
import ProjectTemplatePicker from './components/ProjectTemplatePicker';
import ReleaseNotesGenerator from './components/ReleaseNotesGenerator';
import StreakTracker from './components/StreakTracker';
import QuestlineBoard from './components/QuestlineBoard';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import { dataApiBaseUrl, downloadProjectExport, importArtifactsViaApi, isDataApiConfigured, startGitHubOAuth } from './services/dataApi';
import UserProfileCard from './components/UserProfileCard';
import GitHubImportPanel from './components/GitHubImportPanel';
import SecondaryInsightsPanel from './components/SecondaryInsightsPanel';
import MemorySyncPanel from './components/MemorySyncPanel';
import MilestoneTracker from './components/MilestoneTracker';
import ErrorBanner from './components/ErrorBanner';
import TutorialGuide from './components/TutorialGuide';
import ErrorBoundary from './components/ErrorBoundary';
import RevealDepthToggle from './components/RevealDepthToggle';
import { createProjectActivity, evaluateMilestoneProgress, MilestoneProgressOverview, ProjectActivity } from './utils/milestoneProgress';
import InfoModal from './components/InfoModal';
import PublishToGitHubModal from './components/PublishToGitHubModal';
import { publishToGitHub } from './services/dataApi';
import QuickFactForm from './components/QuickFactForm';
import QuickFactsPanel from './components/QuickFactsPanel';
import { DepthPreferencesProvider } from './contexts/DepthPreferencesContext';
import NarrativeHealthPanel from './components/NarrativeHealthPanel';
import ContinuityMonitor from './components/ContinuityMonitor';
import InspirationDeck from './components/InspirationDeck';
import NarrativePipelineBoard from './components/NarrativePipelineBoard';
import { createBlankMagicSystemData, createTamenzutMagicSystemData } from './utils/magicSystem';
import Zippy from './components/Zippy';
import WorldSimulationPanel from './components/WorldSimulationPanel';
import CharacterArcTracker from './components/CharacterArcTracker';

const countArtifactsByType = (artifacts: Artifact[], type: ArtifactType) =>
  artifacts.filter((artifact) => artifact.type === type).length;

const countTasksInState = (artifacts: Artifact[], state: TaskState) =>
  artifacts.filter(
    (artifact) =>
      artifact.type === ArtifactType.Task &&
      ((artifact.data as TaskData | undefined)?.state ?? null) === state,
  ).length;

const getCompletedTaskCount = (artifacts: Artifact[]) =>
  countTasksInState(artifacts, TASK_STATE.Done);

const getTotalRelations = (artifacts: Artifact[]) =>
  artifacts.reduce((total, artifact) => total + artifact.relations.length, 0);

const countArtifactsWithRelations = (artifacts: Artifact[], minimum: number) =>
  artifacts.filter((artifact) => artifact.relations.length >= minimum).length;

const getConlangLexemeCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Conlang)
    .reduce((count, artifact) => {
      const data = artifact.data as ConlangLexeme[] | undefined;
      return count + (Array.isArray(data) ? data.length : 0);
    }, 0);

const getWikiWordCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Wiki)
    .reduce((count, artifact) => {
      const data = artifact.data as WikiData | undefined;
      if (!data || typeof data.content !== 'string') {
        return count;
      }
      const words = data.content.trim().split(/\s+/).filter(Boolean);
      return count + words.length;
    }, 0);

const getCharacterTraitCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Character)
    .reduce((count, artifact) => {
      const data = artifact.data as CharacterData | undefined;
      return count + (Array.isArray(data?.traits) ? data.traits.length : 0);
    }, 0);

const getMaxTimelineEventCount = (artifacts: Artifact[]) =>
  artifacts
    .filter((artifact) => artifact.type === ArtifactType.Timeline)
    .reduce((max, artifact) => {
      const data = artifact.data as TimelineData | undefined;
      const events = Array.isArray(data?.events) ? data.events.length : 0;
      return Math.max(max, events);
    }, 0);

const countTimelineArtifacts = (artifacts: Artifact[]) =>
  artifacts.filter((artifact) => artifact.type === ArtifactType.Timeline).length;

const countTaggedArtifacts = (artifacts: Artifact[], minimumTags: number) =>
  artifacts.filter((artifact) => (artifact.tags?.length ?? 0) >= minimumTags).length;

const countProjectsByStatus = (projects: Project[], status: ProjectStatus) =>
  projects.filter((project) => project.status === status).length;

const deriveQuickFactTitle = (fact: string, fallbackTitle: string): string => {
  const sanitized = fact.replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return fallbackTitle;
  }

  const sentenceMatch = sanitized.match(/^[^.!?\n]+[.!?]?/);
  const firstSentence = (sentenceMatch?.[0] ?? sanitized).trim();
  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  const truncated = firstSentence.slice(0, 57).trimEnd();
  return `${truncated}\u2026`;
};

const createQuickFactSummary = (fact: string, detail?: string): string => {
  const trimmedFact = fact.trim();
  const trimmedDetail = detail?.trim();
  const combined = trimmedDetail && trimmedDetail.length > 0 ? `${trimmedFact} — ${trimmedDetail}` : trimmedFact;

  if (combined.length <= 160) {
    return combined;
  }

  return `${combined.slice(0, 157).trimEnd()}\u2026`;
};

const createQuickFactContent = (title: string, fact: string, detail?: string): string => {
  const trimmedFact = fact.trim();
  const trimmedDetail = detail?.trim();
  const segments = [`# ${title}`, '', trimmedFact];
  if (trimmedDetail && trimmedDetail.length > 0) {
    segments.push('', trimmedDetail);
  }

  const content = segments.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  return content.endsWith('\n') ? content : `${content}\n`;
};

const cloneArtifactData = (data: Artifact['data']) => {
  if (data === undefined) {
    return undefined;
  }

  const structuredCloneFn = (globalThis as { structuredClone?: <T>(value: T) => T }).structuredClone;
  if (typeof structuredCloneFn === 'function') {
    try {
      return structuredCloneFn(data) as Artifact['data'];
    } catch (error) {
      console.warn('Structured clone failed for artifact data, falling back to JSON clone.', error);
    }
  }

  try {
    return JSON.parse(JSON.stringify(data)) as Artifact['data'];
  } catch (error) {
    console.warn('JSON clone failed for artifact data, returning shallow copy instead.', error);
    if (Array.isArray(data)) {
      return data.map((item) => (typeof item === 'object' && item !== null ? { ...item } : item)) as Artifact['data'];
    }
    if (typeof data === 'object' && data !== null) {
      return { ...data } as Artifact['data'];
    }
    return data;
  }
};

const QUICK_FACT_TAG = 'fact';
const QUICK_FACT_TITLE_PATTERN = /fact\s+#\d+/i;

const isQuickFactArtifact = (artifact: Artifact): boolean => {
  if (artifact.type !== ArtifactType.Wiki) {
    return false;
  }
  if (artifact.tags.some((tag) => tag.toLowerCase() === QUICK_FACT_TAG)) {
    return true;
  }
  return QUICK_FACT_TITLE_PATTERN.test(artifact.title);
};

const extractQuickFactNumber = (artifact: Artifact): number | null => {
  const match = artifact.title.match(/#(\d+)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const sortQuickFactsByRecency = (a: Artifact, b: Artifact): number => {
  const aNumber = extractQuickFactNumber(a);
  const bNumber = extractQuickFactNumber(b);
  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) {
    return bNumber - aNumber;
  }
  if (aNumber !== null && bNumber === null) {
    return -1;
  }
  if (aNumber === null && bNumber !== null) {
    return 1;
  }
  return b.title.localeCompare(a.title);
};

const DAILY_QUESTS_PER_DAY = 4;

const DAILY_QUEST_POOL: Quest[] = [
  {
    id: 'daily-create-artifact',
    title: 'Forge Something New',
    description: 'Create at least one new artifact to expand your atlas.',
    isCompleted: (artifacts) => artifacts.length >= 9,
    xp: 10,
  },
  {
    id: 'daily-task-finish',
    title: 'Ship a Task',
    description: 'Complete a task and mark it as done.',
    isCompleted: (artifacts) => getCompletedTaskCount(artifacts) >= 1,
    xp: 12,
  },
  {
    id: 'daily-task-progress',
    title: 'Kick Off a Task',
    description: 'Move two tasks into progress to build momentum.',
    isCompleted: (artifacts) => countTasksInState(artifacts, TASK_STATE.InProgress) >= 2,
    xp: 9,
  },
  {
    id: 'daily-link-architect',
    title: 'Weave the Web',
    description: 'Link artifacts together until at least three relationships exist.',
    isCompleted: (artifacts) => getTotalRelations(artifacts) >= 3,
    xp: 14,
  },
  {
    id: 'daily-character-cast',
    title: 'Expand the Cast',
    description: 'Profile a second character to deepen your roster.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Character) >= 2,
    xp: 9,
  },
  {
    id: 'daily-location-cartographer',
    title: 'Map New Territory',
    description: 'Document a second location to enrich your world map.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Location) >= 2,
    xp: 9,
  },
  {
    id: 'daily-wiki-scribe',
    title: 'Deepen the Lore',
    description: 'Write at least 150 words across your wiki entries.',
    isCompleted: (artifacts) => getWikiWordCount(artifacts) >= 150,
    xp: 15,
  },
  {
    id: 'daily-timeline-chronicler',
    title: 'Log the Next Beat',
    description: 'Record enough timeline entries so one timeline holds three events.',
    isCompleted: (artifacts) => getMaxTimelineEventCount(artifacts) >= 3,
    xp: 8,
  },
  {
    id: 'daily-conlang-lexicographer',
    title: 'Grow the Lexicon',
    description: 'Record five lexemes across your conlangs.',
    isCompleted: (artifacts) => getConlangLexemeCount(artifacts) >= 5,
    xp: 11,
  },
  {
    id: 'daily-project-pulse',
    title: 'Maintain Momentum',
    description: 'Keep at least three projects active at once.',
    isCompleted: (_, projects) => countProjectsByStatus(projects, ProjectStatus.Active) >= 3,
    xp: 6,
  },
  {
    id: 'daily-scene-director',
    title: 'Storyboard a Scene',
    description: 'Create at least one scene artifact to visualize the story.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Scene) >= 1,
    xp: 8,
  },
  {
    id: 'daily-release-herald',
    title: 'Draft Release Notes',
    description: 'Add a release artifact summarizing your latest drop.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Release) >= 1,
    xp: 12,
  },
  {
    id: 'daily-faction-diplomat',
    title: 'Outline a Faction',
    description: 'Create a faction artifact to capture alliances and rivalries.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Faction) >= 1,
    xp: 11,
  },
  {
    id: 'daily-task-backlog',
    title: 'Balance the Backlog',
    description: 'Maintain at least three tasks to organize your workflow.',
    isCompleted: (artifacts) => countArtifactsByType(artifacts, ArtifactType.Task) >= 3,
    xp: 7,
  },
  {
    id: 'daily-relation-weaver',
    title: 'Connect the Threads',
    description: 'Ensure five artifacts each have at least one relationship.',
    isCompleted: (artifacts) => countArtifactsWithRelations(artifacts, 1) >= 5,
    xp: 16,
  },
  {
    id: 'daily-project-portfolio',
    title: 'Curate the Portfolio',
    description: 'Steward at least five total projects.',
    isCompleted: (_, projects) => projects.length >= 5,
    xp: 5,
  },
  {
    id: 'daily-task-streak',
    title: 'Ship a Trio',
    description: 'Complete three tasks to earn a burst of XP.',
    isCompleted: (artifacts) => getCompletedTaskCount(artifacts) >= 3,
    xp: 18,
  },
  {
    id: 'daily-character-depth',
    title: 'Detail the Cast',
    description: 'Record five character traits across your characters.',
    isCompleted: (artifacts) => getCharacterTraitCount(artifacts) >= 5,
    xp: 10,
  },
  {
    id: 'daily-tag-curator',
    title: 'Tag the Archive',
    description: 'Keep at least four artifacts richly tagged with two or more labels.',
    isCompleted: (artifacts) => countTaggedArtifacts(artifacts, 2) >= 4,
    xp: 9,
  },
  {
    id: 'daily-timeline-historian',
    title: 'Chronicle Two Eras',
    description: 'Maintain at least two timeline artifacts.',
    isCompleted: (artifacts) => countTimelineArtifacts(artifacts) >= 2,
    xp: 13,
  },
];

const DashboardShellPlaceholder: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div className="min-h-screen flex flex-col bg-slate-950">
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/70 px-4 sm:px-8 py-3">
      <div className="flex items-center gap-3">
        <CubeIcon className="w-7 h-7 text-cyan-400" />
        <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
      </div>
    </header>
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4" aria-live="polite">
        <div className="flex items-center justify-center">
          <div
            aria-hidden="true"
            className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent"
          ></div>
        </div>
        <p className="text-sm text-slate-300">
          {loading
            ? 'Preparing your Creative Atlas workspace…'
            : 'Your workspace is almost ready. If this message persists, please refresh the page.'}
        </p>
      </div>
    </main>
  </div>
);

const getCurrentDateKey = () => new Date().toISOString().slice(0, 10);

const createSeedFromString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const selectDailyQuestsForDate = (dateKey: string, count = DAILY_QUESTS_PER_DAY): Quest[] => {
  const seed = createSeedFromString(dateKey);
  const random = mulberry32(seed);
  const pool = [...DAILY_QUEST_POOL];
  const selection: Quest[] = [];
  const questCount = Math.min(count, pool.length);

  for (let index = 0; index < questCount; index += 1) {
    const choiceIndex = Math.floor(random() * pool.length);
    selection.push(pool.splice(choiceIndex, 1)[0]);
  }

  return selection;
};

const achievements: Achievement[] = [
    { id: 'ach-1', title: 'World Builder', description: 'Create your first project.', isUnlocked: (_, projects) => projects.length >= 1 },
    { id: 'ach-2', title: 'Polyglot', description: 'Create a Conlang artifact.', isUnlocked: (artifacts) => artifacts.some(a => a.type === ArtifactType.Conlang) },
    { id: 'ach-3', title: 'Cartographer', description: 'Create a Location artifact.', isUnlocked: (artifacts) => artifacts.some(a => a.type === ArtifactType.Location) },
    { id: 'ach-4', title: 'Connector', description: 'Link 3 artifacts together.', isUnlocked: (artifacts) => artifacts.reduce((acc, a) => acc + a.relations.length, 0) >= 3 },
];

const questlines: Questline[] = [
    {
        id: 'momentum-ritual',
        title: 'Momentum Ritual',
        summary: 'Lock in daily habits once you cross into Level 2.',
        unlockLevel: 2,
        objectives: [
            {
                id: 'momentum-streak-3',
                title: 'Keep the flame burning',
                description: 'Earn XP on three consecutive days to prove the habit is real.',
                xpReward: 20,
                isCompleted: (_, __, profile) => profile.bestStreak >= 3,
            },
            {
                id: 'momentum-links-5',
                title: 'Weave five links',
                description: 'Create at least five artifact relationships across your worlds.',
                xpReward: 15,
                isCompleted: (artifacts) => artifacts.reduce((total, artifact) => total + artifact.relations.length, 0) >= 5,
            },
            {
                id: 'momentum-ship-artifact',
                title: 'Ship a finished artifact',
                description: 'Mark any artifact as released or done to celebrate a drop.',
                xpReward: 15,
                isCompleted: (artifacts) =>
                    artifacts.some((artifact) => {
                        const status = artifact.status?.toLowerCase() ?? '';
                        return status === 'released' || status === 'done';
                    }),
            },
        ],
    },
    {
        id: 'launch-cadence',
        title: 'Launch Cadence',
        summary: 'At Level 4, turn streaks into dependable release rituals.',
        unlockLevel: 4,
        objectives: [
            {
                id: 'cadence-streak-7',
                title: 'Seven-day streak',
                description: 'Sustain a seven-day creation streak.',
                xpReward: 30,
                isCompleted: (_, __, profile) => profile.bestStreak >= 7,
            },
            {
                id: 'cadence-tasks-complete',
                title: 'Finish three tasks',
                description: 'Complete three Task artifacts to clear a sprint.',
                xpReward: 25,
                isCompleted: (artifacts) =>
                    artifacts.filter(
                        (artifact) =>
                            artifact.type === ArtifactType.Task &&
                            (artifact.data as TaskData | undefined)?.state === TASK_STATE.Done,
                    ).length >= 3,
            },
            {
                id: 'cadence-link-density',
                title: 'Link ten artifacts',
                description: 'Ensure at least ten artifacts are linked into your graph.',
                xpReward: 25,
                isCompleted: (artifacts) => artifacts.filter((artifact) => artifact.relations.length > 0).length >= 10,
            },
        ],
    },
];

const templateLibrary: TemplateCategory[] = [
    {
        id: 'tamenzut',
        title: 'Tamenzut Series',
        description: 'High-fantasy seeds that keep the Tamenzut saga consistent from novel to novel.',
        recommendedFor: ['Tamenzut'],
        relatedProjectTemplateIds: ['conlang-workbench', 'world-wiki-launchpad', 'tamenzut-series-bible'],
        templates: [
            { id: 'tam-magic-system', name: 'MagicSystem', type: ArtifactType.MagicSystem, description: 'Document the laws, costs, and taboos of threadweaving.', tags: ['magic', 'systems'] },
            { id: 'tam-rulebook', name: 'Rulebook', type: ArtifactType.Wiki, description: 'Capture canon rulings, rituals, and battle procedures.', tags: ['canon', 'reference'] },
            { id: 'tam-city', name: 'City', type: ArtifactType.Location, description: 'Map out districts, factions, and sensory details for a key metropolis.', tags: ['location'] },
            { id: 'tam-faction', name: 'Faction', type: ArtifactType.Faction, description: 'Describe loyalties, resources, and political goals.', tags: ['faction', 'relationships'] },
            { id: 'tam-edruel', name: 'Edruel Ruins', type: ArtifactType.Location, description: 'Archaeological log for the ruin that anchors the main mystery.', tags: ['lore'] },
            { id: 'tam-thread-log', name: 'ThreadWeaving Log', type: ArtifactType.MagicSystem, description: 'Track legendary spells, their casters, and outcomes.', tags: ['magic', 'log'] },
            { id: 'tam-canon', name: 'Canon Tracker', type: ArtifactType.Wiki, description: 'Record continuity-sensitive facts, pronunciations, and prophecies.', tags: ['continuity'] },
        ],
    },
    {
        id: 'steamweave',
        title: 'Steamweave / Anya',
        description: 'Coal-punk ops boards for Anya’s guild drama and gadgeteering.',
        recommendedFor: ['Steamweave'],
        relatedProjectTemplateIds: ['serial-comic-kit'],
        templates: [
            { id: 'steam-clan', name: 'Clan', type: ArtifactType.Faction, description: 'Roster clan leadership, ranks, and rivalries.', tags: ['faction'] },
            { id: 'steam-workshop', name: 'Workshop', type: ArtifactType.Location, description: 'Layout stations, ongoing inventions, and supply flows.', tags: ['location', 'operations'] },
            { id: 'steam-scene', name: 'Scene', type: ArtifactType.Scene, description: 'Storyboard high-tension coal-punk set pieces.', tags: ['story'] },
            { id: 'steam-villain', name: 'Villain (Red-Eyes)', type: ArtifactType.Character, description: 'Profile motives, tactics, and weaknesses of Red-Eyes.', tags: ['character', 'antagonist'] },
            { id: 'steam-triangle', name: 'Love Triangle Map', type: ArtifactType.Wiki, description: 'Visualize relationship beats and emotional stakes.', tags: ['relationships'] },
            { id: 'steam-release', name: 'Release Notes', type: ArtifactType.Release, description: 'Translate updates into flavorful patch notes for collaborators.', tags: ['delivery'] },
        ],
    },
    {
        id: 'dustland',
        title: 'Dustland RPG',
        description: 'Retro CRT RPG modules for Dustland\'s persona-driven world-simulation.',
        recommendedFor: ['Dustland'],
        relatedProjectTemplateIds: ['game-design-lab'],
        templates: [
            { id: 'dust-module', name: 'Module', type: ArtifactType.Wiki, description: 'Outline module scope, level bands, and key beats.', tags: ['campaign'] },
            { id: 'dust-quest', name: 'Quest', type: ArtifactType.Task, description: 'Track objectives, rewards, and branching outcomes.', tags: ['quest'] },
            { id: 'dust-mask', name: 'Persona Mask', type: ArtifactType.MagicSystem, description: 'Detail roleplay cues, stat shifts, and hidden agendas unlocked by a mask.', tags: ['identity'] },
            { id: 'dust-npc', name: 'NPC', type: ArtifactType.Character, description: 'Profile allies, merchants, and nemeses with quick hooks.', tags: ['npc'] },
            { id: 'dust-item', name: 'Item', type: ArtifactType.Wiki, description: 'Catalog relics, crafting components, and upgrades.', tags: ['loot'] },
            { id: 'dust-tileset', name: 'Tileset', type: ArtifactType.Location, description: 'Collect reusable battle maps and environmental hazards.', tags: ['maps'] },
            { id: 'dust-memory', name: 'World Memory Log', type: ArtifactType.Wiki, description: 'Track persistent state changes, scars, and echoes across playthroughs.', tags: ['systems'] },
            { id: 'dust-effect', name: 'Effect Pack', type: ArtifactType.MagicSystem, description: 'Bundle event-driven transformations and ambient triggers.', tags: ['events'] },
            { id: 'dust-build', name: 'Build', type: ArtifactType.Character, description: 'Record loadouts, persona synergies, and playtest notes.', tags: ['characters'] },
        ],
    },
    {
        id: 'spatch',
        title: 'Spatch League',
        description: 'Sports-drama templates tuned for the Spatch comic universe.',
        recommendedFor: ['Spatch'],
        relatedProjectTemplateIds: ['serial-comic-kit'],
        templates: [
            { id: 'spatch-team', name: 'Team', type: ArtifactType.Faction, description: 'Roster starters, strategies, and rival teams.', tags: ['team'] },
            { id: 'spatch-mentor', name: 'Mentor', type: ArtifactType.Character, description: 'Capture training montages, philosophies, and signature drills.', tags: ['character'] },
            { id: 'spatch-rule', name: 'Rule Variant', type: ArtifactType.Wiki, description: 'Document variant mechanics and how they change match flow.', tags: ['rules'] },
            { id: 'spatch-match', name: 'Match', type: ArtifactType.WebComic, description: 'Plan panels, momentum swings, and highlight reels.', tags: ['comic'] },
            { id: 'spatch-board', name: 'Panel Board', type: ArtifactType.Timeline, description: 'Block out page layouts and pacing for episodes.', tags: ['storyboard'] },
        ],
    },
    {
        id: 'darv',
        title: 'Darv Conlang',
        description: 'Linguistic workbench for the ancient language of the Darv.',
        recommendedFor: ['Darv'],
        relatedProjectTemplateIds: ['conlang-workbench'],
        templates: [
            { id: 'darv-lexicon', name: 'Lexicon', type: ArtifactType.Conlang, description: 'List lemmas, glosses, and phonological notes.', tags: ['language'] },
            { id: 'darv-phonology', name: 'Phonology', type: ArtifactType.Wiki, description: 'Summarize phonemes, clusters, and stress rules.', tags: ['language'] },
            { id: 'darv-paradigm', name: 'Paradigm', type: ArtifactType.Wiki, description: 'Lay out conjugation or declension tables.', tags: ['grammar'] },
            { id: 'darv-proverb', name: 'Proverb', type: ArtifactType.Wiki, description: 'Capture idioms with cultural context and translations.', tags: ['culture'] },
            { id: 'darv-myth', name: 'Myth', type: ArtifactType.ShortStory, description: 'Outline myths and legends tied to linguistic lore.', tags: ['story'] },
        ],
    },
    {
        id: 'sacred-truth',
        title: 'Sacred Truth Dossiers',
        description: 'Supernatural investigation kits for the Sacred Truth vampire saga.',
        recommendedFor: ['Sacred Truth'],
        relatedProjectTemplateIds: ['world-wiki-launchpad', 'sacred-truth-vampires'],
        templates: [
            { id: 'sacred-episode', name: 'Episode', type: ArtifactType.Audiobook, description: 'Script a narrated case-of-the-week with cold opens and cliffhangers.', tags: ['story', 'audio'] },
            { id: 'sacred-case', name: 'Case File', type: ArtifactType.Timeline, description: 'Log evidence, suspects, and unresolved leads.', tags: ['mystery'] },
            { id: 'sacred-codex', name: 'Monster Codex', type: ArtifactType.Wiki, description: 'Detail monster biology, tells, and encounter best practices.', tags: ['bestiary'] },
            { id: 'sacred-cathedral', name: 'Cathedral Asset', type: ArtifactType.Location, description: 'Catalog lairs, safe houses, and relic vaults.', tags: ['location'] },
        ],
    },
];

const projectTemplates: ProjectTemplate[] = [
    {
        id: 'tamenzut-series-bible',
        name: 'Tamenzut Series Bible',
        description: 'Magic systems, canon trackers, and city profiles for the Tamenzut saga.',
        recommendedFor: ['Tamenzut'],
        relatedCategoryIds: ['tamenzut'],
        projectTags: ['novel', 'fantasy', 'magic'],
        artifacts: [
            {
                title: 'Magic System Overview',
                type: ArtifactType.MagicSystem,
                summary: 'Define the rules and consequences of threadweaving.',
                status: 'draft',
                tags: ['magic', 'rules'],
                data: createTamenzutMagicSystemData(),
            },
            {
                title: 'Threadweaving Rulebook',
                type: ArtifactType.Wiki,
                summary: 'Comprehensive guide to magic mechanics, costs, and limitations.',
                status: 'draft',
                tags: ['magic', 'reference'],
                data: { content: '# Threadweaving Rulebook\n\n## Core Mechanics\n- How threadweaving works\n\n## Costs & Consequences\n- Price of magic\n\n## Restrictions\n- What cannot be done' },
            },
            {
                title: 'Canon Tracker',
                type: ArtifactType.Wiki,
                summary: 'Log continuity-sensitive details, from character lineage to prophecies.',
                status: 'in-progress',
                tags: ['canon', 'continuity'],
                data: { content: '# Canon Tracker\n\n## Core Principles\n- Document foundational truths here.\n\n## Open Questions\n- What needs clarification?' },
            },
            {
                title: 'Primary City Profile',
                type: ArtifactType.Location,
                summary: 'Flesh out the main city, its districts, and its role in the narrative.',
                status: 'draft',
                tags: ['location', 'city'],
                data: {
                    description: 'The central hub of the first novel.',
                    features: [
                        { id: 'tmpl-feature-2', name: "Weaver's Spire", description: 'The center of magical learning and intrigue.' },
                    ],
                },
            },
            {
                title: 'Major Faction Overview',
                type: ArtifactType.Faction,
                summary: 'Document the key political and magical factions shaping the world.',
                status: 'idea',
                tags: ['factions', 'politics'],
            },
            {
                title: 'Edruel Ruins',
                type: ArtifactType.Location,
                summary: 'Ancient ruins holding secrets of the old magic.',
                status: 'draft',
                tags: ['location', 'ruins', 'ancient'],
                data: {
                    description: 'The Edruel Ruins are remnants of a civilization that mastered threadweaving before it was lost.',
                    features: [
                        { id: 'edruel-feature-1', name: 'The Spire of Echoes', description: 'A tower that amplifies magical resonance.' },
                        { id: 'edruel-feature-2', name: 'The Forgotten Archive', description: 'A library containing pre-cataclysm knowledge.' },
                    ],
                },
            },
            {
                title: 'Thread-Weaving Log',
                type: ArtifactType.Wiki,
                summary: 'Record specific uses of magic throughout the story for consistency.',
                status: 'in-progress',
                tags: ['magic', 'log'],
                data: { content: '# Thread-Weaving Log\n\n## Chapter 1\n- Magic uses and effects\n\n## Chapter 2\n- Continued tracking' },
            },
        ],
    },
    {
        id: 'serial-comic-kit',
        name: 'Serial Comic Kit',
        description: 'Story arcs, cast rosters, and production tasks tuned for episodic comics.',
        recommendedFor: ['Spatch', 'Steamweave'],
        relatedCategoryIds: ['steamweave', 'spatch'],
        projectTags: ['comic', 'storyboard', 'production'],
        artifacts: [
            {
                title: 'Season Roadmap',
                type: ArtifactType.WebComic,
                summary: 'Outline upcoming arcs, spotlight issues, and publishing cadence.',
                status: 'draft',
                tags: ['roadmap', 'issues'],
            },
            {
                title: 'Cast Gallery',
                type: ArtifactType.Character,
                summary: 'Snapshot bios, motivations, and relationship notes for the main cast.',
                status: 'idea',
                tags: ['characters', 'reference'],
            },
            {
                title: 'Key Scene Beats',
                type: ArtifactType.Scene,
                summary: 'Critical emotional moments and action sequences across the arc.',
                status: 'draft',
                tags: ['scenes', 'beats'],
            },
            {
                title: 'Clan/Team Roster',
                type: ArtifactType.Faction,
                summary: 'Define team dynamics, rivalries, and organizational structure.',
                status: 'draft',
                tags: ['team', 'clan'],
            },
            {
                title: 'Workshop/Training Ground',
                type: ArtifactType.Location,
                summary: 'The central location where characters gather and conflicts unfold.',
                status: 'draft',
                tags: ['location', 'recurring'],
                data: {
                    description: 'A key gathering place for the cast.',
                    features: [
                        { id: 'workshop-feature-1', name: 'Main Hall', description: 'Central meeting and training area.' },
                    ],
                },
            },
            {
                title: 'Antagonist Profile',
                type: ArtifactType.Character,
                summary: 'Detailed breakdown of the main villain, their motivations and methods.',
                status: 'draft',
                tags: ['villain', 'antagonist'],
                data: {
                    bio: 'The primary antagonist whose actions drive the central conflict.',
                    traits: [
                        { id: 'villain-trait-1', trait: 'Ruthless' },
                        { id: 'villain-trait-2', trait: 'Strategic' },
                    ],
                },
            },
            {
                title: 'Relationship Map',
                type: ArtifactType.Wiki,
                summary: 'Track romantic tensions, friendships, and emotional conflicts.',
                status: 'draft',
                tags: ['relationships', 'drama'],
                data: { content: '# Relationship Map\n\n## Love Triangle\n- Character A ↔ Character B ↔ Character C\n\n## Friendships\n- Key alliances\n\n## Rivalries\n- Competitive dynamics' },
            },
            {
                title: 'Panel Board Planner',
                type: ArtifactType.Scene,
                summary: 'Visual layout planning for key comic pages and splash moments.',
                status: 'idea',
                tags: ['panels', 'layout'],
            },
            {
                title: 'Match/Encounter Tracker',
                type: ArtifactType.Wiki,
                summary: 'Log key competitions, battles, or confrontations with outcomes.',
                status: 'draft',
                tags: ['matches', 'events'],
                data: { content: '# Match Tracker\n\n## Season 1\n- Match 1: Teams and outcome\n- Match 2: Key moments\n\n## Rule Variants\n- Special rules for different match types' },
            },
            {
                title: 'Mentor Character',
                type: ArtifactType.Character,
                summary: 'The wise guide who shapes the protagonist\'s journey.',
                status: 'draft',
                tags: ['mentor', 'guide'],
            },
            {
                title: 'Issue Sprint Backlog',
                type: ArtifactType.Task,
                summary: 'Track page breakdowns, lettering, and marketing beats for the next drop.',
                status: 'in-progress',
                tags: ['sprint', 'release'],
                data: { state: TASK_STATE.InProgress } as TaskData,
            },
            {
                title: 'Release Notes Template',
                type: ArtifactType.Wiki,
                summary: 'Format for announcing new issues with teasers and creator notes.',
                status: 'draft',
                tags: ['marketing', 'release'],
                data: { content: '# Issue Release Notes\n\n## What\'s New\n- Key story beats (no spoilers)\n\n## Creator Commentary\n- Behind the scenes\n\n## Next Issue Teaser\n- Hook for next release' },
            },
        ],
    },
    {
        id: 'conlang-workbench',
        name: 'Conlang Workbench',
        description: 'Lexicon, grammar notes, and workflow tasks for language-building.',
        recommendedFor: ['Tamenzut', 'Darv'],
        relatedCategoryIds: ['tamenzut', 'darv'],
        projectTags: ['conlang', 'language'],
        artifacts: [
            {
                title: 'Lexicon Seed',
                type: ArtifactType.Conlang,
                summary: 'Kick off vocabulary batches with phonotactics and thematic tags.',
                status: 'draft',
                tags: ['lexicon'],
                data: [
                    { id: 'tmpl-lex-1', lemma: 'salar', pos: 'n', gloss: 'ember-forged song' },
                    { id: 'tmpl-lex-2', lemma: 'vith', pos: 'adj', gloss: 'woven with starlight' },
                ] as ConlangLexeme[],
            },
            {
                title: 'Phonology System',
                type: ArtifactType.Wiki,
                summary: 'Define consonants, vowels, phonotactics, and sound changes.',
                status: 'draft',
                tags: ['phonology', 'sounds'],
                data: { content: '# Phonology\n\n## Consonants\n- Inventory: p t k b d g m n s h\n\n## Vowels\n- Basic: a e i o u\n\n## Phonotactics\n- Syllable structure: (C)V(C)\n\n## Sound Changes\n- Historical shifts and dialectal variations' },
            },
            {
                title: 'Grammar Notes',
                type: ArtifactType.Wiki,
                summary: 'Document morphology, syntax quirks, and inspiration languages.',
                status: 'idea',
                tags: ['reference'],
                data: { content: '## Phonology\n- Consonant harmony sketch\n\n## Morphology\n- Case markers TBD' },
            },
            {
                title: 'Morphological Paradigms',
                type: ArtifactType.Wiki,
                summary: 'Conjugation tables, declension patterns, and grammatical categories.',
                status: 'draft',
                tags: ['grammar', 'paradigms'],
                data: { content: '# Morphological Paradigms\n\n## Noun Declension\n- Nominative, Accusative, Genitive cases\n\n## Verb Conjugation\n- Present, Past, Future tenses\n\n## Affixes\n- Derivational and inflectional morphology' },
            },
            {
                title: 'Proverbs & Sayings',
                type: ArtifactType.Wiki,
                summary: 'Collect cultural wisdom and idiomatic expressions in the language.',
                status: 'idea',
                tags: ['culture', 'idioms'],
                data: { content: '# Proverbs\n\n## Common Sayings\n- Add proverbs with translations\n\n## Cultural Context\n- What these sayings reveal about speakers' },
            },
            {
                title: 'Creation Myths',
                type: ArtifactType.Story,
                summary: 'Origin stories and legends told in the conlang to establish voice.',
                status: 'draft',
                tags: ['mythology', 'narrative'],
            },
            {
                title: 'Phonology Recording Sprint',
                type: ArtifactType.Task,
                summary: 'Capture sound samples and finalize the consonant inventory.',
                status: 'todo',
                tags: ['audio', 'phonology'],
            },
        ],
    },
    {
        id: 'game-design-lab',
        name: 'Game Design Lab',
        description: 'Gameplay loops, system glossaries, and playtest backlogs for interactive worlds.',
        recommendedFor: ['Dustland'],
        relatedCategoryIds: ['dustland'],
        projectTags: ['game', 'systems'],
        artifacts: [
            {
                title: 'Core Loop Prototype',
                type: ArtifactType.Game,
                summary: 'Define what players do minute-to-minute and the rewards that fuel repeat sessions.',
                status: 'draft',
                tags: ['core-loop', 'prototype'],
            },
            {
                title: 'Game Module Template',
                type: ArtifactType.GameModule,
                summary: 'Reusable adventure or level structure with encounters and rewards.',
                status: 'draft',
                tags: ['module', 'adventure'],
            },
            {
                title: 'Quest Design',
                type: ArtifactType.Wiki,
                summary: 'Quest chains, objectives, and branching narrative paths.',
                status: 'draft',
                tags: ['quests', 'narrative'],
                data: { content: '# Quest Design\n\n## Main Quest Chain\n- Primary story objectives\n\n## Side Quests\n- Optional content\n\n## Branching Paths\n- Player choice consequences' },
            },
            {
                title: 'Persona Mask System',
                type: ArtifactType.MagicSystem,
                summary: 'Character class/archetype mechanics unique to Dustland.',
                status: 'draft',
                tags: ['personas', 'classes'],
            },
            {
                title: 'NPC Database',
                type: ArtifactType.Character,
                summary: 'Non-player characters with dialogue, quests, and relationships.',
                status: 'draft',
                tags: ['npc', 'characters'],
            },
            {
                title: 'Item Catalog',
                type: ArtifactType.Wiki,
                summary: 'Weapons, artifacts, consumables with stats and lore.',
                status: 'draft',
                tags: ['items', 'loot'],
                data: { content: '# Item Catalog\n\n## Weapons\n- Name, stats, special properties\n\n## Artifacts\n- Unique items with lore\n\n## Consumables\n- Potions, scrolls, temporary buffs' },
            },
            {
                title: 'Tileset & Asset List',
                type: ArtifactType.Wiki,
                summary: 'Visual assets, environmental pieces, and sprite requirements.',
                status: 'idea',
                tags: ['assets', 'art'],
                data: { content: '# Tileset & Assets\n\n## Environment Tiles\n- Dungeon, town, wilderness\n\n## Character Sprites\n- Player and NPC art requirements\n\n## Special Effects\n- Magic, combat, environmental' },
            },
            {
                title: 'Build Tracker',
                type: ArtifactType.Release,
                summary: 'Version history, feature milestones, and build notes.',
                status: 'draft',
                tags: ['builds', 'releases'],
            },
            {
                title: 'Mechanics Glossary',
                type: ArtifactType.MagicSystem,
                summary: 'Catalog resources, ability cooldowns, and failure states.',
                status: 'idea',
                tags: ['mechanics'],
            },
            {
                title: 'Playtest Feedback Backlog',
                type: ArtifactType.Task,
                summary: 'Triage insights from the latest playtest into actionable follow-ups.',
                status: 'in-progress',
                tags: ['playtest'],
                data: { state: TASK_STATE.InProgress } as TaskData,
            },
            {
                title: 'Design Log',
                type: ArtifactType.Wiki,
                summary: 'Chronicle key decisions, questions, and experiments.',
                status: 'draft',
                tags: ['journal'],
                data: { content: '## Decisions\n- Note major pivots here\n\n## Open Questions\n- Capture follow-ups from playtests' },
            },
        ],
    },
    {
        id: 'world-wiki-launchpad',
        name: 'World Wiki Launchpad',
        description: 'Knowledge base scaffolding for lore-heavy worlds and collaborative wikis.',
        recommendedFor: ['Tamenzut', 'Sacred Truth'],
        relatedCategoryIds: ['tamenzut', 'sacred-truth'],
        projectTags: ['wiki', 'lore'],
        artifacts: [
            {
                title: 'World Encyclopedia',
                type: ArtifactType.Wiki,
                summary: 'Master index for timelines, factions, and canon checkpoints.',
                status: 'draft',
                tags: ['index'],
                data: { content: '# World Encyclopedia\n\n## Overview\n- Establish tone and era\n\n## Canon Queue\n- Pending lore to verify' },
            },
            {
                title: 'Starting Region Profile',
                type: ArtifactType.Location,
                summary: 'Describe the primary hub with landmarks, cultures, and conflicts.',
                status: 'draft',
                tags: ['location', 'hub'],
                data: {
                    description: 'Sketch the climate, sensory beats, and why this region matters to newcomers.',
                    features: [
                        { id: 'tmpl-feature-1', name: 'Beacon Market', description: 'Central plaza where rumors and quests surface.' },
                    ],
                },
            },
            {
                title: 'Faction Briefs Backlog',
                type: ArtifactType.Task,
                summary: 'List the organizations you still need to document and their urgency.',
                status: 'todo',
                tags: ['factions', 'backlog'],
            },
        ],
    },
    {
        id: 'sacred-truth-vampires',
        name: 'Sacred Truth (Vampires)',
        description: 'Episodic investigation toolkit for supernatural detective stories.',
        recommendedFor: ['Sacred Truth'],
        relatedCategoryIds: ['sacred-truth'],
        projectTags: ['vampires', 'mystery', 'supernatural'],
        artifacts: [
            {
                title: 'Episode Outline',
                type: ArtifactType.Chapter,
                summary: 'Structure acts, reveals, and cliffhangers for a single episode.',
                status: 'draft',
                tags: ['episode', 'structure'],
            },
            {
                title: 'Case File Template',
                type: ArtifactType.Wiki,
                summary: 'Document investigations, suspects, evidence, and supernatural elements.',
                status: 'draft',
                tags: ['investigation', 'case'],
                data: { content: '# Case File\n\n## Victim/Incident\n- Details TBD\n\n## Suspects\n- List key suspects\n\n## Evidence\n- Physical and supernatural\n\n## Resolution\n- Notes on how this case resolves' },
            },
            {
                title: 'Monster Codex',
                type: ArtifactType.Wiki,
                summary: 'Catalog vampires, supernatural entities, and their rules/weaknesses.',
                status: 'draft',
                tags: ['monsters', 'lore'],
                data: { content: '# Monster Codex\n\n## Vampire Types\n- Classical vs Modern\n\n## Powers & Weaknesses\n- Document supernatural abilities\n\n## Historical Notes\n- Ancient lineages and conflicts' },
            },
            {
                title: 'Cathedral Asset Reference',
                type: ArtifactType.Location,
                summary: 'Detail the cathedral setting, its secrets, and recurring locations.',
                status: 'draft',
                tags: ['location', 'cathedral'],
                data: {
                    description: 'The ancient cathedral serves as both sanctuary and crime scene.',
                    features: [
                        { id: 'sacred-feature-1', name: 'Crypt', description: 'Underground chambers holding dark secrets.' },
                        { id: 'sacred-feature-2', name: 'Bell Tower', description: 'Observation point and refuge.' },
                    ],
                },
            },
        ],
    },
];

const getDefaultDataForType = (type: ArtifactType, title?: string): Artifact['data'] => {
    if (type === ArtifactType.Scene || isNarrativeArtifactType(type) || type === ArtifactType.Conlang) {
        return [];
    }

    switch (type) {
        case ArtifactType.Task:
            return { state: TASK_STATE.Todo } as TaskData;
        case ArtifactType.Character:
            return { bio: '', traits: [] };
        case ArtifactType.Wiki:
            return { content: `# ${title ?? 'Untitled'}\n\n` };
        case ArtifactType.Location:
            return { description: '', features: [] };
        case ArtifactType.Timeline:
            return { events: [] };
        case ArtifactType.MagicSystem:
            return createBlankMagicSystemData(title);
        default:
            return {};
    }
};

const milestoneRoadmap: Milestone[] = [
    {
        id: 'm1',
        title: 'M1 — MVP',
        timeline: 'Weeks 1–4',
        focus: 'Ship the graph-native core so ideas can be captured, linked, and exported.',
        objectives: [
            {
                id: 'm1-core-graph',
                description: 'Core graph model, Projects/Artifacts/Relations',
                metric: 'graph-core',
            },
            {
                id: 'm1-seed-capture',
                description: 'Seed capture, Table view, basic Graph view',
                metric: 'view-engagement',
            },
            {
                id: 'm1-csv-flows',
                description: 'CSV import/export (artifacts, relations)',
                metric: 'csv-flows',
            },
            {
                id: 'm1-github-import',
                description: 'GitHub read-only import (repos/issues/releases)',
                metric: 'github-import',
            },
        ],
    },
    {
        id: 'm2',
        title: 'M2 — Editors & Gamification',
        timeline: 'Weeks 5–8',
        focus: 'Deepen creation flows with rich editors and playful progression loops.',
        objectives: [
            {
                id: 'm2-rich-editors',
                description: 'Conlang table editor; Storyboard; Kanban',
                metric: 'rich-editors',
            },
            {
                id: 'm2-progression',
                description: 'XP/Streaks/Quests + Achievements',
                metric: 'progression-loops',
            },
            {
                id: 'm2-markdown',
                description: 'Markdown bundle export',
                metric: 'markdown-export',
            },
        ],
    },
    {
        id: 'm3',
        title: 'M3 — Publishing & Integrations',
        timeline: 'Weeks 9–12',
        focus: 'Publish worlds outward with search, release tooling, and static sites.',
        objectives: [
            {
                id: 'm3-static-site',
                description: 'Static site exporter (Wikis/Docs)',
                metric: 'static-site',
            },
            {
                id: 'm3-release-bard',
                description: 'Release notes generator',
                metric: 'release-notes',
            },
            {
                id: 'm3-search',
                description: 'Search (Meilisearch), advanced filters',
                metric: 'search-filters',
            },
        ],
    },
    {
        id: 'm4',
        title: 'M4 — Polish & Extensibility',
        timeline: 'Weeks 13–16',
        focus: 'Open the universe with plugins, theming, and offline-friendly polish.',
        objectives: [
            {
                id: 'm4-plugin-api',
                description: 'Plugin API + 3 sample plugins (conlang, webcomic, ai prompts)',
                metric: 'plugin-api',
            },
            {
                id: 'm4-theming-offline',
                description: 'Theming, keyboard palette, offline cache (light)',
                metric: 'theming-offline',
            },
        ],
    },
    {
        id: 'm5',
        title: 'M5 — World Simulation Layer',
        timeline: 'Weeks 17–20',
        focus: 'Codify physics, chart era drift, and map faction memory.',
        objectives: [
            {
                id: 'm5-magic-constraints',
                description: 'Magic system codex with constraint annotations',
                metric: 'magic-systems',
            },
            {
                id: 'm5-world-age',
                description: 'World age progression and continuity span heatmap',
                metric: 'world-age',
            },
            {
                id: 'm5-faction-conflicts',
                description: 'Faction tension grid with rivalries and alliances logged',
                metric: 'faction-conflicts',
            },
            {
                id: 'm5-npc-memory',
                description: 'NPC memory map linking cast appearances across artifacts',
                metric: 'npc-memory',
            },
        ],
    },
];

const aiAssistants: AIAssistant[] = [
    {
        id: 'lore-weaver',
        name: 'Lore Weaver',
        description: 'Expands summaries, suggests links, and weaves conflict matrices so the universe feels alive.',
        focus: 'Narrative expansion & connective tissue',
        promptSlots: [
            'synth_outline(projectId, artifactId, tone, constraints)',
            'link_matrix(projectId, focusArtifactId)',
            'conflict_web(projectId)',
        ],
    },
    {
        id: 'conlang-smith',
        name: 'Conlang Smith',
        description: 'Batches lexemes, paradigm tables, and example sentences to grow fictional languages fast.',
        focus: 'Language design & lexicon growth',
        promptSlots: [
            'lexeme_seed(conlangId, phonotactics, needed_pos)',
            'paradigm_table(conlangId, partOfSpeech)',
            'example_sentences(conlangId, register)',
        ],
    },
    {
        id: 'story-doctor',
        name: 'Story Doctor',
        description: 'Diagnoses beats, tension curves, and recommends comp titles for strong narrative pacing.',
        focus: 'Story health & pacing diagnostics',
        promptSlots: [
            'beat_diagnostic(projectId, artifactId)',
            'tension_graph(projectId, artifactId)',
            'comp_titles(genre, wordcount)',
        ],
    },
    {
        id: 'release-bard',
        name: 'Release Bard',
        description: 'Turns changelogs into narrative release notes and scripts launch trailers.',
        focus: 'Publishing voice & launch storytelling',
        promptSlots: [
            'patch_notes(repo, tag_range, audience)',
            'release_story(projectId, milestoneId, tone)',
            'trailer_script(projectId, duration)',
        ],
    },
    {
        id: 'muse-of-sparks',
        name: 'Muse of Sparks',
        description: 'Combines inspiration cards into scene seeds, tone shifts, and sensory palettes on demand.',
        focus: 'Prompt alchemy & vibe modulation',
        promptSlots: [
            'blend_prompts(cardIds, desired_mood)',
            'sensory_palette(setting, emotion)',
            'surprise_twist(characterId, constraint)',
        ],
    },
    {
        id: 'canon-warden',
        name: 'Canon Warden',
        description: 'Cross-checks continuity monitor warnings and proposes fixes before contradictions land on the page.',
        focus: 'Continuity & canon defense',
        promptSlots: [
            'continuity_audit(projectId)',
            'timeline_harmonizer(timelineId)',
            'character_return_plan(characterId, urgency)',
        ],
    },
    {
        id: 'arc-archivist',
        name: 'Arc Archivist',
        description: 'Tracks character beats across scenes to recommend callbacks and memory sync checkpoints.',
        focus: 'Arc tracking & memory syncing',
        promptSlots: [
            'arc_outline(characterId, beats)',
            'memory_sync(planId)',
            'callback_recommendations(sceneId)',
        ],
    },
];





export default function App() {
  const {
    projects,
    artifacts,
    profile,
    loading,
    error,
    clearError,
    memoryConversations,
    updateMemorySuggestionStatus,
    addXp,
    updateProfile,
    ensureProjectArtifacts,
    createProject,
    updateProject,
    deleteProject,
    createArtifact,
    createArtifactsBulk,
    updateArtifact,
    deleteArtifact,
    mergeArtifacts,
    canLoadMoreProjects,
    loadMoreProjects,
  } = useUserData();
  const { signOutUser, getIdToken, isGuestMode } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | null>(null);
  const [isQuickFactModalOpen, setIsQuickFactModalOpen] = useState(false);
  const [isSavingQuickFact, setIsSavingQuickFact] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'graph' | 'kanban'>('table');
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<'ALL' | ArtifactType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [dailyQuestDayKey, setDailyQuestDayKey] = useState<string>(() => getCurrentDateKey());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [projectActivityLog, setProjectActivityLog] = useState<Record<string, ProjectActivity>>({});
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = useState(false);
  const [isTutorialVisible, setIsTutorialVisible] = useState(true);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string } | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [areInsightsCollapsed, setAreInsightsCollapsed] = useState(true);
  const [areTasksCollapsed, setAreTasksCollapsed] = useState(true);
  const dataApiEnabled = isDataApiConfigured && !isGuestMode;
  
  const triggerDownload = useCallback((blob: Blob, filename:string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(tomorrow.getTime() - now.getTime(), 0);
    const timeout = window.setTimeout(() => {
      setDailyQuestDayKey(getCurrentDateKey());
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dailyQuestDayKey]);

  const todaysDailyQuests = useMemo(
    () => selectDailyQuestsForDate(dailyQuestDayKey),
    [dailyQuestDayKey],
  );

  const projectConversations = useMemo(
    () =>
      selectedProjectId
        ? memoryConversations.filter((conversation) => conversation.projectId === selectedProjectId)
        : [],
    [memoryConversations, selectedProjectId],
  );

  const handleMemoryStatusChange = useCallback(
    (conversationId: string, suggestionId: string, status: MemorySyncStatus) => {
      updateMemorySuggestionStatus(conversationId, suggestionId, status);
      if (status === 'approved') {
        void addXp(5);
      }
    },
    [addXp, updateMemorySuggestionStatus],
  );

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null);
      setSelectedArtifactId(null);
      return;
    }
    if (!selectedProjectId || !projects.some(project => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
      setSelectedArtifactId(null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('github_auth') === 'success') {
      setIsPublishModalOpen(true);
      // Clean up the URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    let apiOrigin: string | null = null;
    if (dataApiBaseUrl) {
      try {
        apiOrigin = new URL(dataApiBaseUrl).origin;
      } catch (error) {
        console.warn('Unable to parse data API base URL for GitHub OAuth messaging', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (apiOrigin && event.origin !== apiOrigin) {
        return;
      }

      let payload: unknown = event.data;

      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (error) {
          console.warn('Received non-JSON GitHub OAuth message', error);
          return;
        }
      }

      if (!payload || typeof payload !== 'object') {
        return;
      }

      const messagePayload = payload as { type?: unknown; status?: unknown; message?: unknown };
      if (messagePayload.type !== 'github-oauth') {
        return;
      }

      if (messagePayload.status === 'success') {
        setIsPublishModalOpen(true);
      } else if (messagePayload.status === 'error') {
        const message =
          typeof messagePayload.message === 'string'
            ? messagePayload.message
            : 'GitHub authorization failed.';
        alert(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    setProjectActivityLog((prev) => {
      if (prev[selectedProjectId]) {
        return prev;
      }
      return {
        ...prev,
        [selectedProjectId]: createProjectActivity(),
      };
    });
  }, [selectedProjectId]);

  const updateProjectActivity = useCallback((projectId: string, updates: Partial<ProjectActivity>) => {
    setProjectActivityLog((prev) => {
      const current = prev[projectId] ?? createProjectActivity();
      let changed = false;
      const next: ProjectActivity = { ...current };

      (Object.entries(updates) as [keyof ProjectActivity, boolean][]).forEach(([key, value]) => {
        if (typeof value === 'undefined') {
          return;
        }
        if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      });

      if (!changed && prev[projectId]) {
        return prev;
      }

      return {
        ...prev,
        [projectId]: changed ? next : current,
      };
    });
  }, []);

  const markSelectedProjectActivity = useCallback((updates: Partial<ProjectActivity>) => {
    if (!selectedProjectId) {
      return;
    }
    updateProjectActivity(selectedProjectId, updates);
  }, [selectedProjectId, updateProjectActivity]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      return;
    }
    markSelectedProjectActivity({ usedSearch: true });
  }, [searchTerm, markSelectedProjectActivity]);

  useEffect(() => {
    if (artifactTypeFilter === 'ALL' && statusFilter === 'ALL') {
      return;
    }
    markSelectedProjectActivity({ usedFilters: true });
  }, [artifactTypeFilter, statusFilter, markSelectedProjectActivity]);

  useEffect(() => {
    if (!profile) return;
    const unlocked = achievements.filter(achievement => achievement.isUnlocked(artifacts, projects)).map(achievement => achievement.id);
    const missing = unlocked.filter(id => !profile.achievementsUnlocked.includes(id));
    if (missing.length > 0) {
      updateProfile({ achievementsUnlocked: unlocked });
    }
  }, [profile, artifacts, projects, updateProfile]);

  const handleUpdateArtifactData = useCallback(
    (artifactId: string, data: Artifact['data']) => {
      const target = artifacts.find((artifact) => artifact.id === artifactId);
      if (!target) {
        return;
      }
      if (
        target.type === ArtifactType.Task &&
        (data as TaskData).state === TASK_STATE.Done &&
        (target.data as TaskData | undefined)?.state !== TASK_STATE.Done
      ) {
        void addXp(8); // XP Source: close task (+8)
      }
      void updateArtifact(artifactId, { data });
    },
    [artifacts, addXp, updateArtifact],
  );

  const handleUpdateArtifact = useCallback(
    (artifactId: string, updates: Partial<Artifact>) => {
      void updateArtifact(artifactId, updates);
    },
    [updateArtifact],
  );

  const handleAddRelation = useCallback(
    (fromId: string, toId: string, kind: string) => {
      const source = artifacts.find((artifact) => artifact.id === fromId);
      const target = artifacts.find((artifact) => artifact.id === toId);
      if (!source || !target) {
        return;
      }

      const newRelation: Relation = { toId, kind };
      const reciprocalRelation: Relation = { toId: fromId, kind };

      const sourceHasRelation = source.relations.some((relation) => relation.toId === toId);
      const nextSourceRelations = sourceHasRelation
        ? source.relations.map((relation) => (relation.toId === toId ? newRelation : relation))
        : [...source.relations, newRelation];

      const shouldUpdateSource = sourceHasRelation
        ? source.relations.some((relation) => relation.toId === toId && relation.kind !== kind)
        : true;
      if (shouldUpdateSource) {
        void updateArtifact(fromId, { relations: nextSourceRelations });
      }

      const reciprocalExists = target.relations.some((relation) => relation.toId === fromId);
      const nextTargetRelations = reciprocalExists
        ? target.relations.map((relation) =>
            relation.toId === fromId ? reciprocalRelation : relation,
          )
        : [...target.relations, reciprocalRelation];

      const shouldUpdateTarget = reciprocalExists
        ? target.relations.some(
            (relation) => relation.toId === fromId && relation.kind !== kind,
          )
        : true;

      if (shouldUpdateTarget) {
        void updateArtifact(toId, { relations: nextTargetRelations });
      }
    },
    [artifacts, updateArtifact],
  );

  const handleRemoveRelation = useCallback(
    (fromId: string, relationIndex: number) => {
      const source = artifacts.find((artifact) => artifact.id === fromId);
      if (!source) {
        return;
      }

      const relationToRemove = source.relations[relationIndex];
      if (!relationToRemove) {
        return;
      }

      const nextRelations = source.relations.filter((_, index) => index !== relationIndex);
      void updateArtifact(fromId, { relations: nextRelations });

      const target = artifacts.find((artifact) => artifact.id === relationToRemove.toId);
      if (!target) {
        return;
      }

      const nextTargetRelations = target.relations.filter(
        (relation) => relation.toId !== fromId,
      );
      if (nextTargetRelations.length !== target.relations.length) {
        void updateArtifact(relationToRemove.toId, { relations: nextTargetRelations });
      }
    },
    [artifacts, updateArtifact],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const visibleProjects = useMemo(() => {
    const normalizedQuery = projectSearchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      if (projectStatusFilter !== 'ALL' && project.status !== projectStatusFilter) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = `${project.title} ${project.summary} ${project.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [projects, projectStatusFilter, projectSearchTerm]);
  const projectArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.projectId === selectedProjectId),
    [artifacts, selectedProjectId],
  );
  const quickFacts = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }
    return projectArtifacts.filter(isQuickFactArtifact).slice().sort(sortQuickFactsByRecency);
  }, [projectArtifacts, selectedProjectId]);
  const quickFactPreview = useMemo(() => quickFacts.slice(0, 4), [quickFacts]);
  const projectHeroStats = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    const tagSet = new Set<string>();
    projectArtifacts.forEach((artifact) => {
      (artifact.tags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized.length > 0) {
          tagSet.add(normalized);
        }
      });
    });

    const narrativePieces = projectArtifacts.filter((artifact) => isNarrativeArtifactType(artifact.type)).length;

    return {
      totalArtifacts: projectArtifacts.length,
      completedTasks: getCompletedTaskCount(projectArtifacts),
      quickFactCount: quickFacts.length,
      relationCount: getTotalRelations(projectArtifacts),
      uniqueTagCount: tagSet.size,
      narrativeCount: narrativePieces,
      wikiWordCount: getWikiWordCount(projectArtifacts),
      lexemeCount: getConlangLexemeCount(projectArtifacts),
    };
  }, [selectedProject, projectArtifacts, quickFacts]);
  const hasProjectFilters = projectStatusFilter !== 'ALL' || projectSearchTerm.trim() !== '';
  const selectedProjectHiddenBySidebarFilters = Boolean(
    selectedProjectId && !visibleProjects.some((project) => project.id === selectedProjectId),
  );

  const handleDeleteArtifact = useCallback(
    async (artifactId: string) => {
      const success = await deleteArtifact(artifactId);
      if (!success) {
        alert('Failed to delete artifact. Please try again later.');
        return;
      }
      setSelectedArtifactId((current) => (current === artifactId ? null : current));
    },
    [deleteArtifact],
  );

  const handleDuplicateArtifact = useCallback(
    async (artifactId: string) => {
      if (!selectedProjectId) {
        alert('Select a project before duplicating an artifact.');
        return;
      }

      const source = projectArtifacts.find((artifact) => artifact.id === artifactId);
      if (!source) {
        alert('We could not find the artifact to duplicate.');
        return;
      }

      const existingTitles = new Set(projectArtifacts.map((artifact) => artifact.title.toLowerCase()));
      const trimmedSourceTitle = source.title.trim();
      const baseTitle = trimmedSourceTitle.length > 0 ? `${trimmedSourceTitle} (copy)` : 'Untitled artifact (copy)';
      let candidateTitle = baseTitle;
      let attempt = 2;
      while (existingTitles.has(candidateTitle.toLowerCase())) {
        candidateTitle = `${baseTitle} ${attempt}`;
        attempt += 1;
      }

      const clonedData = cloneArtifactData(source.data);
      const draft: {
        type: ArtifactType;
        title: string;
        summary: string;
        status: string;
        tags: string[];
        relations: Relation[];
        data?: Artifact['data'];
      } = {
        type: source.type,
        title: candidateTitle,
        summary: source.summary,
        status: source.status,
        tags: [...source.tags],
        relations: [],
      };

      if (clonedData !== undefined) {
        draft.data = clonedData;
      }

      const created = await createArtifact(selectedProjectId, draft);
      if (!created) {
        alert('We could not duplicate this artifact. Please try again later.');
        return;
      }

      setSelectedArtifactId(created.id);
      void addXp(2);
      setInfoModalContent({
        title: 'Artifact duplicated',
        message: `Created ${created.title} from ${source.title}.`,
      });
    },
    [selectedProjectId, projectArtifacts, createArtifact, addXp, setInfoModalContent],
  );

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setActiveTagFilters([]);
    setSearchTerm('');
  };

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    void ensureProjectArtifacts(selectedProjectId);
  }, [selectedProjectId, ensureProjectArtifacts]);

  const handleCreateProject = useCallback(
    async ({
      title,
      summary,
      tags,
      artifacts: starterArtifacts,
    }: {
      title: string;
      summary: string;
      tags?: string[];
      artifacts?: TemplateArtifactBlueprint[];
    }) => {
      if (!profile) return;
      const created = await createProject({ title, summary, tags });
      if (!created) {
        return;
      }
      void addXp(5);
      setIsCreateProjectModalOpen(false);
      setSelectedProjectId(created.id);
      setSelectedArtifactId(null);
      setProjectStatusFilter('ALL');
      setProjectSearchTerm('');

      const normalizedStarters = (starterArtifacts ?? []).filter(
        (blueprint): blueprint is TemplateArtifactBlueprint =>
          !!blueprint &&
          typeof blueprint.title === 'string' &&
          blueprint.title.trim().length > 0 &&
          typeof blueprint.summary === 'string' &&
          blueprint.summary.trim().length > 0,
      );

      if (normalizedStarters.length > 0) {
        const drafts = normalizedStarters.map((blueprint) => ({
          type: blueprint.type,
          title: blueprint.title,
          summary: blueprint.summary,
          status: blueprint.status ?? 'draft',
          tags: blueprint.tags ?? [],
          relations: [],
          data: blueprint.data ?? getDefaultDataForType(blueprint.type, blueprint.title),
        }));

        const createdArtifacts = await createArtifactsBulk(created.id, drafts);
        if (createdArtifacts.length > 0) {
          setInfoModalContent({
            title: 'Starter artifacts created',
            message: `We drafted ${createdArtifacts.length} starter artifact${createdArtifacts.length > 1 ? 's' : ''} from your project brief.`,
          });
          setSelectedArtifactId(createdArtifacts[0].id);
        }
      }
    },
    [profile, createProject, addXp, createArtifactsBulk],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const projectArtifactIds = artifacts
        .filter((artifact) => artifact.projectId === projectId)
        .map((artifact) => artifact.id);
      const success = await deleteProject(projectId);
      if (!success) {
        alert('Failed to delete project. Please try again later.');
        return;
      }
      setProjectActivityLog((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      setSelectedProjectId((current) => (current === projectId ? null : current));
      setSelectedArtifactId((current) =>
        current && projectArtifactIds.includes(current) ? null : current,
      );
    },
    [artifacts, deleteProject],
  );

  const handleCreateArtifact = useCallback(
    async ({ title, type, summary, sourceArtifactId: sourceId }: { title: string; type: ArtifactType; summary: string, sourceArtifactId?: string | null }) => {
      if (!selectedProjectId || !profile) return;

      const data: Artifact['data'] = getDefaultDataForType(type, title);

      const created = await createArtifact(selectedProjectId, {
        type,
        title,
        summary,
        status: 'idea',
        tags: [],
        relations: [],
        data,
      });

      if (created) {
        if (sourceId) {
          handleAddRelation(created.id, sourceId, 'RELATES_TO');
        }
        void addXp(5);
        setIsCreateModalOpen(false);
        setSourceArtifactId(null);
        setSelectedArtifactId(created.id);
      }
    },
    [selectedProjectId, profile, createArtifact, addXp, handleAddRelation],
  );

  const handleSelectTemplate = useCallback(async (template: TemplateEntry) => {
    if (!selectedProjectId) {
      alert('Please select a project before adding an artifact from a template.');
      return;
    }

    const data: Artifact['data'] = getDefaultDataForType(template.type, template.name);
    const created = await createArtifact(selectedProjectId, {
      type: template.type,
      title: template.name,
      summary: template.description,
      status: 'draft',
      tags: template.tags ?? [],
      relations: [],
      data,
    });

    if (created) {
      void addXp(5);
      setSelectedArtifactId(created.id);
    }
  }, [selectedProjectId, createArtifact, addXp]);

  const handleApplyProjectTemplate = useCallback(async (template: ProjectTemplate) => {
    if (!profile || !selectedProjectId) return;

    const projectArtifactsForSelection = artifacts.filter(artifact => artifact.projectId === selectedProjectId);
    const existingTitles = new Set(projectArtifactsForSelection.map(artifact => artifact.title.toLowerCase()));
    const timestamp = Date.now();

    const drafts = template.artifacts
      .filter(blueprint => !existingTitles.has(blueprint.title.toLowerCase()))
      .map((blueprint, index) => ({
        id: `art-${timestamp + index}`,
        type: blueprint.type,
        title: blueprint.title,
        summary: blueprint.summary,
        status: blueprint.status ?? 'draft',
        tags: blueprint.tags ? [...blueprint.tags] : [],
        relations: [],
        data: blueprint.data ?? getDefaultDataForType(blueprint.type, blueprint.title),
      }));

    if (drafts.length > 0) {
      const created = await createArtifactsBulk(selectedProjectId, drafts);
      if (created.length > 0) {
        void addXp(created.length * 5);
        setSelectedArtifactId(created[0].id);
        setInfoModalContent({
          title: 'Template Applied',
          message: `Added ${created.length} starter artifact${created.length > 1 ? 's' : ''} from the ${template.name} template.`,
        });
      }
    } else {
      setInfoModalContent({
        title: 'Template Not Applied',
        message: 'All of the template\'s starter artifacts already exist in this project.',
      });
    }

    if (template.projectTags.length > 0) {
      const selected = projects.find((project) => project.id === selectedProjectId);
      if (selected) {
        const mergedTags = Array.from(new Set([...selected.tags, ...template.projectTags]));
        if (mergedTags.length !== selected.tags.length) {
          void updateProject(selectedProjectId, { tags: mergedTags });
        }
      }
    }
  }, [profile, selectedProjectId, artifacts, createArtifactsBulk, addXp, projects, updateProject]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    if (!dataApiEnabled) {
      alert('Artifact import requires a connection to the data server.');
      event.target.value = '';
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the import request.');
      }

      const content = await file.text();
      const { artifacts: imported } = await importArtifactsViaApi(token, selectedProjectId, content);
      const existingIds = new Set(artifacts.map((artifact) => artifact.id));
      const newArtifacts = imported.filter((artifact) => !existingIds.has(artifact.id));

      if (newArtifacts.length > 0) {
        mergeArtifacts(selectedProjectId, newArtifacts);
        alert(`${newArtifacts.length} new artifacts imported successfully!`);
        markSelectedProjectActivity({ importedCsv: true });
      } else {
        alert('No new artifacts to import. All IDs in the file already exist.');
      }
    } catch (error) {
      console.error('Artifact import failed', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleGitHubArtifactsImported = useCallback(
    async (newArtifacts: Artifact[]) => {
      if (newArtifacts.length === 0) {
        return;
      }

      const projectId = newArtifacts[0]?.projectId ?? selectedProjectId;
      if (!projectId) {
        return;
      }

      await createArtifactsBulk(
        projectId,
        newArtifacts.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          title: artifact.title,
          summary: artifact.summary,
          status: artifact.status,
          tags: artifact.tags,
          relations: artifact.relations,
          data: artifact.data,
        })),
      );

      updateProjectActivity(projectId, { githubImported: true });
    },
    [createArtifactsBulk, selectedProjectId, updateProjectActivity],
  );

  const handlePublish = () => {
    if (selectedProject && projectArtifacts.length > 0) {
        exportProjectAsStaticSite(selectedProject, projectArtifacts);
        markSelectedProjectActivity({ publishedSite: true });
        addXp(25); // XP Source: publish (+25)
    } else {
        alert('Please select a project with artifacts to publish.');
    }
  };

  const handlePublishToGithub = async () => {
    if (!isDataApiConfigured || !dataApiBaseUrl) {
      alert('Publishing to GitHub is unavailable because the data API is not configured.');
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Unable to authenticate the GitHub authorization request.');
      }

      const { authUrl } = await startGitHubOAuth(token);
      const popup = window.open(
        authUrl,
        'creative-atlas-github-oauth',
        'width=600,height=700',
      );

      if (!popup) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate GitHub authorization', error);
      alert(
        `Unable to start GitHub authorization. ${
          error instanceof Error ? error.message : 'Please try again.'
        }`,
      );
    }
  };

  const handlePublishToGithubRepo = async (repoName: string, publishDir: string) => {
    setIsPublishing(true);
    try {
      const token = await getIdToken();
      const result = await publishToGitHub(token, repoName, publishDir);
      console.log('Publish result:', result);
      alert(`Publishing process started for ${repoName}. You will be notified upon completion.`);
      setIsPublishModalOpen(false);
    } catch (err) {
      alert(`Error creating repository: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetProjectFilters = useCallback(() => {
    setProjectStatusFilter('ALL');
    setProjectSearchTerm('');
  }, []);

  const handleQuickFactSubmit = useCallback(
    async ({ fact, detail }: { fact: string; detail?: string }) => {
      if (!selectedProjectId || !selectedProject) {
        throw new Error('Select a project before saving a fact.');
      }

      const trimmedFact = fact.trim();
      const trimmedDetail = detail?.trim();
      if (!trimmedFact) {
        throw new Error('Capture at least one sentence for your fact.');
      }

      setIsSavingQuickFact(true);

      try {
        const existingFactCount = projectArtifacts.filter(isQuickFactArtifact).length;

        const safeProjectTitle = selectedProject.title.trim().length > 0 ? selectedProject.title.trim() : 'Project';
        const fallbackTitle = `${safeProjectTitle} Fact #${existingFactCount + 1}`;
        const title = deriveQuickFactTitle(trimmedFact, fallbackTitle);
        const summary = createQuickFactSummary(trimmedFact, trimmedDetail);
        const content = createQuickFactContent(title, trimmedFact, trimmedDetail);

        const created = await createArtifact(selectedProjectId, {
          type: ArtifactType.Wiki,
          title,
          summary,
          status: 'draft',
          tags: [QUICK_FACT_TAG],
          relations: [],
          data: { content },
        });

        if (!created) {
          throw new Error('We could not save your fact. Please try again.');
        }

        void addXp(3);
        setSelectedArtifactId(created.id);
        setIsQuickFactModalOpen(false);
      } catch (error) {
        console.error('Failed to save quick fact', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('We could not save your fact. Please try again.');
      } finally {
        setIsSavingQuickFact(false);
      }
    },
    [selectedProjectId, selectedProject, projectArtifacts, createArtifact, addXp],
  );

  const handleCaptureInspirationCard = useCallback(
    async (card: InspirationCard) => {
      if (!selectedProjectId || !selectedProject) {
        alert('Select a project before capturing inspiration.');
        return;
      }

      const suitTag = card.suit.toLowerCase().replace(/\s+/g, '-');
      const title = `${card.suit} Spark: ${card.title}`;
      const summary = card.prompt;
      const content = [
        `# ${card.title}`,
        '',
        card.prompt,
        '',
        card.detail,
        '',
        `Tags: ${card.tags.map((tag) => `#${tag}`).join(' ')}`,
      ].join('\n');

      const created = await createArtifact(selectedProjectId, {
        type: ArtifactType.Wiki,
        title,
        summary,
        status: 'idea',
        tags: ['inspiration', suitTag, ...card.tags],
        relations: [],
        data: { content },
      });

      if (created) {
        void addXp(2);
        setSelectedArtifactId(created.id);
      }
    },
    [selectedProjectId, selectedProject, createArtifact, addXp],
  );
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);
  const availableStatuses = useMemo(
    () => Array.from(new Set(projectArtifacts.map((artifact) => artifact.status))).sort(),
    [projectArtifacts],
  );
  const availableTagFilters = useMemo(() => {
    const seen = new Map<string, string>();

    for (const artifact of projectArtifacts) {
      for (const rawTag of artifact.tags) {
        const trimmed = rawTag.trim();
        if (!trimmed) {
          continue;
        }

        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, trimmed);
        }
      }
    }

    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [projectArtifacts]);
  const normalizedActiveTagFilters = useMemo(
    () => activeTagFilters.map((tag) => tag.toLowerCase()),
    [activeTagFilters],
  );

  useEffect(() => {
    setActiveTagFilters((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const available = new Set(availableTagFilters.map((tag) => tag.toLowerCase()));
      const next = previous.filter((tag) => available.has(tag.toLowerCase()));
      return next.length === previous.length ? previous : next;
    });
  }, [availableTagFilters]);
  const emptyActivity = useMemo(() => createProjectActivity(), []);
  const selectedProjectActivity = useMemo(() => {
    if (!selectedProjectId) {
      return emptyActivity;
    }
    return projectActivityLog[selectedProjectId] ?? emptyActivity;
  }, [projectActivityLog, selectedProjectId, emptyActivity]);
  const milestoneProgress = useMemo<MilestoneProgressOverview[]>(() => {
    if (!selectedProjectId || !selectedProject) {
      return milestoneRoadmap.map((milestone) => ({
        milestone,
        objectives: milestone.objectives.map((objective) => ({
          ...objective,
          status: 'not-started' as const,
          detail: 'Select a project to track progress.',
        })),
        completion: 0,
      }));
    }

    return evaluateMilestoneProgress(milestoneRoadmap, {
      project: selectedProject,
      artifacts: projectArtifacts,
      profile,
      activity: selectedProjectActivity,
    });
  }, [
    selectedProjectId,
    selectedProject,
    projectArtifacts,
    profile,
    selectedProjectActivity,
  ]);

  const upcomingMilestoneOverview = useMemo(() => {
    const nextIncomplete = milestoneProgress.find((item) => item.completion < 1);
    return nextIncomplete ?? milestoneProgress[0] ?? null;
  }, [milestoneProgress]);

  const handleProfileUpdate = useCallback((updates: { displayName?: string; settings?: Partial<UserProfile['settings']> }) => {
    updateProfile(updates);
  }, [updateProfile]);

  const filteredArtifacts = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return projectArtifacts.filter((artifact) => {
      if (artifactTypeFilter !== 'ALL' && artifact.type !== artifactTypeFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && artifact.status !== statusFilter) {
        return false;
      }

      if (normalizedActiveTagFilters.length > 0) {
        const artifactTagSet = new Set(artifact.tags.map((tag) => tag.toLowerCase()));
        const matchesAllTags = normalizedActiveTagFilters.every((tag) => artifactTagSet.has(tag));
        if (!matchesAllTags) {
          return false;
        }
      }

      if (normalizedQuery) {
        const haystack = `${artifact.title} ${artifact.summary} ${artifact.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [projectArtifacts, artifactTypeFilter, statusFilter, normalizedActiveTagFilters, searchTerm]);

  const hasActiveFilters =
    artifactTypeFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm.trim() !== '' || activeTagFilters.length > 0;
  const filteredSelectedArtifactHidden = Boolean(selectedArtifact && !filteredArtifacts.some(artifact => artifact.id === selectedArtifact.id));

  const handleUpdateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      void updateProject(projectId, updates);
    },
    [updateProject],
  );

  const handleQuestlineClaim = useCallback((questlineId: string, xpReward: number) => {
    if (!profile) return;
    if (profile.questlinesClaimed.includes(questlineId)) return;
    addXp(xpReward);
    updateProfile({ questlinesClaimed: [questlineId] });
  }, [profile, addXp, updateProfile]);

  const handleResetFilters = () => {
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setActiveTagFilters([]);
    setSearchTerm('');
  };

  const handleToggleTagFilter = useCallback((tag: string) => {
    setActiveTagFilters((previous) => {
      const normalized = tag.toLowerCase();
      const isActive = previous.some((item) => item.toLowerCase() === normalized);
      if (isActive) {
        return previous.filter((item) => item.toLowerCase() !== normalized);
      }

      const next = [...previous, tag];
      next.sort((a, b) => a.localeCompare(b));
      return next;
    });
  }, []);

  const handleExportArtifacts = useCallback(
    async (format: 'csv' | 'tsv') => {
      if (!selectedProject) {
        return;
      }

      if (!dataApiEnabled) {
        alert('Artifact export requires a connection to the data server.');
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Unable to authenticate the export request.');
        }

        const blob = await downloadProjectExport(token, selectedProject.id, format);
        const filename = `${selectedProject.title.replace(/\s+/g, '_').toLowerCase()}_artifacts.${format}`;
        triggerDownload(blob, filename);
        markSelectedProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Artifact export failed', error);
        alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedProject, dataApiEnabled, getIdToken, triggerDownload, markSelectedProjectActivity],
  );

  const handleChapterBibleExport = useCallback(
    async (format: 'markdown' | 'pdf') => {
      if (!selectedProject) {
        return;
      }

      if (projectArtifacts.length === 0) {
        alert('Capture some lore before exporting a chapter bible.');
        return;
      }

      try {
        if (format === 'markdown') {
          exportChapterBibleMarkdown(selectedProject, projectArtifacts);
        } else {
          await exportChapterBiblePdf(selectedProject, projectArtifacts);
        }
        markSelectedProjectActivity({ exportedData: true });
      } catch (error) {
        console.error('Chapter bible export failed', error);
        alert('Unable to export the chapter bible right now. Please try again.');
      }
    },
    [selectedProject, projectArtifacts, markSelectedProjectActivity],
  );

  const handleLoreJsonExport = useCallback(() => {
    if (!selectedProject) {
      return;
    }

    if (projectArtifacts.length === 0) {
      alert('Capture some lore before exporting a lore bundle.');
      return;
    }

    try {
      exportLoreJson(selectedProject, projectArtifacts);
      markSelectedProjectActivity({ exportedData: true });
    } catch (error) {
      console.error('Lore JSON export failed', error);
      alert('Unable to export lore JSON right now. Please try again.');
    }
  }, [selectedProject, projectArtifacts, markSelectedProjectActivity]);

  const handleExportOptionSelection = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;

    if (value === '') {
      return;
    }

    switch (value) {
      case 'export-csv':
        void handleExportArtifacts('csv');
        break;
      case 'export-tsv':
        void handleExportArtifacts('tsv');
        break;
      case 'export-chapter-markdown':
        void handleChapterBibleExport('markdown');
        break;
      case 'export-chapter-pdf':
        void handleChapterBibleExport('pdf');
        break;
      case 'export-lore-json':
        handleLoreJsonExport();
        break;
      default:
        break;
    }

    event.target.value = '';
  }, [handleExportArtifacts, handleChapterBibleExport, handleLoreJsonExport]);

  const handleLoadMoreProjects = useCallback(async () => {
    if (!canLoadMoreProjects) {
      return;
    }

    setIsLoadingMoreProjects(true);
    try {
      await loadMoreProjects();
    } catch (error) {
      console.error('Failed to load more projects', error);
      alert('Unable to load additional projects right now. Please try again later.');
    } finally {
      setIsLoadingMoreProjects(false);
    }
  }, [canLoadMoreProjects, loadMoreProjects]);

  const handleViewModeChange = useCallback((mode: 'table' | 'graph' | 'kanban') => {
    setViewMode(mode);
    if (mode === 'graph') {
      markSelectedProjectActivity({ viewedGraph: true });
    }
    if (mode === 'kanban') {
      markSelectedProjectActivity({ viewedKanban: true });
    }
  }, [markSelectedProjectActivity]);

  if (!profile) {
    return <DashboardShellPlaceholder loading={loading} />;
  }

  const xpProgress = profile.xp % 100;
  const level = Math.floor(profile.xp / 100) + 1;
  const isViewingOwnWorkspace = !selectedProject || selectedProject.ownerId === profile.uid;
  const featuredAssistant = aiAssistants[0];

  const CollapsibleSection: React.FC<{
    title: string;
    isCollapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }> = ({ title, isCollapsed, onToggle, children }) => (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/20">
      <h2 className="border-b border-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-300">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={!isCollapsed}
        >
          <span>{title}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transform transition-transform ${
              isCollapsed ? 'rotate-0' : 'rotate-180'
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h2>
      <Zippy isOpen={!isCollapsed}>
        <div className="p-4">{children}</div>
      </Zippy>
    </div>
  );

  const ViewSwitcher = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
        <button onClick={() => handleViewModeChange('table')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <TableCellsIcon className="w-4 h-4" /> Table
        </button>
        <button onClick={() => handleViewModeChange('graph')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ShareIcon className="w-4 h-4" /> Graph
        </button>
        <button onClick={() => handleViewModeChange('kanban')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ViewColumnsIcon className="w-4 h-4" /> Kanban
        </button>
    </div>
  );

  return (
    <DepthPreferencesProvider>
      <div className="min-h-screen flex flex-col">
      {isTutorialVisible && (
        <ErrorBoundary>
          <TutorialGuide onClose={() => setIsTutorialVisible(false)} />
        </ErrorBoundary>
      )}
      <Header profile={profile} xpProgress={xpProgress} level={level} onSignOut={signOutUser} onStartTutorial={() => setIsTutorialVisible(true)} />
      {error && (
        <div className="px-4 sm:px-8 mt-4">
          <ErrorBanner message={error} onDismiss={clearError} />
        </div>
      )}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8">
        <aside className="lg:col-span-3 space-y-6">
          {isViewingOwnWorkspace && (
            <UserProfileCard profile={profile} onUpdateProfile={handleProfileUpdate} />
          )}
          <StreakTracker currentStreak={profile.streakCount} bestStreak={profile.bestStreak} level={level} />
          <div>
            <div className="flex justify-between items-center px-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
                <button
                    id="create-new-project-button"
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-md transition-colors"
                    title="Create New Project"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    New
                </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="project-search"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Search
                  </label>
                  <input
                    id="project-search"
                    type="search"
                    value={projectSearchTerm}
                    onChange={(event) => setProjectSearchTerm(event.target.value)}
                    placeholder="Project name, summary, or tag"
                    className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="project-status-filter"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Status
                  </label>
                  <select
                    id="project-status-filter"
                    value={projectStatusFilter}
                    onChange={(event) =>
                      setProjectStatusFilter(event.target.value as ProjectStatus | 'ALL')
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="ALL">All statuses</option>
                    {Object.values(ProjectStatus).map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {hasProjectFilters
                      ? `Showing ${visibleProjects.length} of ${projects.length} projects`
                      : `${projects.length} project${projects.length === 1 ? '' : 's'} available`}
                  </span>
                  {hasProjectFilters && (
                    <button
                      type="button"
                      onClick={handleResetProjectFilters}
                      className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {selectedProjectHiddenBySidebarFilters && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 space-y-2">
                  <p>The selected project is hidden by the current filters.</p>
                  <button
                    type="button"
                    onClick={handleResetProjectFilters}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 transition-colors hover:border-amber-300/60 hover:text-amber-50"
                  >
                    Show project
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {visibleProjects.length > 0 ? (
                  visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={handleSelectProject}
                      isSelected={project.id === selectedProjectId}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-700/70 px-4 py-6 text-center text-sm text-slate-400">
                    {hasProjectFilters
                      ? 'No projects match the current filters. Adjust your search or clear the filters to rediscover a world.'
                      : 'No projects yet. Start your first world to build an atlas.'}
                  </div>
                )}
                {!hasProjectFilters && canLoadMoreProjects && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleLoadMoreProjects();
                    }}
                    className="w-full px-3 py-2 text-sm font-semibold text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isLoadingMoreProjects}
                  >
                    {isLoadingMoreProjects ? 'Loading more projects…' : 'Load more projects'}
                  </button>
                )}
              </div>
            </div>
          </div>
          <Quests quests={todaysDailyQuests} artifacts={artifacts} projects={projects} />
          <QuestlineBoard
            questlines={questlines}
            artifacts={artifacts}
            projects={projects}
            profile={profile}
            level={level}
            claimedQuestlines={profile.questlinesClaimed}
            onClaim={handleQuestlineClaim}
          />
          <Achievements achievements={achievements} artifacts={artifacts} projects={projects} />
        </aside>

        <section className="lg:col-span-9 space-y-8">
          {selectedProject ? (
            <>
              {projectHeroStats ? (
                <ProjectHero
                  project={selectedProject}
                  stats={projectHeroStats}
                  quickFacts={quickFactPreview}
                  totalQuickFacts={quickFacts.length}
                  statusLabel={formatStatusLabel(selectedProject.status)}
                  onCreateArtifact={() => setIsCreateModalOpen(true)}
                  onCaptureQuickFact={() => setIsQuickFactModalOpen(true)}
                  onPublishProject={handlePublish}
                  onOpenInsights={() => setIsInsightsOpen(true)}
                  onSelectQuickFact={setSelectedArtifactId}
                  level={level}
                  xpProgress={xpProgress}
                />
              ) : null}
              <ProjectOverview
                  project={selectedProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
              />
              <MemorySyncPanel
                conversations={projectConversations}
                onStatusChange={handleMemoryStatusChange}
              />
              <CollapsibleSection
                title="Project Insights"
                isCollapsed={areInsightsCollapsed}
                onToggle={() => setAreInsightsCollapsed(!areInsightsCollapsed)}
              >
              <ProjectInsights artifacts={projectArtifacts} />
              </CollapsibleSection>
              <CollapsibleSection
                title="Open Tasks"
                isCollapsed={areTasksCollapsed}
                onToggle={() => setAreTasksCollapsed(!areTasksCollapsed)}
              >
                <OpenTasksPanel
                  artifacts={projectArtifacts}
                  projectTitle={selectedProject.title}
                  onSelectTask={(taskId) => setSelectedArtifactId(taskId)}
                />
              </CollapsibleSection>
              <div>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="text-2xl font-bold text-white">Artifacts in {selectedProject.title}</h2>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Data</span>
                      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv,.tsv" className="hidden" />
                      <button
                        onClick={handleImportClick}
                        title="Import artifacts from CSV or TSV"
                        className="flex items-center gap-2 rounded-md bg-slate-700/60 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        Import
                      </button>
                      <label htmlFor="artifact-export-select" className="sr-only">Export artifacts</label>
                      <select
                        id="artifact-export-select"
                        onChange={handleExportOptionSelection}
                        defaultValue=""
                        className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                      >
                        <option value="">Export…</option>
                        <option value="export-csv">Artifacts (CSV)</option>
                        <option value="export-tsv">Artifacts (TSV)</option>
                        <option value="export-chapter-markdown">Chapter Bible (Markdown)</option>
                        <option value="export-chapter-pdf">Chapter Bible (PDF)</option>
                        <option value="export-lore-json">Lore Bundle (JSON)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">View</span>
                      <ViewSwitcher />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsQuickFactModalOpen(true)}
                        className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!selectedProject}
                        title={selectedProject ? 'Capture a tiny lore beat.' : 'Select a project to add a fact.'}
                      >
                        <SparklesIcon className="h-5 w-5" />
                        Add One Fact
                      </button>
                      <button
                        onClick={handlePublish}
                        className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        <BuildingStorefrontIcon className="h-5 w-5" />
                        Publish Site
                      </button>
                      <button
                        onClick={() => {
                          void handlePublishToGithub();
                        }}
                        className="flex items-center gap-2 rounded-md bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg transition-colors hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        <GitHubIcon className="h-5 w-5" />
                        Publish to GitHub
                      </button>
                      <button
                        id="add-new-artifact-button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-cyan-500 hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        <PlusIcon className="h-5 w-5" />
                        New Seed
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label htmlFor="artifact-type-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</label>
                            <select
                                id="artifact-type-filter"
                                value={artifactTypeFilter}
                                onChange={(event) => setArtifactTypeFilter(event.target.value as 'ALL' | ArtifactType)}
                                className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="ALL">All artifact types</option>
                                {Object.values(ArtifactType).map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="artifact-status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stage</label>
                            <select
                                id="artifact-status-filter"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | string)}
                                className="bg-slate-800/80 border border-slate-700 rounded-md px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="ALL">All stages</option>
                                {availableStatuses.map((status) => (
                                    <option key={status} value={status}>{formatStatusLabel(status)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="artifact-search" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</label>
                            <input
                                id="artifact-search"
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Title, summary, or tag"
                                className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 w-48 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                            >
                                Clear filters
                            </button>
                        )}
                        {availableTagFilters.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 w-full border-t border-slate-800/60 pt-2 mt-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {availableTagFilters.map((tag) => {
                                const isActive = activeTagFilters.some((item) => item.toLowerCase() === tag.toLowerCase());
                                return (
                                  <button
                                    key={tag.toLowerCase()}
                                    type="button"
                                    onClick={() => handleToggleTagFilter(tag)}
                                    aria-pressed={isActive}
                                    className={`rounded border px-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 ${
                                      isActive
                                        ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                                        : 'border-slate-700/70 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                    }`}
                                  >
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-4">
                        <RevealDepthToggle />
                        <span>
                            Showing <span className="text-slate-200 font-semibold">{filteredArtifacts.length}</span> of <span className="text-slate-200 font-semibold">{projectArtifacts.length}</span> artifacts
                        </span>
                    </div>
                </div>
                {viewMode === 'table' && (
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-700 bg-slate-800">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Title</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Type</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Stage</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300 hidden lg:table-cell">Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredArtifacts.length > 0 ? (
                                    filteredArtifacts.map(art => (
                                        <ArtifactListItem key={art.id} artifact={art} onSelect={setSelectedArtifactId} isSelected={art.id === selectedArtifactId} />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-slate-500">
                                            {hasActiveFilters ? 'No artifacts match the current filters.' : 'No artifacts in this project yet. Create a new seed!'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {viewMode === 'graph' && <GraphView artifacts={filteredArtifacts} onNodeClick={setSelectedArtifactId} />}
                {viewMode === 'kanban' && <KanbanBoard artifacts={filteredArtifacts} onUpdateArtifactData={handleUpdateArtifactData} />}
              </div>

              {selectedArtifact && (
                <div className="space-y-8">
                    {filteredSelectedArtifactHidden && (
                        <div className="bg-amber-900/40 border border-amber-700/60 text-amber-200 text-sm px-4 py-3 rounded-lg">
                            This artifact is currently hidden by the active filters. Clear them to surface it in the list.
                        </div>
                    )}
                    <ArtifactDetail
                      artifact={selectedArtifact}
                      projectArtifacts={projectArtifacts}
                      onUpdateArtifact={handleUpdateArtifact}
                      onAddRelation={handleAddRelation}
                      onRemoveRelation={handleRemoveRelation}
                      onDeleteArtifact={handleDeleteArtifact}
                      onDuplicateArtifact={handleDuplicateArtifact}
                      onNewArtifact={(sourceId) => {
                        setSourceArtifactId(sourceId);
                        setIsCreateModalOpen(true);
                      }}
                      addXp={addXp}
                    />
                    {selectedArtifact.type === ArtifactType.Conlang && (
                        <ConlangLexiconEditor
                            artifact={selectedArtifact}
                            conlangName={selectedProject.title}
                            onLexemesChange={(id, lexemes) => handleUpdateArtifactData(id, lexemes)}
                            addXp={addXp}
                        />
                    )}
                    {isNarrativeArtifactType(selectedArtifact.type) && (
                        <StoryEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, scenes) => handleUpdateArtifactData(id, scenes)}
                            projectArtifacts={projectArtifacts}
                            onAddRelation={handleAddRelation}
                            onRemoveRelation={handleRemoveRelation}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Character && (
                        <CharacterEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                            projectArtifacts={projectArtifacts}
                            onAddRelation={handleAddRelation}
                            onRemoveRelation={handleRemoveRelation}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Wiki && (
                        <WikiEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                            assistants={aiAssistants}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Location && (
                        <LocationEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                            projectArtifacts={projectArtifacts}
                            onAddRelation={handleAddRelation}
                            onRemoveRelation={handleRemoveRelation}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.MagicSystem && (
                        <MagicSystemBuilder
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Task && (
                        <TaskEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Timeline && (
                        <TimelineEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <NarrativeHealthPanel artifacts={projectArtifacts} />
                <ContinuityMonitor artifacts={projectArtifacts} />
                <WorldSimulationPanel
                  artifacts={projectArtifacts}
                  allArtifacts={artifacts}
                  projectTitle={selectedProject.title}
                  onSelectArtifact={setSelectedArtifactId}
                />
              </div>
              <NarrativePipelineBoard artifacts={projectArtifacts} />
              <CharacterArcTracker artifacts={projectArtifacts} />
              <InspirationDeck
                onCaptureCard={handleCaptureInspirationCard}
                isCaptureDisabled={!selectedProjectId}
              />
              <GitHubImportPanel
                  projectId={selectedProject.id}
                  ownerId={profile.uid}
                  existingArtifacts={projectArtifacts}
                  onArtifactsImported={handleGitHubArtifactsImported}
                  addXp={addXp}
              />

              <QuickFactsPanel
                facts={quickFactPreview}
                totalFacts={quickFacts.length}
                projectTitle={selectedProject.title}
                onSelectFact={setSelectedArtifactId}
                onAddFact={() => setIsQuickFactModalOpen(true)}
              />

              <MilestoneTracker items={milestoneProgress} />
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-8">
                <div className="space-y-6 xl:col-span-2">
                  <ProjectTemplatePicker
                    templates={projectTemplates}
                    categories={templateLibrary}
                    activeProjectTitle={selectedProject.title}
                    onApplyTemplate={handleApplyProjectTemplate}
                    isApplyDisabled={!selectedProjectId}
                  />
                  <TemplateGallery
                    categories={templateLibrary}
                    projectTemplates={projectTemplates}
                    activeProjectTitle={selectedProject.title}
                    onSelectTemplate={handleSelectTemplate}
                  />
                </div>
                <ReleaseNotesGenerator
                    projectId={selectedProject.id}
                    projectTitle={selectedProject.title}
                    artifacts={projectArtifacts}
                    addXp={addXp}
                    onDraftGenerated={() => markSelectedProjectActivity({ generatedReleaseNotes: true })}
                />
                <section className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col gap-5">
                    <header className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-pink-500/10 border border-pink-500/40 p-2">
                                <IntelligenceLogo className="w-5 h-5 text-pink-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">Creator Insights Hub</h3>
                                <p className="text-sm text-slate-400">Visit the secondary panel when you&apos;re ready for Atlas Intelligence and roadmap lore.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsInsightsOpen(true)}
                            className="flex items-center gap-2 rounded-md border border-pink-500/40 bg-pink-500/20 px-3 py-1.5 text-sm font-semibold text-pink-100 hover:border-pink-400 hover:bg-pink-500/30 transition-colors"
                        >
                            <IntelligenceLogo className="w-4 h-4" />
                            Open insights
                        </button>
                    </header>
                    <div className="space-y-3 text-sm text-slate-300">
                        {featuredAssistant && (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-4 py-3">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pink-300/80">
                                    <IntelligenceLogo className="w-4 h-4" />
                                    Atlas Intelligence spotlight
                                </p>
                                <p className="text-base font-semibold text-slate-100">{featuredAssistant.name}</p>
                                <p className="text-xs text-slate-400">{featuredAssistant.focus}</p>
                            </div>
                        )}
                        {upcomingMilestoneOverview && (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-4 py-3 space-y-1.5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">Next milestone</p>
                                <p className="text-base font-semibold text-slate-100">{upcomingMilestoneOverview.milestone.title}</p>
                                <p className="text-xs text-slate-400">{upcomingMilestoneOverview.milestone.focus}</p>
                                <p className="text-xs text-slate-500">
                                    {Math.round(upcomingMilestoneOverview.completion * 100)}% complete
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            Insights stay tucked away until you call for them, keeping the main workspace focused on capturing and shipping.
                        </p>
                    </div>
                </section>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                <p className="text-slate-500">Select a project to view its artifacts.</p>
            </div>
          )}
        </section>
      </main>
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Seed a New Artifact"
      >
        <CreateArtifactForm
          onCreate={handleCreateArtifact}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSourceArtifactId(null);
          }}
          sourceArtifactId={sourceArtifactId}
        />
      </Modal>
      <Modal
        isOpen={isQuickFactModalOpen}
        onClose={() => {
          if (!isSavingQuickFact) {
            setIsQuickFactModalOpen(false);
          }
        }}
        title="Add One Fact"
      >
        <QuickFactForm
          projectTitle={selectedProject?.title ?? 'your world'}
          onSubmit={handleQuickFactSubmit}
          onCancel={() => {
            if (!isSavingQuickFact) {
              setIsQuickFactModalOpen(false);
            }
          }}
          isSubmitting={isSavingQuickFact}
        />
      </Modal>
      <Modal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        title="Create a New Project"
      >
        <CreateProjectForm
            onCreate={handleCreateProject}
            onClose={() => setIsCreateProjectModalOpen(false)}
        />
      </Modal>
      <SecondaryInsightsPanel
        assistants={aiAssistants}
        milestones={milestoneProgress}
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
      />
      {infoModalContent && (
        <InfoModal
          isOpen={!!infoModalContent}
          onClose={() => setInfoModalContent(null)}
          title={infoModalContent.title}
          message={infoModalContent.message}
        />
      )}
      <PublishToGitHubModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublishToGithubRepo}
        isPublishing={isPublishing}
      />
      </div>
    </DepthPreferencesProvider>
  );
}
