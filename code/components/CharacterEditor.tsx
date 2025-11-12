
import React, { useEffect, useMemo, useState } from 'react';
import { Artifact, ArtifactType, CharacterData, CharacterTrait, NARRATIVE_ARTIFACT_TYPES } from '../types';
import { PlusIcon, XMarkIcon, UserCircleIcon } from './Icons';
import EditorRelationSidebar from './EditorRelationSidebar';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

const CHARACTER_APPEARS_IN_TYPES: ArtifactType[] = [
  ...NARRATIVE_ARTIFACT_TYPES,
  ArtifactType.Scene,
  ArtifactType.Location,
];
const CHARACTER_LINEAGE_TYPES: ArtifactType[] = [ArtifactType.Character, ArtifactType.Faction];
const CHARACTER_GEAR_TYPES: ArtifactType[] = [
  ArtifactType.MagicSystem,
  ArtifactType.Conlang,
  ArtifactType.Wiki,
];

interface CharacterEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: CharacterData) => void;
  projectArtifacts: Artifact[];
  onAddRelation: (fromId: string, toId: string, kind: string) => void;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({
  artifact,
  onUpdateArtifactData,
  projectArtifacts,
  onAddRelation,
  onRemoveRelation,
}) => {
  const characterData = useMemo<CharacterData>(() => {
    const rawData = (artifact.data as CharacterData) ?? { bio: '', traits: [] };

    return {
      bio: rawData.bio ?? '',
      traits: rawData.traits ?? [],
      progression: rawData.progression,
    };
  }, [artifact]);

  const [bio, setBio] = useState(characterData.bio);
  const [traits, setTraits] = useState<CharacterTrait[]>(characterData.traits);
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');
  const { showDetailedFields } = useDepthPreferences();

  const traitsMatch = (a: CharacterTrait[], b: CharacterTrait[]) => {
    if (a.length !== b.length) return false;
    return a.every((trait, index) => {
      const comparison = b[index];
      return (
        trait.id === comparison?.id &&
        trait.key === comparison?.key &&
        trait.value === comparison?.value
      );
    });
  };

  useEffect(() => {
    if (bio !== characterData.bio) {
      setBio(characterData.bio);
    }

    if (!traitsMatch(traits, characterData.traits)) {
      setTraits(characterData.traits);
    }
  }, [artifact.id, bio, characterData.bio, characterData.traits, traits]);

  const handleUpdate = (updatedData: Partial<CharacterData>) => {
    onUpdateArtifactData(artifact.id, { ...characterData, ...updatedData });
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
    handleUpdate({ bio: e.target.value });
  };

  const handleAddTrait = () => {
    if (!newTraitKey.trim() || !newTraitValue.trim()) return;
    const newTrait: CharacterTrait = {
      id: `trait-${Date.now()}`,
      key: newTraitKey,
      value: newTraitValue,
    };
    const updatedTraits = [...traits, newTrait];
    setTraits(updatedTraits);
    handleUpdate({ traits: updatedTraits });
    setNewTraitKey('');
    setNewTraitValue('');
  };

  const handleDeleteTrait = (traitId: string) => {
    const updatedTraits = traits.filter(t => t.id !== traitId);
    setTraits(updatedTraits);
    handleUpdate({ traits: updatedTraits });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
        <UserCircleIcon className="w-6 h-6" />
        Character Sheet: {artifact.title}
      </h3>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label htmlFor="character-bio" className="block text-sm font-medium text-slate-300 mb-1">
              Biography
            </label>
            <textarea
              id="character-bio"
              value={bio}
              onChange={handleBioChange}
              rows={10}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Describe the character's history, personality, and appearance..."
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Traits</h4>
            <div className="space-y-2 mb-4">
              {traits.map(trait => (
                <div key={trait.id} className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-md">
                  <strong className="text-slate-300 text-sm">{trait.key}:</strong>
                  <span className="text-slate-400 text-sm flex-grow">{trait.value}</span>
                  {showDetailedFields && (
                    <button onClick={() => handleDeleteTrait(trait.id)} className="p-1 text-slate-500 hover:text-red-400">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {traits.length === 0 && (
                <p className="text-xs text-slate-500 bg-slate-900/50 border border-dashed border-slate-700/60 rounded-md px-3 py-2">
                  {showDetailedFields
                    ? 'No signature traits yet. Capture quirks, bonds, or stats to bring them to life.'
                    : 'No signature traits yet. Reveal depth to start tracking quirks and bonds.'}
                </p>
              )}
            </div>
            {showDetailedFields ? (
              <div className="space-y-2 p-3 bg-slate-900/50 rounded-md border border-slate-700">
                <input
                  type="text"
                  value={newTraitKey}
                  onChange={e => setNewTraitKey(e.target.value)}
                  placeholder="Trait (e.g., Age)"
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newTraitValue}
                  onChange={e => setNewTraitValue(e.target.value)}
                  placeholder="Value (e.g., 27)"
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={handleAddTrait} className="w-full flex items-center justify-center gap-1 px-3 py-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors">
                  <PlusIcon className="w-4 h-4" /> Add Trait
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Reveal depth to add or adjust character traits.</p>
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
                kind: 'CHILD_OF',
                label: 'Parents & Guardians',
                description:
                  'Identify the figures this character descends from to ground them in the family tree.',
                targetFilter: (candidate) => candidate.type === ArtifactType.Character,
                placeholder: 'Select a parent or guardian',
                group: 'Family Bonds',
              },
              {
                kind: 'PARENT_OF',
                label: 'Children & Wards',
                description:
                  'Link children, protégés, or wards who look to this character as a parental figure.',
                targetFilter: (candidate) => candidate.type === ArtifactType.Character,
                placeholder: 'Select a child or ward',
                group: 'Family Bonds',
              },
              {
                kind: 'SIBLING_OF',
                label: 'Siblings',
                description:
                  'Note litter-mates, adopted siblings, or sworn family bonds to map lateral ties.',
                targetFilter: (candidate) => candidate.type === ArtifactType.Character,
                placeholder: 'Select a sibling',
                group: 'Family Bonds',
              },
              {
                kind: 'PARTNER_OF',
                label: 'Partners & Spouses',
                description:
                  'Track marriages, partnerships, and significant bonds for relationship insights.',
                targetFilter: (candidate) => candidate.type === ArtifactType.Character,
                placeholder: 'Select a partner',
                group: 'Family Bonds',
              },
              {
                kind: 'APPEARS_IN',
                label: 'Appears In',
                description: 'Connect stories, scenes, or locations where this character shows up.',
                targetFilter: (candidate) => CHARACTER_APPEARS_IN_TYPES.includes(candidate.type),
                placeholder: 'Select a story, scene, or location',
                group: 'Narrative Presence',
              },
              {
                kind: 'DERIVES_FROM',
                label: 'Lineage & Inspiration',
                description: 'Track mentors, alter-egos, or canonical references that shape this character.',
                targetFilter: (candidate) => CHARACTER_LINEAGE_TYPES.includes(candidate.type),
                placeholder: 'Select an influence or lineage',
                group: 'Origins & Influences',
              },
              {
                kind: 'USES',
                label: 'Signature Gear & Systems',
                description: 'Link the magic systems, languages, or tools this character wields.',
                targetFilter: (candidate) => CHARACTER_GEAR_TYPES.includes(candidate.type),
                placeholder: 'Select a tool, system, or lexicon',
                group: 'Origins & Influences',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default CharacterEditor;
