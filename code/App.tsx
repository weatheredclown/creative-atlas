
import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from 'react';
import { Project, Artifact, ProjectStatus, ArtifactType, ConlangLexeme, Quest, Relation, Achievement, Scene, TaskData, TaskState, CharacterData, WikiData, LocationData, TemplateCategory, Milestone, AIAssistant } from './types';
import { CubeIcon, BookOpenIcon, PlusIcon, TableCellsIcon, ShareIcon, ArrowDownTrayIcon, ViewColumnsIcon, ArrowUpTrayIcon, BuildingStorefrontIcon, FolderPlusIcon, UserCircleIcon } from './components/Icons';
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
import { downloadCsvContent, downloadZipBuffer } from './utils/export';
import ProjectInsights from './components/ProjectInsights';
import { getStatusClasses, formatStatusLabel } from './utils/status';
import TemplateGallery from './components/TemplateGallery';
import Roadmap from './components/Roadmap';
import AICopilotPanel from './components/AICopilotPanel';
import { useAuth } from './context/AuthContext';
import { useAtlasData } from './context/AtlasDataContext';
import AuthPanel from './components/AuthPanel';
import { importArtifactsViaWorker, exportArtifactsViaWorker, buildStaticSiteViaWorker } from './services/importExportGateway';

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

const templateLibrary: TemplateCategory[] = [
    {
        id: 'tamenzut',
        title: 'Tamenzut Series',
        description: 'High-fantasy seeds that keep the Tamenzut saga consistent from novel to novel.',
        recommendedFor: ['Tamenzut'],
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
        description: 'Questline scaffolds for the Dustland tabletop campaign.',
        recommendedFor: ['Dustland'],
        templates: [
            { id: 'dust-module', name: 'Module', description: 'Outline module scope, level bands, and key beats.', tags: ['campaign'] },
            { id: 'dust-quest', name: 'Quest', description: 'Track objectives, rewards, and branching outcomes.', tags: ['quest'] },
            { id: 'dust-mask', name: 'Persona Mask', description: 'Detail roleplay cues, mannerisms, and secret agendas.', tags: ['npc'] },
            { id: 'dust-npc', name: 'NPC', description: 'Profile allies, merchants, and nemeses with quick hooks.', tags: ['npc'] },
            { id: 'dust-item', name: 'Item', description: 'Catalog relics, crafting components, and upgrades.', tags: ['loot'] },
            { id: 'dust-tileset', name: 'Tileset', description: 'Collect reusable battle maps and environmental hazards.', tags: ['maps'] },
            { id: 'dust-build', name: 'Build', description: 'Record character progressions and loadouts for playtests.', tags: ['characters'] },
        ],
    },
    {
        id: 'spatch',
        title: 'Spatch League',
        description: 'Sports-drama templates tuned for the Spatch comic universe.',
        recommendedFor: ['Spatch'],
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
        templates: [
            { id: 'sacred-episode', name: 'Episode', description: 'Structure case-of-the-week arcs with cold opens and cliffhangers.', tags: ['story'] },
            { id: 'sacred-case', name: 'Case File', description: 'Log evidence, suspects, and unresolved leads.', tags: ['mystery'] },
            { id: 'sacred-codex', name: 'Monster Codex', description: 'Detail monster biology, tells, and encounter best practices.', tags: ['bestiary'] },
            { id: 'sacred-cathedral', name: 'Cathedral Asset', description: 'Catalog lairs, safe houses, and relic vaults.', tags: ['location'] },
        ],
    },
];

