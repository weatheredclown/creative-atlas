
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Artifact, ArtifactType, LocationData, LocationFeature, NARRATIVE_ARTIFACT_TYPES } from '../types';
import { PlusIcon, XMarkIcon, MapPinIcon } from './Icons';
import EditorRelationSidebar from './EditorRelationSidebar';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

const LOCATION_APPEARANCE_TYPES: ArtifactType[] = [
  ...NARRATIVE_ARTIFACT_TYPES,
  ArtifactType.Scene,
  ArtifactType.Task,
  ArtifactType.Release,
];
const LOCATION_SYSTEM_TYPES: ArtifactType[] = [ArtifactType.MagicSystem, ArtifactType.Conlang, ArtifactType.Wiki];
const LOCATION_ORIGIN_TYPES: ArtifactType[] = [ArtifactType.Location, ArtifactType.Wiki];

const emptyLocationData = (): LocationData => ({ description: '', features: [] });

const sanitizeLocationData = (rawData: Artifact['data']): LocationData => {
  if (!rawData || typeof rawData !== 'object') {
    return emptyLocationData();
  }

  const source = rawData as Partial<LocationData> & Record<string, unknown>;
  const description = typeof source.description === 'string' ? source.description : '';
  const featuresSource = Array.isArray(source.features) ? source.features : [];

  const features = featuresSource
    .map((feature, index) => {
      if (!feature || typeof feature !== 'object') {
        return null;
      }

      const rawFeature = feature as Partial<LocationFeature> & Record<string, unknown>;
      const id =
        typeof rawFeature.id === 'string' && rawFeature.id.trim().length > 0
          ? rawFeature.id
          : `feature-${index}`;
      const name = typeof rawFeature.name === 'string' ? rawFeature.name : '';
      const detail = typeof rawFeature.description === 'string' ? rawFeature.description : '';

      return {
        id,
        name,
        description: detail,
      } satisfies LocationFeature;
    })
    .filter((feature): feature is LocationFeature => feature !== null);

  return { description, features } satisfies LocationData;
};

interface LocationEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: LocationData) => void;
  projectArtifacts: Artifact[];
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

const LocationEditor: React.FC<LocationEditorProps> = ({
  artifact,
  onUpdateArtifactData,
  projectArtifacts,
  onAddRelation,
  onRemoveRelation,
}) => {
  const locationData = useMemo(() => sanitizeLocationData(artifact.data), [artifact.data]);
  const lastArtifactIdRef = useRef<string>(artifact.id);
  const [description, setDescription] = useState(locationData.description);
  const [features, setFeatures] = useState<LocationFeature[]>(locationData.features);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const { showDetailedFields } = useDepthPreferences();

  useEffect(() => {
    const isSameArtifact = artifact.id === lastArtifactIdRef.current;
    const descriptionMatches = description === locationData.description;
    const featuresMatch = JSON.stringify(features) === JSON.stringify(locationData.features);

    if (isSameArtifact && descriptionMatches && featuresMatch) {
      return;
    }

    lastArtifactIdRef.current = artifact.id;
    setDescription(locationData.description);
    setFeatures(locationData.features);
  }, [artifact.id, description, features, locationData.description, locationData.features]);

  const handleUpdate = (updatedData: Partial<LocationData>) => {
    onUpdateArtifactData(artifact.id, {
      description,
      features,
      ...updatedData,
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    handleUpdate({ description: e.target.value });
  };

  const handleAddFeature = () => {
    if (!newFeatureName.trim()) return;
    const newFeature: LocationFeature = {
      id: `feat-${Date.now()}`,
      name: newFeatureName,
      description: newFeatureDesc,
    };
    const updatedFeatures = [...features, newFeature];
    setFeatures(updatedFeatures);
    handleUpdate({ features: updatedFeatures });
    setNewFeatureName('');
    setNewFeatureDesc('');
  };

  const handleDeleteFeature = (featureId: string) => {
    const updatedFeatures = features.filter(f => f.id !== featureId);
    setFeatures(updatedFeatures);
    handleUpdate({ features: updatedFeatures });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-violet-400 mb-6 flex items-center gap-2">
        <MapPinIcon className="w-6 h-6" />
        Location Details: {artifact.title}
      </h3>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label htmlFor="location-desc" className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="location-desc"
              value={description}
              onChange={handleDescriptionChange}
              rows={10}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
              placeholder="Describe the location, its atmosphere, and significance..."
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Notable Features</h4>
            <div className="space-y-2 mb-4">
              {features.map(feature => (
                <div key={feature.id} className="bg-slate-700/50 p-2 rounded-md relative group">
                  <strong className="text-slate-300 text-sm">{feature.name}</strong>
                  <p className="text-slate-400 text-xs">{feature.description}</p>
                  {showDetailedFields && (
                    <button onClick={() => handleDeleteFeature(feature.id)} className="absolute top-1 right-1 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-xs text-slate-500 bg-slate-900/50 border border-dashed border-slate-700/60 rounded-md px-3 py-2">
                  {showDetailedFields
                    ? 'No features yet. Map districts, landmarks, or sensory details to anchor the space.'
                    : 'No features yet. Reveal depth to start charting landmarks and sensory details.'}
                </p>
              )}
            </div>
            {showDetailedFields ? (
              <div className="space-y-2 p-3 bg-slate-900/50 rounded-md border border-slate-700">
                <input
                  type="text"
                  value={newFeatureName}
                  onChange={e => setNewFeatureName(e.target.value)}
                  placeholder="Feature Name"
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={newFeatureDesc}
                  onChange={e => setNewFeatureDesc(e.target.value)}
                  placeholder="Brief description"
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-violet-500"
                />
                <button onClick={handleAddFeature} className="w-full flex items-center justify-center gap-1 px-3 py-1 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-md transition-colors">
                  <PlusIcon className="w-4 h-4" /> Add Feature
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Reveal depth to add or adjust notable features.</p>
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
                label: 'Appears In',
                description: 'Tie this location to story beats, quests, or releases where it features prominently.',
                targetFilter: (candidate) => LOCATION_APPEARANCE_TYPES.includes(candidate.type),
                placeholder: 'Select a story, quest, or release',
                group: 'Narrative Placement',
              },
              {
                kind: 'USES',
                label: 'Anchored Systems',
                description: 'Connect rulebooks, conlangs, or wikis that define this space.',
                targetFilter: (candidate) => LOCATION_SYSTEM_TYPES.includes(candidate.type),
                placeholder: 'Select supporting lore',
                group: 'Supporting Lore',
              },
              {
                kind: 'DERIVES_FROM',
                label: 'Derives From',
                description: 'Reference blueprint locations, prior seasons, or historical notes that inspired this locale.',
                targetFilter: (candidate) => LOCATION_ORIGIN_TYPES.includes(candidate.type),
                placeholder: 'Select an origin location or lore',
                group: 'Origins & Inspiration',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default LocationEditor;
