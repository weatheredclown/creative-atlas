import React from 'react';

import GitHubImportPanel from '../../GitHubImportPanel';
import PublishingPanel from '../../PublishingPanel';
import ReleaseNotesGenerator from '../../ReleaseNotesGenerator';
import TemplateWorkspace from '../../TemplateWorkspace';
import { ArrowUpTrayIcon, SparklesIcon } from '../../Icons';
import {
  type Artifact,
  type Project,
  type ProjectTemplate,
  type ProjectVisibilitySettings,
  type TemplateEntry,
  type UserProfile,
} from '../../../types';
import { projectTemplates, templateLibrary } from '../../../src/data/templates';
import type { WorkspaceFeatureGroup } from '../types';
import type { ProjectPublishRecord } from '../../../utils/publishHistory';
import type { ProjectActivity } from '../../../utils/milestoneProgress';

interface WorkspaceStudioViewProps {
  featureGroup: WorkspaceFeatureGroup;
  visibilitySettings: ProjectVisibilitySettings;
  project: Project;
  profile: UserProfile;
  projectArtifacts: Artifact[];
  addXp: (xp: number) => Promise<void> | void;
  publishHistoryRecord: ProjectPublishRecord | null;
  lastPublishedAtLabel: string | null;
  canPublishToGitHub: boolean;
  onPublishProject: () => void;
  onStartGitHubPublish: () => Promise<void>;
  onGitHubArtifactsImported: (artifacts: Artifact[]) => Promise<void> | void;
  onApplyProjectTemplate: (template: ProjectTemplate) => Promise<void> | void;
  onSelectTemplate: (template: TemplateEntry) => Promise<void> | void;
  markProjectActivity: (updates: Partial<ProjectActivity>) => void;
}

const WorkspaceStudioView: React.FC<WorkspaceStudioViewProps> = ({
  featureGroup,
  visibilitySettings,
  project,
  profile,
  projectArtifacts,
  addXp,
  publishHistoryRecord,
  lastPublishedAtLabel,
  canPublishToGitHub,
  onPublishProject,
  onStartGitHubPublish,
  onGitHubArtifactsImported,
  onApplyProjectTemplate,
  onSelectTemplate,
  markProjectActivity,
}) => {
  const showTemplateSection = visibilitySettings.templates;
  const showPublishingSection = visibilitySettings.releaseWorkflows || visibilitySettings.githubImport;

  if (!showTemplateSection && !showPublishingSection) {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-100">{featureGroup.title}</h2>
        <p className="text-sm text-slate-400">{featureGroup.description}</p>
      </header>

      <div className="space-y-10">
        {showTemplateSection ? (
          <section id="workspace-templates" className="space-y-6">
            <TemplateWorkspace
              projectTitle={project.title}
              projectTemplates={projectTemplates}
              templateCategories={templateLibrary}
              onApplyTemplate={onApplyProjectTemplate}
              onSelectTemplate={onSelectTemplate}
            />
          </section>
        ) : null}

        {showPublishingSection ? (
          <section id="workspace-publishing" className="space-y-6">
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
                        Bring in README files, quests, or lore straight from your repository to create new artifacts without losing context.
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
          </section>
        ) : null}
      </div>
    </section>
  );
};

export default WorkspaceStudioView;
