import React from 'react';

import AICopilotPanel from '../AICopilotPanel';
import CharacterArcTracker from '../CharacterArcTracker';
import ContinuityMonitor from '../ContinuityMonitor';
import FamilyTreeTools from '../FamilyTreeTools';
import GitHubImportPanel from '../GitHubImportPanel';
import InspirationDeck from '../InspirationDeck';
import MemorySyncPanel from '../MemorySyncPanel';
import MilestoneTracker from '../MilestoneTracker';
import NarrativeHealthPanel from '../NarrativeHealthPanel';
import NarrativePipelineBoard from '../NarrativePipelineBoard';
import OpenTasksPanel from '../OpenTasksPanel';
import ProjectInsights from '../ProjectInsights';
import PublishingPanel from '../PublishingPanel';
import ReleaseNotesGenerator from '../ReleaseNotesGenerator';
import TemplateWorkspace from '../TemplateWorkspace';
import WorldSimulationPanel from '../WorldSimulationPanel';
import { ArrowUpTrayIcon, IntelligenceLogo, SparklesIcon } from '../Icons';
import {
  type Artifact,
  ArtifactType,
  type InspirationCard,
  type MemorySyncConversation,
  type MemorySyncStatus,
  type Project,
  type ProjectActivity,
  type ProjectVisibilitySettings,
  type ProjectTemplate,
  type TemplateEntry,
  type UserProfile,
} from '../../types';
import { projectTemplates, templateLibrary } from '../../src/data/templates';
import { aiAssistants } from '../../src/data/aiAssistants';
import type { MilestoneProgressOverview } from '../../utils/milestoneProgress';
import type { ProjectPublishRecord } from '../../utils/publishHistory';

interface FeatureGroupMetadata {
  title: string;
  description: string;
}

interface WorkspaceActivityPanelProps {
  analyticsGroup: FeatureGroupMetadata;
  trackingGroup: FeatureGroupMetadata;
  distributionGroup: FeatureGroupMetadata;
  visibilitySettings: ProjectVisibilitySettings;
  project: Project;
  profile: UserProfile;
  projectArtifacts: Artifact[];
  allArtifacts: Artifact[];
  projectConversations: MemorySyncConversation[];
  onMemoryStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
  onCaptureInspirationCard: (card: InspirationCard) => Promise<void> | void;
  onSelectArtifact: (artifactId: string | null) => void;
  onOpenCreateArtifactModal: (options?: { defaultType?: ArtifactType | null; sourceId?: string | null }) => void;
  markProjectActivity: (updates: Partial<ProjectActivity>) => void;
  milestoneProgress: MilestoneProgressOverview[];
  upcomingMilestoneOverview: MilestoneProgressOverview | null;
  addXp: (xp: number) => Promise<void> | void;
  publishHistoryRecord: ProjectPublishRecord | null;
  lastPublishedAtLabel: string | null;
  canPublishToGitHub: boolean;
  onPublishProject: () => void;
  onStartGitHubPublish: () => Promise<void>;
  onGitHubArtifactsImported: (artifacts: Artifact[]) => Promise<void> | void;
  onApplyProjectTemplate: (template: ProjectTemplate) => Promise<void> | void;
  onSelectTemplate: (template: TemplateEntry) => Promise<void> | void;
}

const featuredAssistant = aiAssistants[0];

