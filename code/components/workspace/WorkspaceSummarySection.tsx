import React from 'react';

import WorkspaceArtifactPanel from './WorkspaceArtifactPanel';
import WorkspaceHeroSection from './WorkspaceHeroSection';
import type { WorkspaceFeatureGroup } from './types';

export type WorkspaceHeroSectionProps = React.ComponentProps<typeof WorkspaceHeroSection>;
export type WorkspaceArtifactPanelProps = React.ComponentProps<typeof WorkspaceArtifactPanel>;

type WorkspaceArtifactPanelWithoutFeatureGroup = Omit<WorkspaceArtifactPanelProps, 'featureGroup'>;

interface WorkspaceSummarySectionProps {
  featureGroup: WorkspaceFeatureGroup;
  heroSectionProps: WorkspaceHeroSectionProps;
  artifactPanelProps: WorkspaceArtifactPanelWithoutFeatureGroup;
}

const WorkspaceSummarySection: React.FC<WorkspaceSummarySectionProps> = ({
  featureGroup,
  heroSectionProps,
  artifactPanelProps,
}) => (
  <section className="space-y-6">
    <header className="space-y-1">
      <h2 className="text-xl font-semibold text-slate-100">{featureGroup.title}</h2>
      <p className="text-sm text-slate-400">{featureGroup.description}</p>
    </header>
    <div className="space-y-6">
      <WorkspaceHeroSection {...heroSectionProps} />
      <WorkspaceArtifactPanel featureGroup={featureGroup} {...artifactPanelProps} />
    </div>
  </section>
);

export default WorkspaceSummarySection;
