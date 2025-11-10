import React, { useMemo } from 'react';
import { Artifact, ArtifactType, ConlangLexeme, TaskData, TASK_STATE, type TaskState } from '../types';
import { CubeIcon, ShareIcon, CheckCircleIcon, SparklesIcon } from './Icons';
import { formatStatusLabel } from '../utils/status';

interface ProjectInsightsProps {
  artifacts: Artifact[];
}

const ProjectInsights: React.FC<ProjectInsightsProps> = ({ artifacts }) => {
  const insights = useMemo(() => {
    const totalArtifacts = artifacts.length;
    const linkedArtifacts = artifacts.filter((artifact) => artifact.relations.length > 0).length;
    const relationCoverage = totalArtifacts === 0 ? 0 : Math.round((linkedArtifacts / totalArtifacts) * 100);

    const tasks = artifacts.filter((artifact) => artifact.type === ArtifactType.Task);
    const taskStates = tasks.reduce(
      (acc, task) => {
        const data = task.data as TaskData;
        if (data?.state) {
          acc[data.state] = (acc[data.state] || 0) + 1;
        }
        return acc;
      },
      {} as Record<TaskState, number>
    );
    const tasksComplete = taskStates[TASK_STATE.Done] ?? 0;
    const taskCompletionRate = tasks.length === 0 ? 0 : Math.round((tasksComplete / tasks.length) * 100);

    const conlangLexemeCount = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Conlang)
      .reduce((count, artifact) => count + ((artifact.data as ConlangLexeme[])?.length ?? 0), 0);

    const statusCounts = artifacts.reduce<Record<string, number>>((acc, artifact) => {
      const key = artifact.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const typeCounts = artifacts.reduce<Record<string, number>>((acc, artifact) => {
      acc[artifact.type] = (acc[artifact.type] ?? 0) + 1;
      return acc;
    }, {});

    const topTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    return {
      totalArtifacts,
      linkedArtifacts,
      relationCoverage,
      tasks,
      taskStates,
      taskCompletionRate,
      conlangLexemeCount,
      statusCounts,
      topTypes,
    };
  }, [artifacts]);

  const doneCount = insights.taskStates[TASK_STATE.Done] ?? 0;
  const inProgressCount = insights.taskStates[TASK_STATE.InProgress] ?? 0;
  const todoCount = insights.taskStates[TASK_STATE.Todo] ?? 0;

  if (insights.totalArtifacts === 0) {
    return (
      <div className="bg-slate-900/40 border border-dashed border-slate-700/60 rounded-lg p-6 text-slate-400">
        Seed your first artifact to see project insights.
      </div>
    );
  }

  return (
    <div
      id="project-insights-panel"
      className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Total Seeds</span>
            <CubeIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">{insights.totalArtifacts}</div>
          <p className="text-xs text-slate-500 mt-2">Artifacts captured across your universe.</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Linked Artifacts</span>
            <ShareIcon className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">{insights.linkedArtifacts}</div>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${insights.relationCoverage}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{insights.relationCoverage}% linked artifact ratio.</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Questboard Tasks</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">{insights.tasks.length}</div>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${insights.taskCompletionRate}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {insights.taskCompletionRate}% completion ({doneCount} done, {inProgressCount} in progress, {todoCount} queued).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Lexicon Depth</span>
            <SparklesIcon className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">{insights.conlangLexemeCount}</div>
          <p className="text-xs text-slate-500 mt-2">Words crafted across all conlangs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Stage Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(insights.statusCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm text-slate-300">
                  <span>{formatStatusLabel(status)}</span>
                  <span className="text-slate-400">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Artifact Mix</h4>
          <div className="space-y-2">
            {insights.topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm text-slate-300">
                <span>{type}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
            {insights.topTypes.length === 0 && <p className="text-sm text-slate-500">No artifacts yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInsights;
