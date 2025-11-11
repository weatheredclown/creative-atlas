import React from 'react';

import ProjectHero from '../ProjectHero';
import ProjectOverview from '../ProjectOverview';
import ProjectSharePanel from '../ProjectSharePanel';
import QuickFactsPanel from '../QuickFactsPanel';
import {
  type Artifact,
  type Project,
  type ProjectComponentKey,
  type ProjectVisibilitySettings,
} from '../../types';

interface WorkspaceHeroSectionProps {
  project: Project;
  projectHeroStats: React.ComponentProps<typeof ProjectHero>['stats'] | null;
  quickFactPreview: Artifact[];
  totalQuickFacts: number;
  level: number;
  xpProgress: number;
  statusLabel: string;
  showProjectHero: boolean;
  showProjectOverview: boolean;
  showQuickFactsPanel: boolean;
  visibilitySettings: ProjectVisibilitySettings;
  onOpenCreateArtifactModal: () => void;
  onOpenQuickFactModal: () => void;
  onPublishProject: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  onToggleVisibility: (component: ProjectComponentKey, isVisible: boolean) => void;
  onResetVisibility: () => void;
}

const WorkspaceHeroSection: React.FC<WorkspaceHeroSectionProps> = ({
  project,
  projectHeroStats,
  quickFactPreview,
  totalQuickFacts,
  level,
  xpProgress,
  statusLabel,
  showProjectHero,
  showProjectOverview,
  showQuickFactsPanel,
  visibilitySettings,
  onOpenCreateArtifactModal,
  onOpenQuickFactModal,
  onPublishProject,
  onSelectArtifact,
  onUpdateProject,
  onDeleteProject,
  onToggleVisibility,
  onResetVisibility,
}) => (
  <div className="space-y-6">
    {showProjectHero && projectHeroStats ? (
      <ProjectHero
        project={project}
        stats={projectHeroStats}
        quickFacts={quickFactPreview}
        totalQuickFacts={totalQuickFacts}
        statusLabel={statusLabel}
        onCreateArtifact={onOpenCreateArtifactModal}
        onCaptureQuickFact={onOpenQuickFactModal}
        onPublishProject={onPublishProject}
        onSelectQuickFact={(artifactId) => onSelectArtifact(artifactId)}
        level={level}
        xpProgress={xpProgress}
      />
    ) : null}
    <ProjectSharePanel project={project} />
    {showProjectOverview ? (
      <ProjectOverview
        project={project}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
        visibilitySettings={visibilitySettings}
        onToggleVisibility={onToggleVisibility}
        onResetVisibility={onResetVisibility}
      />
    ) : null}
    {showQuickFactsPanel ? (
      <QuickFactsPanel
        facts={quickFactPreview}
        totalFacts={totalQuickFacts}
        projectTitle={project.title}
        onSelectFact={(artifactId) => onSelectArtifact(artifactId)}
        onAddFact={onOpenQuickFactModal}
      />
    ) : null}
  </div>
);

export default WorkspaceHeroSection;
