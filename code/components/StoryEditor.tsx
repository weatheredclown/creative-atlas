
import React, { useMemo, useState } from 'react';
import { Artifact, ArtifactType, Scene, NARRATIVE_ARTIFACT_TYPES } from '../types';
import { PlusIcon, XMarkIcon } from './Icons';
import EditorRelationSidebar from './EditorRelationSidebar';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';
import { normalizeNarrativeScenes } from '../utils/narrativeScenes';

const CAST_TARGET_TYPES: ArtifactType[] = [ArtifactType.Character, ArtifactType.Faction];
const STORY_SUPPORT_TYPES: ArtifactType[] = [
  ArtifactType.Location,
  ArtifactType.Conlang,
  ArtifactType.MagicSystem,
  ArtifactType.Wiki,
];
const STORY_SOURCE_TYPES: ArtifactType[] = [
  ...NARRATIVE_ARTIFACT_TYPES,
  ArtifactType.Wiki,
  ArtifactType.Game,
  ArtifactType.Repository,
];

interface StoryEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: Scene[]) => void;
  projectArtifacts: Artifact[];
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

const StoryEditor: React.FC<StoryEditorProps> = ({
  artifact,
  onUpdateArtifactData,
  projectArtifacts,
  onAddRelation,
  onRemoveRelation,
}) => {
  const scenes = useMemo<Scene[]>(
    () => normalizeNarrativeScenes(artifact.data),
    [artifact.data],
  );
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneSummary, setNewSceneSummary] = useState('');
  const { showDetailedFields } = useDepthPreferences();

  const handleAddScene = () => {
    if (!newSceneTitle.trim()) return;
    const newScene: Scene = {
      id: `scn-${Date.now()}`,
      title: newSceneTitle,
      summary: newSceneSummary,
    };
    onUpdateArtifactData(artifact.id, [...scenes, newScene]);
    setNewSceneTitle('');
    setNewSceneSummary('');
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = scenes.filter(s => s.id !== sceneId);
    onUpdateArtifactData(artifact.id, updatedScenes);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-teal-400 mb-6">
        Narrative Workbench ({artifact.type}): {artifact.title}
      </h3>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scenes.map(scene => (
              <div key={scene.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/80 relative group">
                {showDetailedFields && (
                  <button
                    onClick={() => handleDeleteScene(scene.id)}
                    className="absolute top-2 right-2 p-1 bg-slate-800/50 rounded-full text-slate-400 hover:bg-red-500/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete scene"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
                <h4 className="font-bold text-slate-200 mb-1">{scene.title}</h4>
                <p className="text-sm text-slate-400">{scene.summary}</p>
              </div>
            ))}

            {showDetailedFields ? (
              <div className="bg-slate-900/50 rounded-lg p-4 border-2 border-dashed border-slate-700 flex flex-col gap-3">
                <input
                  type="text"
                  value={newSceneTitle}
                  onChange={e => setNewSceneTitle(e.target.value)}
                  placeholder="New Scene Title"
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
                <textarea
                  value={newSceneSummary}
                  onChange={e => setNewSceneSummary(e.target.value)}
                  placeholder="Brief summary..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
                <button
                  onClick={handleAddScene}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-md transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Scene
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Reveal depth to draft new scenes or reorder the story.</p>
            )}
          </div>
        </div>

        <div className="lg:w-80 xl:w-96">
          <EditorRelationSidebar
            artifact={artifact}
            projectArtifacts={projectArtifacts}
            onAddRelation={onAddRelation}
            onRemoveRelation={onRemoveRelation}
            relationOptions={[
              {
                kind: 'APPEARS_IN',
                label: 'Cast & Cameos',
                description: 'Tag characters, factions, or collaborators who appear in this storyline.',
                targetFilter: (candidate) => CAST_TARGET_TYPES.includes(candidate.type),
                placeholder: 'Select a character, faction, or collaborator',
                group: 'Narrative Cast',
              },
              {
                kind: 'USES',
                label: 'Uses / Depends On',
                description: 'Link the locations, conlangs, rulebooks, or tools that power this narrative.',
                targetFilter: (candidate) => STORY_SUPPORT_TYPES.includes(candidate.type),
                placeholder: 'Select supporting lore or systems',
                group: 'Supporting Lore',
              },
              {
                kind: 'DERIVES_FROM',
                label: 'Derives From',
                description: 'Reference source material, earlier chapters, or inspirational artifacts.',
                targetFilter: (candidate) => STORY_SOURCE_TYPES.includes(candidate.type),
                placeholder: 'Select a source artifact',
                group: 'Origins & Inspiration',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default StoryEditor;
