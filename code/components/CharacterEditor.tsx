import React, { useEffect, useMemo, useState } from 'react';
import { Artifact, ArtifactType, CharacterData, CharacterTrait, NARRATIVE_ARTIFACT_TYPES } from '../types';
import { PlusIcon, SparklesIcon, UserCircleIcon, XMarkIcon } from './Icons';
import EditorRelationSidebar from './EditorRelationSidebar';

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

const DEFAULT_CHARACTER_DATA: CharacterData = {
  bio: '',
  traits: [],
  motivation: '',
  conflict: '',
  secret: '',
  narrativeRole: '',
  arcStage: '',
  voiceNotes: '',
  relationships: '',
};

const NARRATIVE_ROLE_OPTIONS = [
  'Protagonist',
  'Deuteragonist',
  'Antagonist',
  'Mentor',
  'Foil',
  'Wildcard',
  'Narrator',
  'Supporting Cast',
];

const ARC_STAGE_OPTIONS = [
  'Set-Up',
  'Inciting Incident',
  'Rising Complication',
  'Midpoint Reckoning',
  'Climax',
  'Resolution',
  'Epilogue',
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
  const data: CharacterData = useMemo(
    () => ({
      ...DEFAULT_CHARACTER_DATA,
      ...(artifact.data as CharacterData | undefined),
    }),
    [artifact.data],
  );

  const [bio, setBio] = useState(data.bio);
  const [traits, setTraits] = useState<CharacterTrait[]>(data.traits);
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');
  const [motivation, setMotivation] = useState(data.motivation ?? '');
  const [conflict, setConflict] = useState(data.conflict ?? '');
  const [secret, setSecret] = useState(data.secret ?? '');
  const [narrativeRole, setNarrativeRole] = useState(data.narrativeRole ?? '');
  const [arcStage, setArcStage] = useState(data.arcStage ?? '');
  const [voiceNotes, setVoiceNotes] = useState(data.voiceNotes ?? '');
  const [relationships, setRelationships] = useState(data.relationships ?? '');
  const [showAdvanced, setShowAdvanced] = useState(() => {
    return Boolean(
      (data.motivation && data.motivation.trim()) ||
        (data.conflict && data.conflict.trim()) ||
        (data.secret && data.secret.trim()) ||
        (data.narrativeRole && data.narrativeRole.trim()) ||
        (data.arcStage && data.arcStage.trim()) ||
        (data.voiceNotes && data.voiceNotes.trim()) ||
        (data.relationships && data.relationships.trim()),
    );
  });

  useEffect(() => {
    setBio(data.bio ?? '');
    setTraits(Array.isArray(data.traits) ? data.traits : []);
    setMotivation(data.motivation ?? '');
    setConflict(data.conflict ?? '');
    setSecret(data.secret ?? '');
    setNarrativeRole(data.narrativeRole ?? '');
    setArcStage(data.arcStage ?? '');
    setVoiceNotes(data.voiceNotes ?? '');
    setRelationships(data.relationships ?? '');
  }, [artifact.id, data]);

  const handleUpdate = (updatedData: Partial<CharacterData>) => {
    onUpdateArtifactData(artifact.id, { ...data, ...updatedData });
  };

  const handleBioChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(event.target.value);
    handleUpdate({ bio: event.target.value });
  };

  const handleAddTrait = () => {
    if (!newTraitKey.trim() || !newTraitValue.trim()) {
      return;
    }
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
    const updatedTraits = traits.filter((trait) => trait.id !== traitId);
    setTraits(updatedTraits);
    handleUpdate({ traits: updatedTraits });
  };

  const advancedFieldsActive = useMemo(
    () =>
      Boolean(
        motivation.trim() ||
          conflict.trim() ||
          secret.trim() ||
          narrativeRole.trim() ||
          arcStage.trim() ||
          voiceNotes.trim() ||
          relationships.trim(),
      ),
    [motivation, conflict, secret, narrativeRole, arcStage, voiceNotes, relationships],
  );

  const toggleAdvanced = () => {
    setShowAdvanced((previous) => !previous);
  };

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-blue-400">
          <UserCircleIcon className="h-6 w-6" />
          Character Sheet: {artifact.title}
        </h3>
        <div className="flex items-center gap-3">
          {!showAdvanced && advancedFieldsActive && (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Depth notes hidden
            </span>
          )}
          <button
            type="button"
            onClick={toggleAdvanced}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20"
          >
            <SparklesIcon className="h-4 w-4" />
            {showAdvanced ? 'Hide depth' : 'Reveal depth'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label htmlFor="character-bio" className="mb-1 block text-sm font-medium text-slate-300">
                Biography
              </label>
              <textarea
                id="character-bio"
                value={bio}
                onChange={handleBioChange}
                rows={10}
                className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-slate-200 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the character's history, personality, and appearance..."
              />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-300">Traits</h4>
              <div className="mb-4 space-y-2">
                {traits.map((trait) => (
                  <div key={trait.id} className="flex items-center gap-2 rounded-md bg-slate-700/50 p-2">
                    <strong className="text-sm text-slate-300">{trait.key}:</strong>
                    <span className="flex-grow text-sm text-slate-400">{trait.value}</span>
                    <button
                      onClick={() => handleDeleteTrait(trait.id)}
                      className="p-1 text-slate-500 transition hover:text-rose-400"
                      type="button"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {traits.length === 0 && (
                  <p className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
                    No signature traits yet. Capture quirks, bonds, or stats to bring them to life.
                  </p>
                )}
              </div>
              <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900/50 p-3">
                <input
                  type="text"
                  value={newTraitKey}
                  onChange={(event) => setNewTraitKey(event.target.value)}
                  placeholder="Trait (e.g., Age)"
                  className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newTraitValue}
                  onChange={(event) => setNewTraitValue(event.target.value)}
                  placeholder="Value (e.g., 27)"
                  className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTrait}
                  className="flex w-full items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                  type="button"
                >
                  <PlusIcon className="h-4 w-4" /> Add Trait
                </button>
              </div>
            </div>
          </div>

          {!showAdvanced && advancedFieldsActive && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
              Detailed notes are saved for this character. Reveal depth to review or edit them.
            </div>
          )}

          {showAdvanced && (
            <section className="space-y-4 rounded-lg border border-cyan-500/30 bg-slate-900/50 p-5">
              <header className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Deep Cut Layers</p>
                <h4 className="text-lg font-semibold text-slate-100">Narrative depth &amp; canon anchors</h4>
                <p className="text-sm text-slate-400">
                  Capture motivations, secrets, and arc signals to keep this character consistent across stories.
                </p>
              </header>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="character-motivation" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Motivation &amp; desire
                  </label>
                  <textarea
                    id="character-motivation"
                    value={motivation}
                    onChange={(event) => {
                      setMotivation(event.target.value);
                      handleUpdate({ motivation: event.target.value });
                    }}
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    placeholder="What future are they chasing? Who are they trying to protect or defy?"
                  />
                </div>
                <div>
                  <label htmlFor="character-conflict" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Core conflict
                  </label>
                  <textarea
                    id="character-conflict"
                    value={conflict}
                    onChange={(event) => {
                      setConflict(event.target.value);
                      handleUpdate({ conflict: event.target.value });
                    }}
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="What stands in their way? Name the internal or external friction."
                  />
                </div>
                <div>
                  <label htmlFor="character-secret" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Secrets &amp; twists
                  </label>
                  <textarea
                    id="character-secret"
                    value={secret}
                    onChange={(event) => {
                      setSecret(event.target.value);
                      handleUpdate({ secret: event.target.value });
                    }}
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                    placeholder="Hidden loyalties, ticking bombs, or revelations waiting to surface."
                  />
                </div>
                <div>
                  <label htmlFor="character-role" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Narrative role
                  </label>
                  <select
                    id="character-role"
                    value={narrativeRole}
                    onChange={(event) => {
                      setNarrativeRole(event.target.value);
                      handleUpdate({ narrativeRole: event.target.value });
                    }}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="">Choose a role...</option>
                    {NARRATIVE_ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="character-arc-stage" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Arc stage
                  </label>
                  <select
                    id="character-arc-stage"
                    value={arcStage}
                    onChange={(event) => {
                      setArcStage(event.target.value);
                      handleUpdate({ arcStage: event.target.value });
                    }}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <option value="">Select a beat...</option>
                    {ARC_STAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="character-relationships" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Relationships &amp; anchors
                  </label>
                  <textarea
                    id="character-relationships"
                    value={relationships}
                    onChange={(event) => {
                      setRelationships(event.target.value);
                      handleUpdate({ relationships: event.target.value });
                    }}
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Allies, rivals, patrons, or debts that define their orbit."
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="character-voice" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Voice &amp; cadence
                  </label>
                  <textarea
                    id="character-voice"
                    value={voiceNotes}
                    onChange={(event) => {
                      setVoiceNotes(event.target.value);
                      handleUpdate({ voiceNotes: event.target.value });
                    }}
                    rows={2}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Speech quirks, diction notes, or tonal references."
                  />
                </div>
              </div>
            </section>
          )}
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
                description: 'Connect stories, scenes, or locations where this character shows up.',
                targetFilter: (candidate) => CHARACTER_APPEARS_IN_TYPES.includes(candidate.type),
                placeholder: 'Select a story, scene, or location',
              },
              {
                kind: 'DERIVES_FROM',
                label: 'Lineage & Inspiration',
                description: 'Track mentors, alter-egos, or canonical references that shape this character.',
                targetFilter: (candidate) => CHARACTER_LINEAGE_TYPES.includes(candidate.type),
                placeholder: 'Select an influence or lineage',
              },
              {
                kind: 'USES',
                label: 'Signature Gear & Systems',
                description: 'Link the magic systems, languages, or tools this character wields.',
                targetFilter: (candidate) => CHARACTER_GEAR_TYPES.includes(candidate.type),
                placeholder: 'Select a tool, system, or lexicon',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default CharacterEditor;
