
import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from 'react';
import {
    AIAssistant,
    Achievement,
    Artifact,
    ArtifactType,
    ConlangLexeme,
    Milestone,
    Project,
    ProjectStatus,
    ProjectTemplate,
    Quest,
    Questline,
    Relation,
    TaskData,
    TaskState,
    TemplateCategory,
    UserProfile,
} from './types';
import { CubeIcon, BookOpenIcon, PlusIcon, TableCellsIcon, ShareIcon, ArrowDownTrayIcon, ViewColumnsIcon, ArrowUpTrayIcon, BuildingStorefrontIcon, FolderPlusIcon, SparklesIcon } from './components/Icons';
import Modal from './components/Modal';
import CreateArtifactForm from './components/CreateArtifactForm';
import CreateProjectForm from './components/CreateProjectForm';
import Quests from './components/Quests';
import Achievements from './components/Achievements';
import ArtifactDetail from './components/ArtifactDetail';
import GraphView from './components/GraphView';
import ConlangLexiconEditor from './components/ConlangLexiconEditor';
import StoryEditor from './components/StoryEditor';
import KanbanBoard from './components/KanbanBoard';
import CharacterEditor from './components/CharacterEditor';
import WikiEditor from './components/WikiEditor';
import LocationEditor from './components/LocationEditor';
import TaskEditor from './components/TaskEditor';
import { exportArtifactsToCSV, exportArtifactsToTSV, exportProjectAsStaticSite } from './utils/export';
import { importArtifactsFromCSV } from './utils/import';
import ProjectOverview from './components/ProjectOverview';
import ProjectInsights from './components/ProjectInsights';
import { getStatusClasses, formatStatusLabel } from './utils/status';
import TemplateGallery from './components/TemplateGallery';
import ProjectTemplatePicker from './components/ProjectTemplatePicker';
import ReleaseNotesGenerator from './components/ReleaseNotesGenerator';
import StreakTracker from './components/StreakTracker';
import QuestlineBoard from './components/QuestlineBoard';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import UserProfileCard from './components/UserProfileCard';
import GitHubImportPanel from './components/GitHubImportPanel';
import SecondaryInsightsPanel from './components/SecondaryInsightsPanel';
import MilestoneTracker from './components/MilestoneTracker';
import { createProjectActivity, evaluateMilestoneProgress, MilestoneProgressOverview, ProjectActivity } from './utils/milestoneProgress';

const dailyQuests: Quest[] = [
    { id: 'q1', title: 'First Seed', description: 'Create at least one new artifact.', isCompleted: (artifacts) => artifacts.length > 7, xp: 5 },
    { id: 'q2', title: 'Task Master', description: 'Complete a task.', isCompleted: (artifacts) => artifacts.some(a => a.type === ArtifactType.Task && (a.data as TaskData).state === TaskState.Done), xp: 8 },
    { id: 'q3', title: 'Daily Forge', description: 'Create a seed and link it to another.', isCompleted: (artifacts) => artifacts.some(a => a.relations.length > 0), xp: 10 },
];

