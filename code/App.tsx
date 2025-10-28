
import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from 'react';
import { Project, Artifact, ProjectStatus, ArtifactType, ConlangLexeme, Quest, Relation, Achievement, TaskData, TaskState, TemplateCategory, Milestone, AIAssistant, UserProfile, Scene, TemplateSeed } from './types';
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
import ReleaseNotesGenerator from './components/ReleaseNotesGenerator';
import { useUserData } from './contexts/UserDataContext';
import { useAuth } from './contexts/AuthContext';
import UserProfileCard from './components/UserProfileCard';
import GitHubImportPanel from './components/GitHubImportPanel';
import SecondaryInsightsPanel from './components/SecondaryInsightsPanel';

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

const createDefaultDataForType = (type: ArtifactType, title: string): Artifact['data'] => {
    switch (type) {
        case ArtifactType.Conlang:
            return [];
        case ArtifactType.Story:
            return [];
        case ArtifactType.Task:
            return { state: TaskState.Todo };
        case ArtifactType.Character:
            return { bio: '', traits: [] };
        case ArtifactType.Wiki:
            return { content: `# ${title}\n\n` };
        case ArtifactType.Location:
            return { description: '', features: [] };
        default:
            return {};
    }
};

const composeSeedData = (seed: TemplateSeed): Artifact['data'] => {
    if (seed.data === undefined) {
        return createDefaultDataForType(seed.type, seed.title);
    }

    const base = createDefaultDataForType(seed.type, seed.title);

    if (Array.isArray(seed.data)) {
        return seed.data;
    }

    if (Array.isArray(base)) {
        return seed.data;
    }

    if (typeof base === 'object' && typeof seed.data === 'object') {
        return {
            ...(base as Record<string, unknown>),
            ...(seed.data as Record<string, unknown>),
        };
    }

    return seed.data;
};

