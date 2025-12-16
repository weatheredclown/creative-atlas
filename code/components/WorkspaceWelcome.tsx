import React from 'react';

import { BookOpenIcon, CubeIcon, PlusIcon, SparklesIcon } from './Icons';

interface WorkspaceWelcomeProps {
  totalProjects: number;
  totalArtifacts: number;
  onCreateProject: () => void;
  onFocusProjectSearch: () => void;
  onStartTutorial: () => void;
}

const WorkspaceWelcome: React.FC<WorkspaceWelcomeProps> = ({
  totalProjects,
  totalArtifacts,
  onCreateProject,
  onFocusProjectSearch,
  onStartTutorial,
}) => (
  <div className="flex h-full items-center justify-center">
    <div className="w-full max-w-5xl space-y-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
            <CubeIcon className="h-4 w-4" />
            Workspace ready
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Welcome to your Creative Atlas</h2>
            <p className="max-w-2xl text-sm text-slate-300">
              Pick a world to dive into or spin up a new one. Use these quick actions to jump back into writing without hunting
              for the right screen.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 shadow-inner shadow-slate-950/30">
            <p className="text-xs uppercase tracking-wide text-slate-400">Projects</p>
            <p className="text-2xl font-semibold text-cyan-100">{totalProjects}</p>
            <p className="text-xs text-slate-400">Curate focused collections with status filters.</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 shadow-inner shadow-slate-950/30">
            <p className="text-xs uppercase tracking-wide text-slate-400">Artifacts</p>
            <p className="text-2xl font-semibold text-indigo-100">{totalArtifacts}</p>
            <p className="text-xs text-slate-400">Everything from characters to scenes stays linked.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCreateProject}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <PlusIcon className="h-4 w-4" />
          Start a new world
        </button>
        <button
          type="button"
          onClick={onFocusProjectSearch}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <BookOpenIcon className="h-4 w-4 text-cyan-200" />
          Find an existing project
        </button>
        <button
          type="button"
          onClick={onStartTutorial}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/60 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-400/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <SparklesIcon className="h-4 w-4" />
          Revisit the workspace tour
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="mt-0.5 rounded-lg bg-cyan-500/15 p-2 text-cyan-200">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p className="font-semibold text-white">Jump to filters quickly</p>
            <p className="text-slate-400">Search by name, tags, or summary to reopen a world instantly.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="mt-0.5 rounded-lg bg-indigo-500/15 p-2 text-indigo-200">
            <BookOpenIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p className="font-semibold text-white">Keep context visible</p>
            <p className="text-slate-400">Use collections for characters, chapters, and locations to orient yourself.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="mt-0.5 rounded-lg bg-emerald-500/15 p-2 text-emerald-200">
            <CubeIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p className="font-semibold text-white">Stay in flow</p>
            <p className="text-slate-400">Use Zen Mode to hide the sidebar when drafting once a project is open.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default WorkspaceWelcome;
