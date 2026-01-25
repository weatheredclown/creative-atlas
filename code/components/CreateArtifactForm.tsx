
import React, { useState } from 'react';
import { ArtifactType } from '../types';
import { Spinner } from './Icons';

const HIDDEN_TYPES: ArtifactType[] = [ArtifactType.Repository, ArtifactType.Issue, ArtifactType.Release];
const AVAILABLE_TYPES: ArtifactType[] = (Object.values(ArtifactType) as ArtifactType[]).filter(
  (artifactType) => !HIDDEN_TYPES.includes(artifactType)
);

interface CreateArtifactFormProps {
  onCreate: (data: { title: string; type: ArtifactType; summary: string; sourceArtifactId?: string | null }) => Promise<void> | void;
  onClose: () => void;
  sourceArtifactId?: string | null;
  defaultType?: ArtifactType | null;
}

const CreateArtifactForm: React.FC<CreateArtifactFormProps> = ({
  onCreate,
  onClose,
  sourceArtifactId = null,
  defaultType = null,
}) => {
  const initialType = defaultType ?? (AVAILABLE_TYPES[0] ?? ArtifactType.Story);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ArtifactType>(initialType);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({ title: title.trim(), type, summary: summary.trim(), sourceArtifactId });
      // We rely on the parent to close the modal on success (e.g., via prop update)
      // or if the parent's onCreate handles navigation/closing.
      // However, if the parent expects this form to close itself, we might need to know.
      // Based on CreateProjectForm pattern and ProjectWorkspace logic, the parent updates state to close modal.
      // Wait, in ProjectWorkspace, handleCreateArtifact calls closeCreateArtifactModal() on success.
      // So removing onClose() here is correct for success path.
    } catch (err) {
      console.error('Failed to create artifact:', err);
      // Keep modal open so user can retry
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form id="create-artifact-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="artifact-title" className="block text-sm font-medium text-slate-300 mb-1">
          Title
        </label>
        <input
          id="artifact-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          placeholder="e.g., The Crimson Blade, City of Glass"
          required
        />
        {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}
      </div>

      <div>
        <label htmlFor="artifact-type" className="block text-sm font-medium text-slate-300 mb-1">
          Artifact Type
        </label>
        <select
          id="artifact-type"
          value={type}
          onChange={(e) => setType(e.target.value as ArtifactType)}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
        >
          {AVAILABLE_TYPES.map((artifactType) => (
            <option key={artifactType} value={artifactType}>
              {artifactType}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="artifact-summary" className="block text-sm font-medium text-slate-300 mb-1">
          Summary (Optional)
        </label>
        <textarea
          id="artifact-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          placeholder="A brief description of this artifact."
        />
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600/50 hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isCreating}
          className="px-6 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors flex items-center gap-2 disabled:bg-cyan-600/70 disabled:cursor-not-allowed"
        >
          {isCreating && <Spinner className="h-4 w-4 text-cyan-200" />}
          {isCreating ? 'Creating...' : 'Create Artifact'}
        </button>
      </div>
    </form>
  );
};

export default CreateArtifactForm;
