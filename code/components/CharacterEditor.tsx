
import React, { useState } from 'react';
import { Artifact, CharacterData, CharacterTrait } from '../types';
import { PlusIcon, XMarkIcon, UserCircleIcon } from './Icons';

interface CharacterEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: CharacterData) => void;
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({ artifact, onUpdateArtifactData }) => {
  const data = (artifact.data as CharacterData) || { bio: '', traits: [] };
  const [bio, setBio] = useState(data.bio);
  const [traits, setTraits] = useState<CharacterTrait[]>(data.traits);
  const [newTraitKey, setNewTraitKey] = useState('');
  const [newTraitValue, setNewTraitValue] = useState('');

  const handleUpdate = (updatedData: Partial<CharacterData>) => {
    onUpdateArtifactData(artifact.id, { ...data, ...updatedData });
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
      <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
        <UserCircleIcon className="w-6 h-6" />
        Character Sheet: {artifact.title}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
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
                <button onClick={() => handleDeleteTrait(trait.id)} className="p-1 text-slate-500 hover:text-red-400">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
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
        </div>
      </div>
    </div>
  );
};

export default CharacterEditor;
