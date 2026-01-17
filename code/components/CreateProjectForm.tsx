
import React, { useState } from 'react';
import { generateProjectFromDescription } from '../services/geminiService';
import { IntelligenceLogo, Spinner } from './Icons';
import type { TemplateArtifactBlueprint } from '../types';

interface CreateProjectFormProps {
  onCreate: (data: { title: string; summary: string; tags?: string[]; artifacts?: TemplateArtifactBlueprint[] }) => Promise<void> | void;
  onClose: () => void;
}

const projectTemplates = [
  {
    id: 'sacred-truth',
    title: 'Sacred Truth',
    summary: 'A modern-day vampire saga.',
  },
  {
    id: 'dustland',
    title: 'Dustland',
    summary: 'A retro-futuristic RPG.',
  },
  {
    id: 'aputi',
    title: 'Aputi',
    summary: 'An epic journey of discovery.',
  },
];

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onCreate, onClose }) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [starterArtifacts, setStarterArtifacts] = useState<TemplateArtifactBlueprint[]>([]);

  const handleTemplateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = event.target.value;
    const template = projectTemplates.find(t => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setSummary(template.summary);
      setSuggestedTags([]);
      setGenerationMessage(null);
      setStarterArtifacts([]);
    } else {
      setTitle('');
      setSummary('');
      setSuggestedTags([]);
      setGenerationMessage(null);
      setStarterArtifacts([]);
    }
  };

  const handleGenerateFromDescription = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationMessage(null);

    try {
      const generated = await generateProjectFromDescription(trimmed);
      setTitle(generated.title);
      setSummary(generated.summary);
      setSuggestedTags(generated.tags);
      setStarterArtifacts(generated.artifacts);
      setGenerationMessage('We used your description to prefill the project details and draft starter artifacts. Review and edit before creating.');
      setError('');
    } catch (err) {
      console.error(err);
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'We could not generate project details. Please try again later.',
      );
      setStarterArtifacts([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSuggestedTags((current) => current.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
  };

  const handleRemoveStarterArtifact = (index: number) => {
    setStarterArtifacts((current) => current.filter((_, idx) => idx !== index));
  };

  const handleClearStarterArtifacts = () => {
    setStarterArtifacts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({ title: title.trim(), summary: summary.trim(), tags: suggestedTags, artifacts: starterArtifacts });
      // We do not call onClose here because the parent component (App.tsx) handles closing the modal
      // upon successful creation. If we close it here prematurely, the user might see the modal close
      // but the creation might still fail or be in progress (if we didn't await).
      // Since we await, if we reach here, it's done.
    } catch (err) {
       // If onCreate fails, we stop the spinner.
       console.error("Failed to create project:", err);
    } finally {
       setIsCreating(false);
    }
  };

    return (
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="project-description" className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <IntelligenceLogo className="w-4 h-4 text-cyan-300" />
              Atlas Intelligence Blueprint
            </label>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              Beta
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Paste a detailed description of the project you have in mind. Atlas Intelligence will translate it into a title,
            summary, and tags you can review.
          </p>
        <textarea
          id="project-description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (generationError) {
              setGenerationError('');
            }
            if (generationMessage) {
              setGenerationMessage(null);
            }
          }}
          rows={4}
          className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition"
          placeholder="Describe your world, themes, tone, or what you want to build."
        />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <IntelligenceLogo className="w-4 h-4 text-cyan-300" />
              This optional assistant may create imperfect results. Make edits before you publish.
            </p>
            <button
              type="button"
              onClick={handleGenerateFromDescription}
              disabled={isGenerating || !description.trim()}
              className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-600/60"
            >
              {isGenerating && <Spinner className="h-4 w-4 text-cyan-200" />}
              {isGenerating ? 'Generating…' : 'Summon Atlas Intelligence'}
            </button>
          </div>
        {generationError && (
          <p className="text-sm text-red-400" aria-live="assertive">
            {generationError}
          </p>
        )}
        {generationMessage && (
          <p className="text-sm text-cyan-300" aria-live="polite">
            {generationMessage}
          </p>
        )}
      </div>

      {starterArtifacts.length > 0 && (
        <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-slate-800/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Draft starter artifacts</p>
              <p className="text-xs text-slate-400">We&apos;ll create these artifacts when the project is created. Remove any that don&apos;t fit your world.</p>
            </div>
            <button
              type="button"
              onClick={handleClearStarterArtifacts}
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-100 transition"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-3">
            {starterArtifacts.map((artifact, index) => (
              <li key={`${artifact.title}-${artifact.type}-${index}`} className="rounded-md border border-emerald-500/20 bg-slate-900/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {artifact.title}
                      <span className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                        {artifact.type}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">{artifact.summary}</p>
                    {artifact.tags && artifact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {artifact.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStarterArtifact(index)}
                    className="text-xs font-semibold text-emerald-200 hover:text-emerald-50 transition"
                    aria-label={`Remove starter artifact ${artifact.title}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="project-template" className="block text-sm font-medium text-slate-300 mb-1">
          Project Template (Optional)
        </label>
        <select
          id="project-template"
          onChange={handleTemplateChange}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
        >
          <option value="">-- Select a template --</option>
          {projectTemplates.map(template => (
            <option key={template.id} value={template.id}>{template.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="project-title" className="block text-sm font-medium text-slate-300 mb-1">
          Project Title
        </label>
        <input
          id="project-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          className={`w-full bg-slate-700 border rounded-md px-3 py-2 text-slate-100 focus:ring-2 transition ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
              : 'border-slate-600 focus:border-cyan-500 focus:ring-cyan-500'
          }`}
          placeholder="e.g., My Next Great Novel"
          required
          aria-invalid={!!error}
          aria-describedby={error ? 'project-title-error' : undefined}
        />
        {error && (
          <p id="project-title-error" className="text-red-400 mt-1 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="project-summary" className="block text-sm font-medium text-slate-300 mb-1">
          Summary (Optional)
        </label>
        <textarea
          id="project-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          placeholder="A brief description of your creative universe."
        />
      </div>

      {suggestedTags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Suggested Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-cyan-200/80 transition-colors hover:text-cyan-50"
                  aria-label={`Remove tag ${tag}`}
                  title={`Remove tag ${tag}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            We&apos;ll add these tags when the project is created. Remove any that don&apos;t fit your world.
          </p>
        </div>
      )}

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
          {isCreating ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default CreateProjectForm;
