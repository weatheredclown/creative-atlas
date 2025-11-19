import React, { useMemo, useState } from 'react';

import AICopilotPanel from '../../AICopilotPanel';
import ContinuityMonitor from '../../ContinuityMonitor';
import InspirationDeck from '../../InspirationDeck';
import NarrativeHealthPanel from '../../NarrativeHealthPanel';
import ProjectInsights from '../../ProjectInsights';
import WorldSimulationPanel from '../../WorldSimulationPanel';
import { IntelligenceLogo } from '../../Icons';
import {
  type Artifact,
  type InspirationCard,
  type NpcMemoryRun,
  type Project,
  type ProjectVisibilitySettings,
} from '../../../types';
import { aiAssistants } from '../../../src/data/aiAssistants';
import type { WorkspaceFeatureGroup } from '../types';

interface ToolTab {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

interface WorkspaceLaboratoryViewProps {
  featureGroup: WorkspaceFeatureGroup;
  visibilitySettings: ProjectVisibilitySettings;
  project: Project;
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  projectNpcRuns: NpcMemoryRun[];
  onSelectArtifact: (artifactId: string | null) => void;
  onCaptureInspirationCard: (card: InspirationCard) => Promise<void> | void;
}

const featuredAssistant = aiAssistants[0];

const WorkspaceLaboratoryView: React.FC<WorkspaceLaboratoryViewProps> = ({
  featureGroup,
  visibilitySettings,
  project,
  projectArtifacts,
  allArtifacts,
  projectNpcRuns,
  onSelectArtifact,
  onCaptureInspirationCard,
}) => {
  const toolTabs = useMemo<ToolTab[]>(() => {
    const tabs: ToolTab[] = [];

    if (visibilitySettings.narrativeHealth) {
      tabs.push({
        id: 'narrative-health',
        label: 'Narrative Need Heatmap',
        render: () => <NarrativeHealthPanel artifacts={projectArtifacts} />,
      });
    }

    if (visibilitySettings.continuityMonitor) {
      tabs.push({
        id: 'continuity-monitor',
        label: 'Continuity Monitor',
        render: () => <ContinuityMonitor artifacts={projectArtifacts} />,
      });
    }

    if (visibilitySettings.worldSimulation) {
      tabs.push({
        id: 'world-simulation',
        label: 'Temporal gravity',
        render: () => (
          <WorldSimulationPanel
            artifacts={projectArtifacts}
            allArtifacts={allArtifacts}
            projectTitle={project.title}
            npcMemoryRuns={projectNpcRuns}
            onSelectArtifact={(artifactId) => onSelectArtifact(artifactId)}
          />
        ),
      });
    }

    return tabs;
  }, [
    visibilitySettings.narrativeHealth,
    visibilitySettings.continuityMonitor,
    visibilitySettings.worldSimulation,
    projectArtifacts,
    allArtifacts,
    project.title,
    projectNpcRuns,
    onSelectArtifact,
  ]);

  const [activeToolTab, setActiveToolTab] = useState<string | null>(null);

  const currentTabId =
    activeToolTab && toolTabs.some((tab) => tab.id === activeToolTab)
      ? activeToolTab
      : toolTabs[0]?.id ?? null;

  const activeTab = toolTabs.find((tab) => tab.id === currentTabId) ?? null;

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-100">{featureGroup.title}</h2>
        <p className="text-sm text-slate-400">{featureGroup.description}</p>
      </header>

      <div className="space-y-6">
        {visibilitySettings.projectInsights ? <ProjectInsights artifacts={projectArtifacts} /> : null}
        {visibilitySettings.aiCopilot ? (
          <div className="space-y-4">
            {featuredAssistant ? (
              <div className="rounded-2xl border border-pink-500/40 bg-pink-500/10 p-4 text-sm text-pink-100 shadow-lg shadow-pink-900/10">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pink-200">
                  <IntelligenceLogo className="h-4 w-4" />
                  Atlas Intelligence spotlight
                </p>
                <p className="text-base font-semibold text-pink-50">{featuredAssistant.name}</p>
                <p className="text-xs text-pink-100/80">{featuredAssistant.focus}</p>
              </div>
            ) : null}
            <AICopilotPanel assistants={aiAssistants} />
          </div>
        ) : null}
        {toolTabs.length > 0 ? (
          <div className="space-y-4">
            {toolTabs.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                {toolTabs.map((tab) => {
                  const isActive = tab.id === currentTabId;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveToolTab(tab.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 shadow-inner shadow-emerald-500/10'
                          : 'border-slate-700/60 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {activeTab ? <div className="space-y-6">{activeTab.render()}</div> : null}
          </div>
        ) : null}
        {visibilitySettings.inspirationDeck ? (
          <InspirationDeck onCaptureCard={onCaptureInspirationCard} isCaptureDisabled={false} />
        ) : null}
      </div>
    </section>
  );
};

export default WorkspaceLaboratoryView;