const achievements: Achievement[] = [
    { id: 'ach-1', title: 'World Builder', description: 'Create your first project.', isUnlocked: (_, projects) => projects.length > 2 },
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
                            (artifact.data as TaskData | undefined)?.state === TaskState.Done,
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
        relatedProjectTemplateIds: ['conlang-workbench', 'world-wiki-launchpad'],
        templates: [
            { id: 'tam-magic-system', name: 'MagicSystem', description: 'Document the laws, costs, and taboos of threadweaving.', tags: ['magic', 'systems'] },
            { id: 'tam-rulebook', name: 'Rulebook', description: 'Capture canon rulings, rituals, and battle procedures.', tags: ['canon', 'reference'] },
            { id: 'tam-city', name: 'City', description: 'Map out districts, factions, and sensory details for a key metropolis.', tags: ['location'] },
            { id: 'tam-faction', name: 'Faction', description: 'Describe loyalties, resources, and political goals.', tags: ['faction', 'relationships'] },
            { id: 'tam-edruel', name: 'Edruel Ruins', description: 'Archaeological log for the ruin that anchors the main mystery.', tags: ['lore'] },
            { id: 'tam-thread-log', name: 'ThreadWeaving Log', description: 'Track legendary spells, their casters, and outcomes.', tags: ['magic', 'log'] },
            { id: 'tam-canon', name: 'Canon Tracker', description: 'Record continuity-sensitive facts, pronunciations, and prophecies.', tags: ['continuity'] },
        ],
    },
    {
        id: 'steamweave',
        title: 'Steamweave / Anya',
        description: 'Coal-punk ops boards for Anya’s guild drama and gadgeteering.',
        recommendedFor: ['Steamweave'],
        relatedProjectTemplateIds: ['serial-comic-kit'],
        templates: [
            { id: 'steam-clan', name: 'Clan', description: 'Roster clan leadership, ranks, and rivalries.', tags: ['faction'] },
            { id: 'steam-workshop', name: 'Workshop', description: 'Layout stations, ongoing inventions, and supply flows.', tags: ['location', 'operations'] },
            { id: 'steam-scene', name: 'Scene', description: 'Storyboard high-tension coal-punk set pieces.', tags: ['story'] },
            { id: 'steam-villain', name: 'Villain (Red-Eyes)', description: 'Profile motives, tactics, and weaknesses of Red-Eyes.', tags: ['character', 'antagonist'] },
            { id: 'steam-triangle', name: 'Love Triangle Map', description: 'Visualize relationship beats and emotional stakes.', tags: ['relationships'] },
            { id: 'steam-release', name: 'Release Notes', description: 'Translate updates into flavorful patch notes for collaborators.', tags: ['delivery'] },
        ],
    },
    {
        id: 'dustland',
        title: 'Dustland RPG',
        description: 'Retro CRT RPG modules for Dustland\'s persona-driven world-simulation.',
        recommendedFor: ['Dustland'],
        relatedProjectTemplateIds: ['game-design-lab'],
        templates: [
            { id: 'dust-module', name: 'Module', description: 'Outline module scope, level bands, and key beats.', tags: ['campaign'] },
            { id: 'dust-quest', name: 'Quest', description: 'Track objectives, rewards, and branching outcomes.', tags: ['quest'] },
            { id: 'dust-mask', name: 'Persona Mask', description: 'Detail roleplay cues, stat shifts, and hidden agendas unlocked by a mask.', tags: ['identity'] },
            { id: 'dust-npc', name: 'NPC', description: 'Profile allies, merchants, and nemeses with quick hooks.', tags: ['npc'] },
            { id: 'dust-item', name: 'Item', description: 'Catalog relics, crafting components, and upgrades.', tags: ['loot'] },
            { id: 'dust-tileset', name: 'Tileset', description: 'Collect reusable battle maps and environmental hazards.', tags: ['maps'] },
            { id: 'dust-memory', name: 'World Memory Log', description: 'Track persistent state changes, scars, and echoes across playthroughs.', tags: ['systems'] },
            { id: 'dust-effect', name: 'Effect Pack', description: 'Bundle event-driven transformations and ambient triggers.', tags: ['events'] },
            { id: 'dust-build', name: 'Build', description: 'Record loadouts, persona synergies, and playtest notes.', tags: ['characters'] },
        ],
    },
    {
        id: 'spatch',
        title: 'Spatch League',
        description: 'Sports-drama templates tuned for the Spatch comic universe.',
        recommendedFor: ['Spatch'],
        relatedProjectTemplateIds: ['serial-comic-kit'],
        templates: [
            { id: 'spatch-team', name: 'Team', description: 'Roster starters, strategies, and rival teams.', tags: ['team'] },
            { id: 'spatch-mentor', name: 'Mentor', description: 'Capture training montages, philosophies, and signature drills.', tags: ['character'] },
            { id: 'spatch-rule', name: 'Rule Variant', description: 'Document variant mechanics and how they change match flow.', tags: ['rules'] },
            { id: 'spatch-match', name: 'Match', description: 'Plan panels, momentum swings, and highlight reels.', tags: ['story'] },
            { id: 'spatch-board', name: 'Panel Board', description: 'Block out page layouts and pacing for episodes.', tags: ['storyboard'] },
        ],
    },
    {
        id: 'darv',
        title: 'Darv Conlang',
        description: 'Linguistic workbench for the ancient language of the Darv.',
        recommendedFor: ['Darv'],
        relatedProjectTemplateIds: ['conlang-workbench'],
        templates: [
            { id: 'darv-lexicon', name: 'Lexicon', description: 'List lemmas, glosses, and phonological notes.', tags: ['language'] },
            { id: 'darv-phonology', name: 'Phonology', description: 'Summarize phonemes, clusters, and stress rules.', tags: ['language'] },
            { id: 'darv-paradigm', name: 'Paradigm', description: 'Lay out conjugation or declension tables.', tags: ['grammar'] },
            { id: 'darv-proverb', name: 'Proverb', description: 'Capture idioms with cultural context and translations.', tags: ['culture'] },
            { id: 'darv-myth', name: 'Myth', description: 'Outline myths and legends tied to linguistic lore.', tags: ['story'] },
        ],
    },
    {
        id: 'sacred-truth',
        title: 'Sacred Truth Dossiers',
        description: 'Supernatural investigation kits for the Sacred Truth vampire saga.',
        recommendedFor: ['Sacred Truth'],
        relatedProjectTemplateIds: ['world-wiki-launchpad'],
        templates: [
            { id: 'sacred-episode', name: 'Episode', description: 'Structure case-of-the-week arcs with cold opens and cliffhangers.', tags: ['story'] },
            { id: 'sacred-case', name: 'Case File', description: 'Log evidence, suspects, and unresolved leads.', tags: ['mystery'] },
            { id: 'sacred-codex', name: 'Monster Codex', description: 'Detail monster biology, tells, and encounter best practices.', tags: ['bestiary'] },
            { id: 'sacred-cathedral', name: 'Cathedral Asset', description: 'Catalog lairs, safe houses, and relic vaults.', tags: ['location'] },
        ],
    },
];