const templateLibrary: TemplateCategory[] = [
    {
        id: 'tamenzut',
        title: 'Tamenzut Series',
        description: 'High-fantasy seeds that keep the Tamenzut saga consistent from novel to novel.',
        recommendedFor: ['Tamenzut'],
        dashboardHints: ['Table: Lore sweeps', 'Graph: Faction webs', 'Kanban: Ritual prep'],
        starterArtifacts: [
            {
                title: 'Threadweaving Laws',
                type: ArtifactType.MagicSystem,
                summary: 'Codify the core tenets, prices, and taboos of the saga’s magic.',
                status: 'draft',
                tags: ['magic', 'canon'],
                data: {
                    tenets: ['Emotion anchors any weave.', 'Balance of twin moons limits potency.'],
                    costs: ['Silvering veins after overuse.', 'Shared pain with bonded casters.'],
                    taboos: ['Never weave across royal bloodlines.', 'No reviving the twice-fallen.'],
                },
            },
            {
                title: 'Edruel Ruin Mystery',
                type: ArtifactType.Story,
                summary: 'Scene skeleton following the ancient ruin’s discovery and fallout.',
                status: 'outline',
                tags: ['plot', 'mystery'],
                data: [
                    { id: 'scene-edruel-1', title: 'Inciting Discovery', summary: 'Archaeologists unearth a moon-bound sigil at the ruin’s heart.' },
                    { id: 'scene-edruel-2', title: 'Council Fractures', summary: 'Factions argue over whether to unlock the sigil.' },
                    { id: 'scene-edruel-3', title: 'Moonfall Choice', summary: 'Threadweavers must decide between sealing or wielding the power.' },
                ] as Scene[],
            },
            {
                title: 'Treaty Summit Agenda',
                type: ArtifactType.Task,
                summary: 'Prep talking points before the three guilds arrive at the citadel.',
                status: 'todo',
                tags: ['diplomacy', 'priority'],
                data: { state: TaskState.InProgress, assignee: 'Lore Council', due: '2024-10-01' },
            },
            {
                title: 'Gilded City Atlas',
                type: ArtifactType.Location,
                summary: 'District notes for the capital’s markets, sanctums, and underways.',
                status: 'draft',
                tags: ['location'],
                data: {
                    description: 'A sun-drenched metropolis of sandstone towers, mirrored canals, and shadowed tunnels beneath.',
                    features: [
                        { id: 'feature-gilded-market', name: 'Sunstone Market', description: 'Bazaar where moon-silver and thread reagents trade hands at dawn.' },
                        { id: 'feature-gilded-sanctum', name: 'Auric Sanctum', description: 'Temple storing relic vows and elemental anchors.' },
                    ],
                },
            },
        ],
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
        dashboardHints: ['Storyboard: Episode arcs', 'Kanban: Gadget backlog'],
        starterArtifacts: [
            {
                title: 'Coalheart Confrontation',
                type: ArtifactType.Story,
                summary: 'Storyboard the rooftop clash against the Red-Eyes enforcers.',
                status: 'outline',
                tags: ['action', 'episode'],
                data: [
                    { id: 'scene-coalheart-1', title: 'Gearlift Ambush', summary: 'Anya and crew hijack a freight lift mid-ascent.' },
                    { id: 'scene-coalheart-2', title: 'Sparkstorm', summary: 'Prototype coils overload, threatening the city grid.' },
                    { id: 'scene-coalheart-3', title: 'Skyline Escape', summary: 'Final panel of the crew leaping across airship tethers.' },
                ] as Scene[],
            },
            {
                title: 'Anya’s Workshop Manual',
                type: ArtifactType.Wiki,
                summary: 'Living doc covering stations, rituals, and emergency drills.',
                status: 'draft',
                tags: ['operations'],
                data: {
                    content: '# Workshop Protocols\n\n- **Stations:** Coil Forge, Tether Lab, Signal Loft.\n- **Shift Ritual:** Begin with a shared story scrap to align mood.\n- **Failsafe:** Pull the brass raven to vent pressure into the tower spire.',
                },
            },
            {
                title: 'Panel Sprint Backlog',
                type: ArtifactType.Task,
                summary: 'Track the next issue’s key beats and art chores in one place.',
                status: 'in-progress',
                tags: ['storyboard', 'production'],
                data: { state: TaskState.InProgress, assignee: 'Art Guild', due: '2024-08-15' },
            },
            {
                title: 'Guild Operatives Roster',
                type: ArtifactType.Character,
                summary: 'Snapshot bios for the current crew and their unique gimmicks.',
                status: 'draft',
                tags: ['team'],
                data: {
                    bio: 'Operatives recruited from rival guilds, each with a signature gadget and emotional hook.',
                    traits: [
                        { id: 'trait-anya', key: 'Specialty', value: 'Coil harmonics & risk calculus' },
                        { id: 'trait-marlow', key: 'Tell', value: 'Rewinds watch spring when lying' },
                    ],
                },
            },
        ],
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
        dashboardHints: ['Table: Module tracker', 'Kanban: Playtest loops', 'Graph: Encounter chain'],
        starterArtifacts: [
            {
                title: 'Ashfall Module Blueprint',
                type: ArtifactType.Game,
                summary: 'Campaign skeleton with core loop, pillars, and escalation plan.',
                status: 'draft',
                tags: ['module'],
                data: {
                    coreLoop: ['Briefing at Dustmarket', 'Scavenge the ash zones', 'Retreat to repair caravans'],
                    pillars: ['Exploration', 'Resource Tension', 'Faction Reputation'],
                    escalation: 'Introduce volcanic storms that force players into hostile alliances.',
                },
            },
            {
                title: 'Playtest Wave One',
                type: ArtifactType.Task,
                summary: 'Schedule and capture feedback from the first Dustland playtest.',
                status: 'in-progress',
                tags: ['playtest'],
                data: { state: TaskState.InProgress, assignee: 'GM Team', due: '2024-07-20' },
            },
            {
                title: 'Dustmarket Bazaar',
                type: ArtifactType.Location,
                summary: 'Encounter map plus standout vendors for the caravan hub.',
                status: 'draft',
                tags: ['map'],
                data: {
                    description: 'A shanty town of welded hulls and fabric awnings, trading scrap miracles and whispered quests.',
                    features: [
                        { id: 'feature-bazaar-auction', name: 'Soot Auction Deck', description: 'Weekly gambles for rare scavenged tech.' },
                        { id: 'feature-bazaar-canteen', name: 'Cinder Canteen', description: 'Neutral ground for rumor trading and faction side deals.' },
                    ],
                },
            },
            {
                title: 'Rule Variants Ledger',
                type: ArtifactType.Wiki,
                summary: 'Document optional rules for grit damage, convoy upgrades, and weather.',
                status: 'draft',
                tags: ['rules'],
                data: {
                    content: '# Rule Variants\n\n## Grit Damage\nTrack cumulative stress; spend 3 grit for heroic last stands.\n\n## Convoy Upgrades\nUnlock tiered rigs that modify caravan travel dice.\n\n## Weather Fronts\nEach storm adds environmental tags to encounters.',
                },
            },
        ],
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
        dashboardHints: ['Storyboard: Match pacing', 'Kanban: Training arcs'],
        starterArtifacts: [
            {
                title: 'Season Opener Match Board',
                type: ArtifactType.Story,
                summary: 'Panel beats for the rivalry opener at the sky rink.',
                status: 'outline',
                tags: ['match', 'storyboard'],
                data: [
                    { id: 'scene-spatch-1', title: 'Opening Rally', summary: 'Crowd chant surges as the Spatch crew enters under floodlights.' },
                    { id: 'scene-spatch-2', title: 'Mid-game Twist', summary: 'New rule variant triggers a double-ball sequence.' },
                    { id: 'scene-spatch-3', title: 'Final Panel', summary: 'Protagonist lands an impossible spike, setting up a cliffhanger.' },
                ] as Scene[],
            },
            {
                title: 'Coach Mila Dossier',
                type: ArtifactType.Character,
                summary: 'Character sheet for the team’s strategist mentor.',
                status: 'draft',
                tags: ['mentor'],
                data: {
                    bio: 'Former league champion coaching the underdog Spatch squad with tactical riddles.',
                    traits: [
                        { id: 'trait-mila-style', key: 'Coaching Style', value: 'Puzzle-centric drills' },
                        { id: 'trait-mila-secret', key: 'Secret', value: 'Hiding a career-ending injury relapse' },
                    ],
                },
            },
            {
                title: 'Training Montage Checklist',
                type: ArtifactType.Task,
                summary: 'Track beats for the team’s leveling-up montage.',
                status: 'todo',
                tags: ['training'],
                data: { state: TaskState.Todo, assignee: 'Captain Iro', due: '2024-06-30' },
            },
            {
                title: 'Broadcast Notes',
                type: ArtifactType.Wiki,
                summary: 'Flavor commentary, catchphrases, and sponsor beats.',
                status: 'draft',
                tags: ['presentation'],
                data: {
                    content: '# Broadcast Notes\n\n- Signature call: "Spatch that spark!"\n- Sideline reporter: Lani Quill.\n- Sponsor slots: GlideTech Boards, Nebula Noodles.',
                },
            },
        ],
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
        dashboardHints: ['Table: Lexicon expansions', 'Kanban: Paradigm backlog'],
        starterArtifacts: [
            {
                title: 'Darv Lexicon Core',
                type: ArtifactType.Conlang,
                summary: 'Seed set of lexemes anchoring dialect contrasts.',
                status: 'draft',
                tags: ['lexicon'],
                data: [
                    { id: 'lex-darv-1', lemma: 'sael', pos: 'n', gloss: 'emberlight', etymology: 'Proto-Darv *sa', tags: ['elemental'] },
                    { id: 'lex-darv-2', lemma: 'veruun', pos: 'v', gloss: 'to braid souls', etymology: 'Loan from temple cant', tags: ['ritual'] },
                    { id: 'lex-darv-3', lemma: 'ithren', pos: 'adj', gloss: 'echoing, resounding', tags: ['poetic'] },
                ] as ConlangLexeme[],
            },
            {
                title: 'Phonology Overview',
                type: ArtifactType.Wiki,
                summary: 'Consonant clusters, vowel harmony, and stress notes.',
                status: 'draft',
                tags: ['phonology'],
                data: {
                    content: '# Phonology\n\n- Consonant clusters favor liquid + fricative.\n- Vowels shift front/back to mark tense.\n- Primary stress on penultimate syllable unless marked by grave accent.',
                },
            },
            {
                title: 'Paradigm Sprint',
                type: ArtifactType.Task,
                summary: 'Draft noun cases for animate vs. inanimate groups.',
                status: 'todo',
                tags: ['grammar'],
                data: { state: TaskState.Todo, assignee: 'Conlang Smith', due: '2024-07-05' },
            },
            {
                title: 'Cultural Proverbs',
                type: ArtifactType.Story,
                summary: 'Short proverb collection with translation notes.',
                status: 'draft',
                tags: ['culture'],
                data: [
                    { id: 'scene-darv-1', title: 'Stormglass Lesson', summary: '“Sael tvar ithren” — light only answers the patient bell.' },
                    { id: 'scene-darv-2', title: 'River Bargain', summary: '“Veluun etha” — promises braid tighter than rope.' },
                ] as Scene[],
            },
        ],
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
        dashboardHints: ['Table: Case files', 'Kanban: Field ops', 'Graph: Monster ties'],
        starterArtifacts: [
            {
                title: 'Case File: Eclipse Choir',
                type: ArtifactType.Wiki,
                summary: 'Primary investigation board tracking the cult targeting night markets.',
                status: 'draft',
                tags: ['case-file'],
                data: {
                    content: '# Case File: Eclipse Choir\n\n**Summary:** Choir siphons aura from market-goers to awaken a dormant archbishop.\n\n**Suspects:**\n- Maestro Veyl — charismatic conductor\n- Sister Lume — reliquary keeper\n\n**Open Leads:**\n1. Decode hymn cipher.\n2. Stakeout cathedral catacombs.',
                },
            },
            {
                title: 'Field Ops: Cathedral Sweep',
                type: ArtifactType.Task,
                summary: 'Coordinate strike teams before the eclipse ritual begins.',
                status: 'todo',
                tags: ['ops'],
                data: { state: TaskState.Todo, assignee: 'Night Brigade', due: '2024-05-30' },
            },
            {
                title: 'Monster Codex: Blood Scribes',
                type: ArtifactType.Character,
                summary: 'Profile of the vampiric historians bound to cathedral vaults.',
                status: 'draft',
                tags: ['bestiary'],
                data: {
                    bio: 'Blood Scribes transcribe living memories using sanguine ink, trading secrets for protection.',
                    traits: [
                        { id: 'trait-scribe-ink', key: 'Tell', value: 'Eyes glow ruby when recalling forbidden lore' },
                        { id: 'trait-scribe-weakness', key: 'Weakness', value: 'Cannot cross running water carrying ink' },
                    ],
                },
            },
            {
                title: 'Cathedral Vault Map',
                type: ArtifactType.Location,
                summary: 'Annotated layout of reliquary chambers and hidden escape shafts.',
                status: 'draft',
                tags: ['map'],
                data: {
                    description: 'Labyrinth of marble cloisters, reliquary pits, and shadow wells beneath the cathedral.',
                    features: [
                        { id: 'feature-vault-choir', name: 'Chorus Pit', description: 'Acoustic chamber where hymns amplify blood rites.' },
                        { id: 'feature-vault-escape', name: 'Echo Passage', description: 'Secret tunnel leading to the city aqueduct.' },
                    ],
                },
            },
        ],
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
    setArtifacts(currentArtifacts => currentArtifacts.map(art => {
        if (art.id === fromId) {
            const newRelation: Relation = { toId, kind };
            return { ...art, relations: [...art.relations, newRelation] };
        }
        return art;
    }));
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

    const data = createDefaultDataForType(type, title);

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

  const handleApplyTemplateKit = useCallback((category: TemplateCategory) => {
    if (!selectedProjectId || !profile) {
      return {
        createdCount: 0,
        skippedCount: category.starterArtifacts.length,
        message: 'Select a project to apply a template kit.',
      };
    }

    const existingTitles = new Map<string, string>();
    projectArtifacts.forEach((artifact) => {
      existingTitles.set(artifact.title.toLowerCase(), artifact.id);
    });

    const timestamp = Date.now();
    let created = 0;
    const newArtifacts: Artifact[] = [];

    category.starterArtifacts.forEach((seed, index) => {
      const normalizedTitle = seed.title.toLowerCase();
      if (existingTitles.has(normalizedTitle)) {
        return;
      }

      const artifactData = composeSeedData(seed);
      const artifactId = `art-${timestamp}-${index}`;
      const artifact: Artifact = {
        id: artifactId,
        ownerId: profile.uid,
        projectId: selectedProjectId,
        type: seed.type,
        title: seed.title,
        summary: seed.summary,
        status: seed.status ?? 'idea',
        tags: seed.tags ?? [],
        relations: [],
        data: artifactData,
      };

      newArtifacts.push(artifact);
      existingTitles.set(normalizedTitle, artifactId);
      created += 1;
    });

    if (newArtifacts.length > 0) {
      setArtifacts((prev) => [...prev, ...newArtifacts]);
      addXp(newArtifacts.length * 4);
      setSelectedArtifactId(newArtifacts[0].id);
      const kitTag = `kit:${category.id}`;
      setProjects((prev) => prev.map((project) => {
        if (project.id !== selectedProjectId) return project;
        return project.tags.includes(kitTag)
          ? project
          : { ...project, tags: [...project.tags, kitTag] };
      }));
    }

    const skipped = category.starterArtifacts.length - created;
    const messageParts: string[] = [];
    if (created > 0) {
      messageParts.push(`Added ${created} starter artifact${created === 1 ? '' : 's'}.`);
    }
    if (skipped > 0) {
      messageParts.push(`${skipped} already existed in this project.`);
    }
    if (messageParts.length === 0) {
      messageParts.push('All kit artifacts already exist in this project.');
    }

    return {
      createdCount: created,
      skippedCount: skipped,
      message: messageParts.join(' '),
    };
  }, [selectedProjectId, profile, projectArtifacts, setArtifacts, addXp, setSelectedArtifactId, setProjects]);

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
  }, [setArtifacts]);

  const handlePublish = () => {
    if (selectedProject && projectArtifacts.length > 0) {
        exportProjectAsStaticSite(selectedProject, projectArtifacts);
        addXp(25); // XP Source: publish (+25)
    } else {
        alert('Please select a project with artifacts to publish.');
    }
  };

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectArtifacts = useMemo(() => artifacts.filter(a => a.projectId === selectedProjectId), [artifacts, selectedProjectId]);
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);
  const availableStatuses = useMemo(() => Array.from(new Set(projectArtifacts.map(artifact => artifact.status))).sort(), [projectArtifacts]);

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
      <Header profile={profile} xpProgress={xpProgress} level={level} onSignOut={signOutUser} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8">
        <aside className="lg:col-span-3 space-y-6">
          {isViewingOwnWorkspace && (
            <UserProfileCard profile={profile} onUpdateProfile={handleProfileUpdate} />
          )}
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
              <ProjectOverview
                  project={selectedProject}
                  onUpdateProject={handleUpdateProject}
              />
              <ProjectInsights artifacts={projectArtifacts} />
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
                        <button onClick={() => exportArtifactsToCSV(projectArtifacts, selectedProject.title)} title="Export to CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => exportArtifactsToTSV(projectArtifacts, selectedProject.title)} title="Export to TSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
                <TemplateGallery
                    categories={templateLibrary}
                    activeProjectTitle={selectedProject.title}
                    onApplyTemplate={handleApplyTemplateKit}
                    canApply={Boolean(selectedProjectId)}
                />
                <ReleaseNotesGenerator
                    projectTitle={selectedProject.title}
                    artifacts={projectArtifacts}
                    addXp={addXp}
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