const milestoneRoadmap: Milestone[] = [
    {
        id: 'm1',
        title: 'M1 — MVP',
        timeline: 'Weeks 1–4',
        focus: 'Ship the graph-native core so ideas can be captured, linked, and exported.',
        objectives: [
            'Core graph model, Projects/Artifacts/Relations',
            'Seed capture, Table view, basic Graph view',
            'CSV import/export (artifacts, relations)',
            'GitHub read-only import (repos/issues/releases)',
        ],
    },
    {
        id: 'm2',
        title: 'M2 — Editors & Gamification',
        timeline: 'Weeks 5–8',
        focus: 'Deepen creation flows with rich editors and playful progression loops.',
        objectives: [
            'Conlang table editor; Storyboard; Kanban',
            'XP/Streaks/Quests + Achievements',
            'Markdown bundle export',
        ],
    },
    {
        id: 'm3',
        title: 'M3 — Publishing & Integrations',
        timeline: 'Weeks 9–12',
        focus: 'Publish worlds outward with search, release tooling, and static sites.',
        objectives: [
            'Static site exporter (Wikis/Docs)',
            'Release notes generator',
            'Search (Meilisearch), advanced filters',
        ],
    },
    {
        id: 'm4',
        title: 'M4 — Polish & Extensibility',
        timeline: 'Weeks 13–16',
        focus: 'Open the universe with plugins, theming, and offline-friendly polish.',
        objectives: [
            'Plugin API + 3 sample plugins (conlang, webcomic, ai prompts)',
            'Theming, keyboard palette, offline cache (light)',
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

const Header: React.FC<{ xp: number; userName?: string; onLogout?: () => void }> = ({ xp, userName, onLogout }) => (
  <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 px-4 sm:px-8 py-3 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <CubeIcon className="w-7 h-7 text-cyan-400" />
      <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
    </div>
    <div className="flex items-center gap-4">
        {userName && (
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <UserCircleIcon className="w-5 h-5 text-cyan-300" />
            <span>{userName}</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2 py-1 text-xs font-semibold text-slate-300 border border-slate-600/70 rounded-md hover:border-cyan-500 hover:text-white transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        )}
        <div className="text-sm font-medium text-slate-400">Creator Level 1</div>
        <div className="relative w-32 h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500" style={{ width: `${Math.min(xp, 100)}%` }}></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-wider">{xp} / 100 XP</span>
        </div>
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
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const {
    projects,
    artifacts,
    settings,
    isHydrated,
    createProject: createProjectRecord,
    createArtifact: createArtifactRecord,
    updateArtifact: updateArtifactRecord,
    addXp: addXpToProfile,
    importArtifacts,
  } = useAtlasData();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'graph' | 'kanban'>('table');
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<'ALL' | ArtifactType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (projects.length === 0) {
      setSelectedProjectId(null);
      setSelectedArtifactId(null);
      return;
    }
    setSelectedProjectId(previous => (previous && projects.some(project => project.id === previous) ? previous : projects[0].id));
  }, [isHydrated, projects]);

  useEffect(() => {
    if (!selectedArtifactId) {
      return;
    }
    if (!artifacts.some(artifact => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(null);
    }
  }, [artifacts, selectedArtifactId]);

  const xp = settings?.xp ?? 0;

  const addXp = useCallback((amount: number) => {
    void addXpToProfile(amount);
  }, [addXpToProfile]);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <span className="text-sm text-slate-400">Loading your Creative Atlas session…</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <span className="text-sm text-slate-400">Syncing your worlds…</span>
      </div>
    );
  }

  const handleUpdateArtifactData = useCallback(async (artifactId: string, data: Artifact['data']) => {
    const artifact = artifacts.find(item => item.id === artifactId);
    if (!artifact) {
      return;
    }
    const previousState = artifact.type === ArtifactType.Task ? (artifact.data as TaskData).state : null;
    try {
      await updateArtifactRecord(artifactId, { data });
      if (artifact.type === ArtifactType.Task) {
        const nextState = (data as TaskData).state;
        if (previousState !== TaskState.Done && nextState === TaskState.Done) {
          void addXp(8);
        }
      }
    } catch (error) {
      alert(`Failed to update artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [artifacts, updateArtifactRecord, addXp]);

  const handleUpdateArtifact = useCallback(async (updatedArtifact: Artifact) => {
    try {
      await updateArtifactRecord(updatedArtifact.id, {
        title: updatedArtifact.title,
        summary: updatedArtifact.summary,
        status: updatedArtifact.status,
        tags: updatedArtifact.tags,
        relations: updatedArtifact.relations,
        data: updatedArtifact.data,
      });
    } catch (error) {
      alert(`Failed to update artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [updateArtifactRecord]);

  const handleAddRelation = useCallback(async (fromId: string, toId: string, kind: string) => {
    const artifact = artifacts.find(item => item.id === fromId);
    if (!artifact) {
      return;
    }
    try {
      await updateArtifactRecord(fromId, { relations: [...artifact.relations, { toId, kind }] });
    } catch (error) {
      alert(`Unable to link artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [artifacts, updateArtifactRecord]);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  const handleCreateProject = useCallback(async ({ title, summary }: { title: string; summary: string }) => {
    try {
      const project = await createProjectRecord({ title, summary });
      setIsCreateProjectModalOpen(false);
      setSelectedProjectId(project.id);
      setSelectedArtifactId(null);
      void addXp(5);
    } catch (error) {
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [createProjectRecord, addXp]);

  const handleCreateArtifact = useCallback(async ({ title, type, summary }: { title: string; type: ArtifactType; summary: string }) => {
    if (!selectedProjectId) {
      return;
    }

    let data: Artifact['data'] = {};
    if (type === ArtifactType.Conlang || type === ArtifactType.Story) data = [];
    if (type === ArtifactType.Task) data = { state: TaskState.Todo };
    if (type === ArtifactType.Character) data = { bio: '', traits: [] };
    if (type === ArtifactType.Wiki) data = { content: `# ${title}\n\n` };
    if (type === ArtifactType.Location) data = { description: '', features: [] };

    try {
      const newArtifact = await createArtifactRecord({
        projectId: selectedProjectId,
        type,
        title,
        summary,
        status: 'idea',
        tags: [],
        relations: [],
        data,
      });
      setIsCreateModalOpen(false);
      setSelectedArtifactId(newArtifact.id);
      void addXp(5);
    } catch (error) {
      alert(`Failed to create artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [createArtifactRecord, selectedProjectId, addXp]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const imported = await importArtifactsViaWorker(content, selectedProjectId, user.id);
        const importedCount = await importArtifacts(imported);
        if (importedCount > 0) {
          alert(`${importedCount} new artifacts imported successfully!`);
          void addXp(5);
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

  const handleExportCsv = useCallback(async () => {
    if (!selectedProject) {
      alert('Select a project before exporting to CSV.');
      return;
    }
    try {
      const { filename, content } = await exportArtifactsViaWorker(projectArtifacts, selectedProject.title);
      downloadCsvContent(content, filename);
    } catch (error) {
      alert(`CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [projectArtifacts, selectedProject]);

  const handlePublish = useCallback(async () => {
    if (!selectedProject || projectArtifacts.length === 0) {
      alert('Please select a project with artifacts to publish.');
      return;
    }
    try {
      const { filename, buffer } = await buildStaticSiteViaWorker(selectedProject, projectArtifacts);
      downloadZipBuffer(buffer, filename);
      void addXp(25); // XP Source: publish (+25)
    } catch (error) {
      alert(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addXp, projectArtifacts, selectedProject]);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectArtifacts = useMemo(() => artifacts.filter(a => a.projectId === selectedProjectId), [artifacts, selectedProjectId]);
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);
  const availableStatuses = useMemo(() => Array.from(new Set(projectArtifacts.map(artifact => artifact.status))).sort(), [projectArtifacts]);

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

  const handleResetFilters = () => {
    setArtifactTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  const ViewSwitcher = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
        <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <TableCellsIcon className="w-4 h-4" /> Table
        </button>
        <button onClick={() => setViewMode('graph')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ShareIcon className="w-4 h-4" /> Graph
        </button>
        <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ViewColumnsIcon className="w-4 h-4" /> Kanban
        </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header xp={xp} userName={user.displayName || user.email} onLogout={handleLogout} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8">
        <aside className="lg:col-span-3 space-y-6">
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
          <Achievements achievements={achievements} artifacts={artifacts} projects={projects} />
        </aside>

        <section className="lg:col-span-9 space-y-8">
          {selectedProject ? (
            <>
              <ProjectInsights artifacts={projectArtifacts} />

              <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Artifacts in {selectedProject.title}</h2>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                        <button onClick={handleImportClick} title="Import from CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowUpTrayIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleExportCsv} title="Export to CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" />
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
                        addXp={addXp}
                    />
                    {selectedArtifact.type === ArtifactType.Conlang && (
                        <ConlangLexiconEditor
                            artifact={selectedArtifact}
                            conlangName={selectedProject.title}
                            onLexemesAdded={(id, lexemes) => handleUpdateArtifactData(id, [...(selectedArtifact.data as ConlangLexeme[]), ...lexemes])}
                            addXp={addXp}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Story && (
                        <StoryEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, scenes) => handleUpdateArtifactData(id, scenes)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Character && (
                        <CharacterEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
                <TemplateGallery categories={templateLibrary} activeProjectTitle={selectedProject.title} />
                <AICopilotPanel assistants={aiAssistants} />
                <div className="xl:col-span-2">
                    <Roadmap milestones={milestoneRoadmap} />
                </div>
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
    </div>
  );
}