const projectTemplates: ProjectTemplate[] = [
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
                type: ArtifactType.Story,
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
                title: 'Issue Sprint Backlog',
                type: ArtifactType.Task,
                summary: 'Track page breakdowns, lettering, and marketing beats for the next drop.',
                status: 'in-progress',
                tags: ['sprint', 'release'],
                data: { state: TaskState.InProgress } as TaskData,
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
                title: 'Grammar Notes',
                type: ArtifactType.Wiki,
                summary: 'Document morphology, syntax quirks, and inspiration languages.',
                status: 'idea',
                tags: ['reference'],
                data: { content: '## Phonology\n- Consonant harmony sketch\n\n## Morphology\n- Case markers TBD' },
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
                data: { state: TaskState.InProgress } as TaskData,
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
];

const getDefaultDataForType = (type: ArtifactType, title?: string): Artifact['data'] => {
    switch (type) {
        case ArtifactType.Conlang:
            return [];
        case ArtifactType.Story:
        case ArtifactType.Scene:
            return [];
        case ArtifactType.Task:
            return { state: TaskState.Todo } as TaskData;
        case ArtifactType.Character:
            return { bio: '', traits: [] };
        case ArtifactType.Wiki:
            return { content: `# ${title ?? 'Untitled'}\n\n` };
        case ArtifactType.Location:
            return { description: '', features: [] };
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
];

const getInitials = (name: string) => {
  if (!name) return 'C';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const Header: React.FC<{ profile: UserProfile; xpProgress: number; level: number; onSignOut: () => void }> = ({ profile, xpProgress, level, onSignOut }) => (
  <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 px-4 sm:px-8 py-3 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <CubeIcon className="w-7 h-7 text-cyan-400" />
      <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
    </div>
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-sm font-semibold text-slate-200">{profile.displayName}</span>
        <span className="text-xs text-slate-400">Level {level}</span>
      </div>
      <div className="relative w-32 h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500" style={{ width: `${Math.min(xpProgress, 100)}%` }}></div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-wider">{xpProgress} / 100 XP</span>
      </div>
      {profile.photoURL ? (
        <img src={profile.photoURL} alt={profile.displayName} className="hidden sm:block w-9 h-9 rounded-full object-cover border border-slate-600" />
      ) : (
        <div className="hidden sm:flex w-9 h-9 rounded-full bg-cyan-600/20 border border-cyan-500/40 items-center justify-center text-sm font-semibold text-cyan-200">
          {getInitials(profile.displayName)}
        </div>
      )}
      <button
        onClick={() => { void onSignOut(); }}
        className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/70 hover:bg-slate-700 rounded-md border border-slate-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  </header>
);

const ProjectCard: React.FC<{ project: Project; onSelect: (id: string) => void; isSelected: boolean }> = ({ project, onSelect, isSelected }) => {
    const statusColors: Record<ProjectStatus, string> = {
        [ProjectStatus.Active]: 'bg-green-500',
        [ProjectStatus.Idea]: 'bg-yellow-500',
        [ProjectStatus.Paused]: 'bg-orange-500',
        [ProjectStatus.Archived]: 'bg-slate-600',
    };

    return (
        <div
            onClick={() => onSelect(project.id)}
            className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${isSelected ? 'bg-slate-700/50 border-cyan-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
            role="button"
            aria-pressed={isSelected}
            tabIndex={0}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(project.id);
                }
            }}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-100">{project.title}</h3>
                <span className={`w-3 h-3 rounded-full mt-1 ${statusColors[project.status]}`} title={`Status: ${project.status}`}></span>
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.summary}</p>
        </div>
    );
};

