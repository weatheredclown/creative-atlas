
import React, { useState } from 'react';
import { ArtifactType } from '../types';

interface CreateArtifactFormProps {
  onCreate: (data: { title: string; type: ArtifactType; summary: string }) => void;
  onClose: () => void;
}

const CreateArtifactForm: React.FC<CreateArtifactFormProps> = ({ onCreate, onClose }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ArtifactType>(ArtifactType.Story);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    onCreate({ title, type, summary });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          autoFocus
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
          {Object.values(ArtifactType).map((artifactType) => (
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
          className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600/50 hover:bg-slate-600 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
        >
          Create Seed
        </button>
      </div>
    </form>
  );
};

export default CreateArtifactForm;
