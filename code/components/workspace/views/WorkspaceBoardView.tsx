import React, { useCallback, useEffect, useState } from 'react';

import CharacterArcTracker from '../../CharacterArcTracker';
import FamilyTreeTools from '../../FamilyTreeTools';
import MemorySyncPanel from '../../MemorySyncPanel';
import MilestoneTracker from '../../MilestoneTracker';
import NarrativePipelineBoard from '../../NarrativePipelineBoard';
import OpenTasksPanel from '../../OpenTasksPanel';
import { ArtifactType, type Artifact, type MemorySyncConversation, type MemorySyncScope, type MemorySyncStatus, type NpcMemoryRun, type Project, type ProjectVisibilitySettings } from '../../../types';
import type { WorkspaceFeatureGroup } from '../types';
import type { MilestoneProgressOverview } from '../../../utils/milestoneProgress';
import type { CharacterArcEvaluation } from '../../../utils/characterProgression';

interface WorkspaceBoardViewProps {
  featureGroup: WorkspaceFeatureGroup;
  visibilitySettings: ProjectVisibilitySettings;
  project: Project;
  projectArtifacts: Artifact[];
  projectConversations: MemorySyncConversation[];
  projectNpcRuns: NpcMemoryRun[];
  onMemoryStatusChange: (conversationId: string, suggestionId: string, status: MemorySyncStatus) => void;
  onSelectArtifact: (artifactId: string | null) => void;
  onOpenCreateArtifactModal: (options?: { defaultType?: ArtifactType | null; sourceId?: string | null }) => void;
  milestoneProgress: MilestoneProgressOverview[];
  upcomingMilestoneOverview: MilestoneProgressOverview | null;
  characterProgressionMap: Map<string, CharacterArcEvaluation>;
}

const WorkspaceBoardView: React.FC<WorkspaceBoardViewProps> = ({
  featureGroup,
  visibilitySettings,
  project,
  projectArtifacts,
  projectConversations,
  projectNpcRuns,
  onMemoryStatusChange,
  onSelectArtifact,
  onOpenCreateArtifactModal,
  milestoneProgress,
  upcomingMilestoneOverview,
  characterProgressionMap,
}) => {
  const [memoryScope, setMemoryScope] = useState<MemorySyncScope | 'all'>('all');

  useEffect(() => {
    setMemoryScope('all');
  }, [project.id]);

  const handleMemoryScopeChange = useCallback((scope: MemorySyncScope | 'all') => {
    setMemoryScope(scope);
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-100">{featureGroup.title}</h2>
        <p className="text-sm text-slate-400">{featureGroup.description}</p>
      </header>

      <div className="space-y-6">
        {visibilitySettings.memorySync ? (
          <MemorySyncPanel
            conversations={projectConversations}
            npcRuns={projectNpcRuns}
            scopeFilter={memoryScope}
            onScopeChange={handleMemoryScopeChange}
            onStatusChange={onMemoryStatusChange}
          />
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
            characterProgressionMap={characterProgressionMap}
          />
        ) : null}
        {visibilitySettings.characterArcTracker ? <CharacterArcTracker artifacts={projectArtifacts} /> : null}
        {visibilitySettings.milestoneTracker ? (
          <div className="space-y-4">
            {upcomingMilestoneOverview ? (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-lg shadow-amber-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Next milestone</p>
                <p className="text-base font-semibold text-amber-50">{upcomingMilestoneOverview.milestone.title}</p>
                <p className="text-xs text-amber-200/80">{upcomingMilestoneOverview.milestone.focus}</p>
                <p className="text-xs text-amber-200/60">{Math.round(upcomingMilestoneOverview.completion * 100)}% complete</p>
              </div>
            ) : null}
            <MilestoneTracker items={milestoneProgress} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default WorkspaceBoardView;
