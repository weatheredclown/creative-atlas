import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { type AddRelationHandler, type Artifact, ArtifactType, type ProductData, type Relation } from '../types';
import { expandSummary } from '../services/geminiService';
import { exportArtifactToMarkdown } from '../utils/export';
import { getStatusClasses, formatStatusLabel } from '../utils/status';
import {
  SparklesIcon,
  Spinner,
  LinkIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ChevronDownIcon,
  FolderPlusIcon,
  PencilIcon,
} from './Icons';
import { useDepthPreferences } from '../contexts/DepthPreferencesContext';

interface ArtifactDetailProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  onUpdateArtifact: (artifactId:string, updates: Partial<Artifact>) => void;
  onAddRelation: AddRelationHandler;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
  onDeleteArtifact: (artifactId: string) => Promise<void> | void;
  onDuplicateArtifact: (artifactId: string) => Promise<void> | void;
  onNewArtifact: (sourceArtifactId: string) => void;
  addXp: (amount: number) => void;
  onSelectArtifact?: (artifactId: string) => void;
}

const BASE_STATUS_OPTIONS = ['idea', 'draft', 'in-progress', 'todo', 'alpha', 'beta', 'released', 'done'];

const normalizeTagList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === 'string');
};

const createRelationEntries = (
  value: unknown,
): { relation: Relation; index: number }[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (
        entry &&
        typeof (entry as { toId?: unknown }).toId === 'string' &&
        typeof (entry as { kind?: unknown }).kind === 'string'
      ) {
        return { relation: entry as Relation, index };
      }
      return null;
    })
    .filter((entry): entry is { relation: Relation; index: number } => entry !== null);
};