const ArtifactListItem: React.FC<{ artifact: Artifact; onSelect: (id: string) => void; isSelected: boolean }> = ({ artifact, onSelect, isSelected }) => (
    <tr
        onClick={() => onSelect(artifact.id)}
        className={`border-b border-slate-800 cursor-pointer transition-colors ${isSelected ? 'bg-cyan-900/30' : 'hover:bg-slate-700/50'}`}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(artifact.id);
            }
        }}
    >
        <td className="p-3 flex items-center gap-3">
            <BookOpenIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="font-semibold">{artifact.title}</span>
        </td>
        <td className="p-3 text-slate-400">{artifact.type}</td>
        <td className="p-3">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(artifact.status)}`}>
                {formatStatusLabel(artifact.status)}
            </span>
        </td>
        <td className="p-3 text-slate-500 hidden lg:table-cell">{artifact.summary}</td>
    </tr>
);


export default function App() {
  const { projects, setProjects, artifacts, setArtifacts, profile, addXp, updateProfile } = useUserData();
  const { signOutUser } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'graph' | 'kanban'>('table');
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<'ALL' | ArtifactType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [projectActivityLog, setProjectActivityLog] = useState<Record<string, ProjectActivity>>({});

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

  const handleUpdateArtifactData = useCallback((artifactId: string, data: Artifact['data']) => {
    setArtifacts(currentArtifacts =>
        currentArtifacts.map(art => {
            if (art.id === artifactId) {
                if (art.type === ArtifactType.Task && (data as TaskData).state === TaskState.Done && (art.data as TaskData).state !== TaskState.Done) {
                    addXp(8); // XP Source: close task (+8)
                }
                return { ...art, data };
            }
            return art;
        })
    );
  }, [addXp, setArtifacts]);

  const handleUpdateArtifact = useCallback((updatedArtifact: Artifact) => {
    setArtifacts(currentArtifacts => currentArtifacts.map(art => art.id === updatedArtifact.id ? updatedArtifact : art));
  }, [setArtifacts]);

  const handleAddRelation = useCallback((fromId: string, toId: string, kind: string) => {
    setArtifacts(currentArtifacts =>
      currentArtifacts.map(art => {
        if (art.id === fromId) {
          const newRelation: Relation = { toId, kind };
          return { ...art, relations: [...art.relations, newRelation] };
        }
        return art;
      }),
    );
  }, [setArtifacts]);

  const handleRemoveRelation = useCallback((fromId: string, relationIndex: number) => {
    setArtifacts(currentArtifacts =>
      currentArtifacts.map(art => {
        if (art.id === fromId) {
          return { ...art, relations: art.relations.filter((_, index) => index !== relationIndex) };
        }
        return art;
      }),
    );
  }, [setArtifacts]);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  const handleCreateProject = useCallback(({ title, summary }: { title: string; summary: string }) => {
    if (!profile) return;
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      ownerId: profile.uid,
      title,
      summary,
      status: ProjectStatus.Active,
      tags: [],
    };

    setProjects(prev => [...prev, newProject]);
    addXp(5);
    setIsCreateProjectModalOpen(false);
    setSelectedProjectId(newProject.id);
    setSelectedArtifactId(null);
  }, [profile, setProjects, addXp]);

  const handleCreateArtifact = useCallback(({ title, type, summary }: { title: string; type: ArtifactType; summary: string }) => {
    if (!selectedProjectId || !profile) return;

    const data: Artifact['data'] = getDefaultDataForType(type, title);

    const newArtifact: Artifact = {
      id: `art-${Date.now()}`,
      ownerId: profile.uid,
      projectId: selectedProjectId,
      title,
      type,
      summary,
      status: 'idea',
      tags: [],
      relations: [],
      data,
    };

    setArtifacts(prev => [...prev, newArtifact]);
    addXp(5);
    setIsCreateModalOpen(false);
    setSelectedArtifactId(newArtifact.id);
  }, [profile, selectedProjectId, addXp, setArtifacts]);

  const handleApplyProjectTemplate = useCallback((template: ProjectTemplate) => {
    if (!profile || !selectedProjectId) return;

    const projectArtifactsForSelection = artifacts.filter(artifact => artifact.projectId === selectedProjectId);
    const existingTitles = new Set(projectArtifactsForSelection.map(artifact => artifact.title.toLowerCase()));
    const timestamp = Date.now();

    const newArtifacts = template.artifacts
      .filter(blueprint => !existingTitles.has(blueprint.title.toLowerCase()))
      .map((blueprint, index) => ({
        id: `art-${timestamp + index}`,
        ownerId: profile.uid,
        projectId: selectedProjectId,
        title: blueprint.title,
        type: blueprint.type,
        summary: blueprint.summary,
        status: blueprint.status ?? 'draft',
        tags: blueprint.tags ? [...blueprint.tags] : [],
        relations: [],
        data: blueprint.data ?? getDefaultDataForType(blueprint.type, blueprint.title),
      }));

    if (newArtifacts.length > 0) {
      setArtifacts(prev => [...prev, ...newArtifacts]);
      addXp(newArtifacts.length * 5);
      setSelectedArtifactId(newArtifacts[0].id);
      alert(`Added ${newArtifacts.length} starter artifact${newArtifacts.length > 1 ? 's' : ''} from the ${template.name} template.`);
    } else {
      alert('All of the template\'s starter artifacts already exist in this project.');
    }

    if (template.projectTags.length > 0) {
      setProjects(prev => {
        let changed = false;
        const next = prev.map(project => {
          if (project.id !== selectedProjectId) {
            return project;
          }
          const mergedTags = Array.from(new Set([...project.tags, ...template.projectTags]));
          if (mergedTags.length !== project.tags.length) {
            changed = true;
            return { ...project, tags: mergedTags };
          }
          return project;
        });
        return changed ? next : prev;
      });
    }
  }, [profile, selectedProjectId, artifacts, setArtifacts, addXp, setProjects]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId || !profile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const imported = importArtifactsFromCSV(content, selectedProjectId, profile.uid);

            const existingIds = new Set(artifacts.map(a => a.id));
            const newArtifacts = imported.filter(i => !existingIds.has(i.id));

      if (newArtifacts.length > 0) {
        setArtifacts(prev => [...prev, ...newArtifacts]);
        alert(`${newArtifacts.length} new artifacts imported successfully!`);
        markSelectedProjectActivity({ importedCsv: true });
      } else {
        alert('No new artifacts to import. All IDs in the file already exist.');
      }
        } catch (error) {
            alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleGitHubArtifactsImported = useCallback((newArtifacts: Artifact[]) => {
    if (newArtifacts.length === 0) {
      return;
    }

    setArtifacts(prev => [...prev, ...newArtifacts]);
    const projectId = newArtifacts[0]?.projectId ?? selectedProjectId;
    if (projectId) {
      updateProjectActivity(projectId, { githubImported: true });
    }
  }, [setArtifacts, selectedProjectId, updateProjectActivity]);

  const handlePublish = () => {
    if (selectedProject && projectArtifacts.length > 0) {
        exportProjectAsStaticSite(selectedProject, projectArtifacts);
        markSelectedProjectActivity({ publishedSite: true });
        addXp(25); // XP Source: publish (+25)
    } else {
        alert('Please select a project with artifacts to publish.');
    }
  };

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectArtifacts = useMemo(() => artifacts.filter(a => a.projectId === selectedProjectId), [artifacts, selectedProjectId]);
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);
  const availableStatuses = useMemo(() => Array.from(new Set(projectArtifacts.map(artifact => artifact.status))).sort(), [projectArtifacts]);
  const emptyActivity = useMemo(() => createProjectActivity(), []);
  const selectedProjectActivity = useMemo(() => {
    if (!selectedProjectId) {
      return emptyActivity;
    }
    return projectActivityLog[selectedProjectId] ?? emptyActivity;
  }, [projectActivityLog, selectedProjectId, emptyActivity]);
  const milestoneProgress = useMemo<MilestoneProgressOverview[]>(() => {
    if (!selectedProject) {
      return [];
    }
    return evaluateMilestoneProgress(milestoneRoadmap, {
      project: selectedProject,
      artifacts: projectArtifacts,
      profile,
      activity: selectedProjectActivity,
    });
  }, [selectedProject, projectArtifacts, profile, selectedProjectActivity]);

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

      if (normalizedQuery) {
        const haystack = `${artifact.title} ${artifact.summary} ${artifact.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [projectArtifacts, artifactTypeFilter, statusFilter, searchTerm]);

  const hasActiveFilters = artifactTypeFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm.trim() !== '';
  const filteredSelectedArtifactHidden = Boolean(selectedArtifact && !filteredArtifacts.some(artifact => artifact.id === selectedArtifact.id));

  const handleUpdateProject = useCallback((projectId: string, updater: (project: Project) => Project) => {
    setProjects(currentProjects => currentProjects.map(project => project.id === projectId ? updater(project) : project));
  }, [setProjects]);

  const handleQuestlineClaim = useCallback((questlineId: string, xpReward: number) => {
    if (!profile) return;
    if (profile.questlinesClaimed.includes(questlineId)) return;
    addXp(xpReward);
    updateProfile({ questlinesClaimed: [questlineId] });
  }, [profile, addXp, updateProfile]);

  const handleExportArtifacts = useCallback((format: 'csv' | 'tsv') => {
    if (!selectedProject) {
      return;
    }
    markSelectedProjectActivity({ exportedData: true });
    if (format === 'csv') {
      exportArtifactsToCSV(projectArtifacts, selectedProject.title);
    } else {
      exportArtifactsToTSV(projectArtifacts, selectedProject.title);
    }
  }, [selectedProject, projectArtifacts, markSelectedProjectActivity]);

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
    return null;
  }

  const xpProgress = profile.xp % 100;
  const level = Math.floor(profile.xp / 100) + 1;
  const isViewingOwnWorkspace = !selectedProject || selectedProject.ownerId === profile.uid;
  const featuredAssistant = aiAssistants[0];
  const upcomingMilestone = milestoneRoadmap[0];

  const handleResetFilters = () => {
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

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
    <div className="min-h-screen flex flex-col">
      <Header profile={profile} xpProgress={xpProgress} level={level} onSignOut={signOutUser} />
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
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-md transition-colors"
                    title="Create New Project"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    New
                </button>
            </div>
            <div className="space-y-3">
                {projects.map(p => (
                    <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} isSelected={p.id === selectedProjectId} />
                ))}
            </div>
          </div>
          <Quests quests={dailyQuests} artifacts={artifacts} projects={projects} />
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
              <ProjectOverview
                  project={selectedProject}
                  onUpdateProject={handleUpdateProject}
              />
              <ProjectInsights artifacts={projectArtifacts} />
              <MilestoneTracker items={milestoneProgress} />
              <GitHubImportPanel
                  projectId={selectedProject.id}
                  ownerId={profile.uid}
                  existingArtifacts={projectArtifacts}
                  onArtifactsImported={handleGitHubArtifactsImported}
                  addXp={addXp}
              />

              <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Artifacts in {selectedProject.title}</h2>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv,.tsv" className="hidden" />
                        <button onClick={handleImportClick} title="Import from CSV or TSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowUpTrayIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleExportArtifacts('csv')} title="Export to CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleExportArtifacts('tsv')} title="Export to TSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold">TSV</span>
                        </button>
                        <ViewSwitcher />
                        <button onClick={handlePublish} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-md transition-colors shadow-lg hover:shadow-green-500/50">
                            <BuildingStorefrontIcon className="w-5 h-5" />
                            Publish Site
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-lg hover:shadow-cyan-500/50"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New Seed
                        </button>
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
                    </div>
                    <div className="text-xs text-slate-400">
                        Showing <span className="text-slate-200 font-semibold">{filteredArtifacts.length}</span> of <span className="text-slate-200 font-semibold">{projectArtifacts.length}</span> artifacts
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
                    {selectedArtifact.type === ArtifactType.Story && (
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
                    {selectedArtifact.type === ArtifactType.Task && (
                        <TaskEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                </div>
              )}
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
                                <SparklesIcon className="w-5 h-5 text-pink-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">Creator Insights Hub</h3>
                                <p className="text-sm text-slate-400">Visit the secondary panel when you&apos;re ready for copilots and roadmap lore.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsInsightsOpen(true)}
                            className="flex items-center gap-2 rounded-md border border-pink-500/40 bg-pink-500/20 px-3 py-1.5 text-sm font-semibold text-pink-100 hover:border-pink-400 hover:bg-pink-500/30 transition-colors"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Open insights
                        </button>
                    </header>
                    <div className="space-y-3 text-sm text-slate-300">
                        {featuredAssistant && (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-pink-300/80">Featured copilot</p>
                                <p className="text-base font-semibold text-slate-100">{featuredAssistant.name}</p>
                                <p className="text-xs text-slate-400">{featuredAssistant.focus}</p>
                            </div>
                        )}
                        {upcomingMilestone && (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">Next milestone</p>
                                <p className="text-base font-semibold text-slate-100">{upcomingMilestone.title}</p>
                                <p className="text-xs text-slate-400">{upcomingMilestone.focus}</p>
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
          onClose={() => setIsCreateModalOpen(false)}
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
        milestones={milestoneRoadmap}
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
      />
    </div>
  );
}
