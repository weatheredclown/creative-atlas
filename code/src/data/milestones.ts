import type { Milestone } from '../../types';

export const milestoneRoadmap: Milestone[] = [

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