const ArtifactDetail: React.FC<ArtifactDetailProps> = ({
  artifact,
  projectArtifacts,
  onUpdateArtifact,
  onAddRelation,
  onRemoveRelation,
  onDeleteArtifact,
  onDuplicateArtifact,
  onNewArtifact,
  addXp,
  onSelectArtifact,
}) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationKind, setRelationKind] = useState('RELATES_TO');
  const [editableSummary, setEditableSummary] = useState(artifact.summary);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(artifact.title);
  const [renameError, setRenameError] = useState<string | null>(null);
  const { showDetailedFields } = useDepthPreferences();
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const artifactTags = useMemo(
    () => normalizeTagList(artifact.tags as unknown),
    [artifact.tags],
  );

  const relationEntries = useMemo(
    () => createRelationEntries(artifact.relations as unknown),
    [artifact.relations],
  );

  const projectArtifactsList = useMemo(
    () => (Array.isArray(projectArtifacts) ? projectArtifacts : []),
    [projectArtifacts],
  );

  const handleSelectRelatedArtifact = useCallback(
    (artifactId: string) => {
      if (!onSelectArtifact) {
        return;
      }

      const exists = projectArtifactsList.some((candidate) => candidate.id === artifactId);
      if (!exists) {
        return;
      }

      onSelectArtifact(artifactId);
    },
    [onSelectArtifact, projectArtifactsList],
  );

  useEffect(() => {
    setEditableSummary(artifact.summary);
    setIsEditingSummary(false);
    setTagInput('');
    setIsAddingTag(false);
    setExpandError(null);
    setRelationTargetId('');
    setRelationKind('RELATES_TO');
    setRenameValue(artifact.title);
    setIsRenaming(false);
    setRenameError(null);
  }, [artifact.id, artifact.summary, artifact.title]);

  useEffect(() => {
    if (!showDetailedFields) {
      setShowAddRelation(false);
      setIsEditingSummary(false);
      setShowActions(false);
      setIsAddingTag(false);
      setTagInput('');
      setIsRenaming(false);
      setRenameError(null);
    }
  }, [showDetailedFields]);

  useEffect(() => {
    if (isAddingTag) {
      tagInputRef.current?.focus();
    }
  }, [isAddingTag]);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const statusOptions = Array.from(
    new Set([artifact.status, ...BASE_STATUS_OPTIONS].filter((status): status is string => Boolean(status)))
  );

  const handleExpandSummary = useCallback(async () => {
    setIsExpanding(true);
    setExpandError(null);
    try {
      const newSummary = await expandSummary(artifact);
      onUpdateArtifact(artifact.id, { summary: newSummary });
      setEditableSummary(newSummary);
      addXp(6); // XP Source: Lore Weaver assist (+6)
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsExpanding(false);
    }
  }, [artifact, onUpdateArtifact, addXp]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value;
    if (newStatus && newStatus !== artifact.status) {
      onUpdateArtifact(artifact.id, { status: newStatus });
    }
  };

  const handleAddRelationClick = () => {
    if (relationTargetId) {
      onAddRelation(artifact.id, relationTargetId, relationKind);
      addXp(2); // XP Source: link two artifacts (+2)
      setRelationTargetId('');
      setRelationKind('RELATES_TO');
      setShowAddRelation(false);
    }
  };

  const handleRemoveRelation = (indexToRemove: number) => {
    onRemoveRelation(artifact.id, indexToRemove);
  };

  const handleSaveSummary = () => {
    onUpdateArtifact(artifact.id, { summary: editableSummary });
    setIsEditingSummary(false);
  };

  const handleCancelSummary = () => {
    setEditableSummary(artifact.summary);
    setIsEditingSummary(false);
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    const exists = artifactTags.some((tag) => tag.toLowerCase() === newTag.toLowerCase());
    if (exists) {
      setTagInput('');
      return;
    }
    onUpdateArtifact(artifact.id, { tags: [...artifactTags, newTag] });
    setTagInput('');
    setIsAddingTag(false);
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsAddingTag(false);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateArtifact(artifact.id, {
      tags: artifactTags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleStartAddingTag = () => {
    setIsAddingTag(true);
  };

  const handleCancelAddTag = () => {
    setIsAddingTag(false);
    setTagInput('');
  };

  const handleRenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(event.target.value);
    if (renameError) {
      setRenameError(null);
    }
  };

  const handleRenameSubmit = () => {
    const trimmedValue = renameValue.trim();
    if (trimmedValue.length === 0) {
      setRenameError('Artifact name cannot be empty.');
      return;
    }

    if (trimmedValue === artifact.title) {
      setIsRenaming(false);
      setRenameError(null);
      return;
    }

    onUpdateArtifact(artifact.id, { title: trimmedValue });
    setIsRenaming(false);
    setRenameError(null);
  };

  const handleCancelRename = () => {
    setRenameValue(artifact.title);
    setIsRenaming(false);
    setRenameError(null);
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleRenameSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelRename();
    }
  };

  const availableTargets = projectArtifactsList.filter(
    (candidate) => {
      if (candidate.id === artifact.id) {
        return false;
      }

      const hasCatalogRelation = relationEntries.some(
        (entry) => entry.relation.toId === candidate.id && !entry.relation.variantId,
      );

      return !hasCatalogRelation;
    },
  );
  const relationOptions = [
    'RELATES_TO',
    'CONTAINS',
    'DERIVES_FROM',
    'USES',
    'APPEARS_IN',
    'SET_IN',
    'PUBLISHES_TO',
  ];

  const getVariantLabel = useCallback(
    (variantId?: string): string | null => {
      if (!variantId || artifact.type !== ArtifactType.ProductCatalog) {
        return null;
      }

      const data = artifact.data as ProductData | undefined;
      const variants = Array.isArray(data?.variants) ? data?.variants : [];
      const variant = variants.find((entry) => entry.id === variantId);

      return variant?.name ?? null;
    },
    [artifact],
  );

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
      <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              {isRenaming ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                  <label htmlFor="artifact-title" className="sr-only">
                    Artifact name
                  </label>
                  <input
                    ref={renameInputRef}
                    id="artifact-title"
                    type="text"
                    value={renameValue}
                    onChange={handleRenameChange}
                    onKeyDown={handleRenameKeyDown}
                    className="w-full sm:w-64 bg-slate-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    placeholder="Enter artifact name"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRenameSubmit}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                    >
                      Save Name
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700/70 hover:bg-slate-600/70 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h3 className="text-2xl font-bold text-white">{artifact.title}</h3>
              )}
              <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full ${getStatusClasses(artifact.status)}`}>
                {formatStatusLabel(artifact.status)}
              </span>
            </div>
            {isRenaming && renameError && <p className="text-xs font-semibold text-rose-400">{renameError}</p>}
            <p className="text-sm text-slate-400">Type: <span className="font-semibold text-cyan-400">{artifact.type}</span></p>
          </div>
          {showDetailedFields && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
              >
                Actions <ChevronDownIcon className="w-4 h-4" />
              </button>
              {showActions && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10">
                  <button
                    onClick={() => {
                      exportArtifactToMarkdown(artifact);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" /> Export .md
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(artifact.title);
                      setRenameError(null);
                      setIsRenaming(true);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <PencilIcon className="w-4 h-4" /> Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNewArtifact(artifact.id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <PlusIcon className="w-4 h-4" /> New Artifact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onDuplicateArtifact(artifact.id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <FolderPlusIcon className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Delete artifact "${artifact.title}"? This cannot be undone.`,
                      );
                      if (!confirmed) {
                        return;
                      }
                      void onDeleteArtifact(artifact.id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/20"
                  >
                    <XMarkIcon className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="artifact-status" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Stage
            </label>
            {showDetailedFields ? (
              <select
                id="artifact-status"
                value={artifact.status}
                onChange={handleStatusChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-sm font-semibold text-slate-200">
                {formatStatusLabel(artifact.status)}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="artifact-tags-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tags</label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {artifactTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-700/60 border border-slate-600/60 rounded-full text-slate-200"
                >
                  {tag}
                  {showDetailedFields && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-red-400"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {artifactTags.length === 0 && !isAddingTag && (
                <span className="text-xs text-slate-500">
                  {showDetailedFields
                    ? 'No tags yet. Use the + button to add one and categorize this artifact.'
                    : 'No tags yet. Reveal depth to start organizing with tags.'}
                </span>
              )}
              {showDetailedFields && (
                <>
                  {isAddingTag ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={tagInputRef}
                        id="artifact-tags-input"
                        type="text"
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => {
                          if (!tagInput.trim()) {
                            handleCancelAddTag();
                          }
                        }}
                        placeholder="Add tag and press Enter"
                        className="bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                        aria-label="Add tag"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAddTag}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-700/70 text-slate-300 hover:bg-slate-600/70 transition-colors"
                        aria-label="Cancel adding tag"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartAddingTag}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
                      aria-label="Add a new tag"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
            {showDetailedFields ? (
              <p className="text-xs text-slate-500">
                {isAddingTag ? 'Press Enter to add a tag or Esc to cancel.' : 'Click the + button to add a new tag.'}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Reveal depth to add or edit tags.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="artifact-summary" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Summary</label>
            {showDetailedFields && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (isEditingSummary ? handleCancelSummary() : setIsEditingSummary(true))}
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {isEditingSummary ? 'Cancel' : 'Edit'}
                </button>
              </div>
            )}
          </div>
          {isEditingSummary ? (
            <>
              <textarea
                id="artifact-summary"
                value={editableSummary}
                onChange={(event) => setEditableSummary(event.target.value)}
                rows={6}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSaveSummary}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                >
                  Save Summary
                </button>
                <button
                  onClick={handleCancelSummary}
                  className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-md transition-colors"
                >
                  Reset
                </button>
              </div>
            </>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 bg-slate-900/50 border border-slate-700/50 rounded-md p-4">
              {artifact.summary || <span className="text-slate-500">No summary yet. Use Lore Weaver to spin one up.</span>}
            </div>
          )}
          {showDetailedFields && (
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleExpandSummary}
                disabled={isExpanding || isEditingSummary}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-md transition-colors disabled:bg-slate-600"
              >
                {isExpanding ? <Spinner className="w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                Lore Weaver: Expand Summary
              </button>
              {expandError && <p className="text-red-400 text-xs">{expandError}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="p-6" id="artifact-relations-panel">
        <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-slate-400" /> Relations
        </h4>
        {showDetailedFields ? (
          <>
            <div className="space-y-2">
              {relationEntries.map(({ relation, index }) => {
                const target = projectArtifactsList.find((a) => a.id === relation.toId);
                const isNavigable = Boolean(onSelectArtifact && target);
                const variantLabel = getVariantLabel(relation.variantId);
                return (
                  <div key={`${relation.toId}-${index}`} className="flex items-center gap-2 text-sm bg-slate-700/50 px-3 py-1.5 rounded-md">
                    <span className="text-slate-400">{formatStatusLabel(relation.kind)}</span>
                    {variantLabel ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                        Merch item: {variantLabel}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleSelectRelatedArtifact(relation.toId)}
                      disabled={!isNavigable}
                      className={`font-semibold transition-colors ${
                        isNavigable
                          ? 'text-cyan-300 hover:text-cyan-100 underline underline-offset-2 decoration-cyan-400'
                          : 'text-slate-400 cursor-default'
                      }`}
                    >
                      {target?.title || 'Unknown Artifact'}
                    </button>
                    <button
                      onClick={() => handleRemoveRelation(index)}
                      className="ml-auto p-1 text-slate-400 hover:text-red-400 transition"
                      aria-label={`Remove relation ${relation.kind} to ${target?.title ?? relation.toId}`}
                      title="Remove relation"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {relationEntries.length === 0 && !showAddRelation && (
                <p className="text-sm text-slate-500">No relations yet.</p>
              )}
            </div>

            {showAddRelation ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
                <select
                  value={relationKind}
                  onChange={(event) => setRelationKind(event.target.value)}
                  className="w-full sm:w-40 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                >
                  {relationOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
                <select
                  value={relationTargetId}
                  onChange={(event) => setRelationTargetId(event.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                >
                  <option value="">Select an artifact to link...</option>
                  {availableTargets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddRelationClick}
                  className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                >
                  Link
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRelation(true)}
                className="mt-4 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Add Relation
              </button>
            )}
          </>
        ) : (
          <div className="space-y-3 text-sm text-slate-400">
            {relationEntries.length > 0 ? (
              <ul className="space-y-2">
                {relationEntries.map(({ relation, index }) => {
                  const target = projectArtifactsList.find((a) => a.id === relation.toId);
                  const isNavigable = Boolean(onSelectArtifact && target);
                  const variantLabel = getVariantLabel(relation.variantId);
                  return (
                    <li key={`${relation.toId}-${index}`} className="rounded-md border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectRelatedArtifact(relation.toId)}
                          disabled={!isNavigable}
                          className={`font-semibold transition-colors ${
                            isNavigable
                              ? 'text-cyan-300 hover:text-cyan-100 underline underline-offset-2 decoration-cyan-400'
                              : 'text-slate-400 cursor-default'
                          }`}
                        >
                          {target?.title || 'Unknown Artifact'}
                        </button>
                        <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{formatStatusLabel(relation.kind)}</span>
                        {variantLabel ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                            Merch item: {variantLabel}
                          </span>
                        ) : null}
                        <button
                          onClick={() => handleRemoveRelation(index)}
                          className="ml-auto text-slate-500 hover:text-red-400 transition"
                          aria-label={`Remove relation ${relation.kind} to ${target?.title ?? relation.toId}`}
                          title="Remove relation"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No relations yet. Reveal depth to start weaving connections.</p>
            )}
            <p className="text-xs text-slate-500">Detailed linking tools appear when you reveal depth.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactDetail;