const WorkspaceActivityPanel: React.FC<WorkspaceActivityPanelProps> = ({
  analyticsGroup,
  trackingGroup,
  distributionGroup,
  visibilitySettings,
  project,
  profile,
  projectArtifacts,
  allArtifacts,
  projectConversations,
  onMemoryStatusChange,
  onCaptureInspirationCard,
  onSelectArtifact,
  onOpenCreateArtifactModal,
  markProjectActivity,
  milestoneProgress,
  upcomingMilestoneOverview,
  addXp,
  publishHistoryRecord,
  lastPublishedAtLabel,
  canPublishToGitHub,
  onPublishProject,
  onStartGitHubPublish,
  onGitHubArtifactsImported,
  onApplyProjectTemplate,
  onSelectTemplate,
}) => (
  <>
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{analyticsGroup.title}</h2>
        <p className="text-sm text-slate-400">{analyticsGroup.description}</p>
      </div>
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
        {(visibilitySettings.narrativeHealth || visibilitySettings.continuityMonitor || visibilitySettings.worldSimulation) ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {visibilitySettings.narrativeHealth ? <NarrativeHealthPanel artifacts={projectArtifacts} /> : null}
            {visibilitySettings.continuityMonitor ? <ContinuityMonitor artifacts={projectArtifacts} /> : null}
            {visibilitySettings.worldSimulation ? (
              <WorldSimulationPanel
                artifacts={projectArtifacts}
                allArtifacts={allArtifacts}
                projectTitle={project.title}
                onSelectArtifact={onSelectArtifact}
              />
            ) : null}
          </div>
        ) : null}
        {visibilitySettings.inspirationDeck ? (
          <InspirationDeck onCaptureCard={onCaptureInspirationCard} isCaptureDisabled={false} />
        ) : null}
      </div>
    </section>

    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{trackingGroup.title}</h2>
        <p className="text-sm text-slate-400">{trackingGroup.description}</p>
      </div>
      <div className="space-y-6">
        {visibilitySettings.memorySync ? (
          <MemorySyncPanel conversations={projectConversations} onStatusChange={onMemoryStatusChange} />
        ) : null}
        {visibilitySettings.openTasks ? (
          <OpenTasksPanel
            artifacts={projectArtifacts}
            projectTitle={project.title}
            onSelectTask={(taskId) => onSelectArtifact(taskId)}
          />
        ) : null}
        {visibilitySettings.narrativePipeline ? <NarrativePipelineBoard artifacts={projectArtifacts} /> : null}
        {visibilitySettings.familyTreeTools ? (
          <FamilyTreeTools
            artifacts={projectArtifacts}
            onSelectCharacter={onSelectArtifact}
            onCreateCharacter={() => onOpenCreateArtifactModal({ defaultType: ArtifactType.Character })}
          />
        ) : null}
        {visibilitySettings.characterArcTracker ? <CharacterArcTracker artifacts={projectArtifacts} /> : null}
        {visibilitySettings.milestoneTracker ? (
          <>
            {upcomingMilestoneOverview ? (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-lg shadow-amber-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Next milestone</p>
                <p className="text-base font-semibold text-amber-50">{upcomingMilestoneOverview.milestone.title}</p>
                <p className="text-xs text-amber-200/80">{upcomingMilestoneOverview.milestone.focus}</p>
                <p className="text-xs text-amber-200/60">{Math.round(upcomingMilestoneOverview.completion * 100)}% complete</p>
              </div>
            ) : null}
            <MilestoneTracker items={milestoneProgress} />
          </>
        ) : null}
      </div>
    </section>

    <section id="distribution" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-100">{distributionGroup.title}</h2>
        <p className="text-sm text-slate-400">{distributionGroup.description}</p>
      </div>
      <div className="space-y-10">
        {visibilitySettings.templates ? (
          <TemplateWorkspace
            projectTitle={project.title}
            projectTemplates={projectTemplates}
            templateCategories={templateLibrary}
            onApplyTemplate={onApplyProjectTemplate}
            onSelectTemplate={onSelectTemplate}
          />
        ) : null}
        {(visibilitySettings.releaseWorkflows || visibilitySettings.githubImport) ? (
          <div
            className={`grid gap-6 ${
              visibilitySettings.releaseWorkflows ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'xl:grid-cols-1'
            }`}
          >
            <div className="space-y-6">
              {visibilitySettings.releaseWorkflows ? (
                <section
                  id="release-bard"
                  className="space-y-6 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20"
                >
                  <header className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300/80">
                      <SparklesIcon className="h-4 w-4 text-amber-300" />
                      Release Bard highlights
                    </div>
                    <p className="text-sm text-slate-400">
                      Spin up narrative release notes, then hand them off to the publishing panel so every release is ready for prime time.
                    </p>
                  </header>
                  <ReleaseNotesGenerator
                    projectId={project.id}
                    projectTitle={project.title}
                    artifacts={projectArtifacts}
                    addXp={addXp}
                    onDraftGenerated={() => markProjectActivity({ generatedReleaseNotes: true })}
                  />
                </section>
              ) : null}
              {visibilitySettings.githubImport ? (
                <section
                  id="import-export"
                  className="space-y-4 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/20"
                >
                  <header className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      Import from GitHub
                    </div>
                    <p className="text-sm text-slate-400">
                      Bring in README files, quests, or lore straight from your repository to seed new artifacts without losing context.
                    </p>
                  </header>
                  <GitHubImportPanel
                    projectId={project.id}
                    ownerId={profile.uid}
                    existingArtifacts={projectArtifacts}
                    onArtifactsImported={onGitHubArtifactsImported}
                    addXp={addXp}
                  />
                </section>
              ) : null}
            </div>
            {visibilitySettings.releaseWorkflows ? (
              <PublishingPanel
                publishHistoryRecord={publishHistoryRecord}
                lastPublishedAtLabel={lastPublishedAtLabel}
                canPublishToGitHub={canPublishToGitHub}
                onPublishProject={onPublishProject}
                onStartGitHubPublish={onStartGitHubPublish}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  </>
);

export default WorkspaceActivityPanel;
